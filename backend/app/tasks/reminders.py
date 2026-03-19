from datetime import datetime, timedelta, timezone
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.core.celery_app import celery_app
from app.core.celery_utils import async_task
from app.core.database import SessionLocal
from app.models.crm import Appointment
from app.models.integration import Integration
from app.core.security import decrypt_token
import httpx

@celery_app.task(name="send_upcoming_reminders")
@async_task
async def send_upcoming_reminders():
    """
    Periodic task to send reminders for appointments in the next 24 hours.
    """
    async with SessionLocal() as db:
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        reminder_window = now + timedelta(hours=24)
        
        # 1. Fetch appointments in the window that haven't had a reminder sent
        query = (
            select(Appointment)
            .where(
                Appointment.start_time <= reminder_window,
                Appointment.start_time > now,
                Appointment.reminder_sent == False,
                Appointment.status == "scheduled"
            )
            .options(selectinload(Appointment.client), selectinload(Appointment.business_profile))
        )
        result = await db.execute(query)
        appointments = result.scalars().all()
        
        for apt in appointments:
            await send_single_reminder.delay(apt.id)

@celery_app.task(name="send_single_reminder")
@async_task
async def send_single_reminder(appointment_id: str):
    async with SessionLocal() as db:
        query = (
            select(Appointment)
            .where(Appointment.id == appointment_id)
            .options(
                selectinload(Appointment.client), 
                selectinload(Appointment.business_profile)
            )
        )
        # Note: We need integrations too
        result = await db.execute(query)
        apt = result.scalars().first()
        if not apt or apt.reminder_sent:
            return

        business = apt.business_profile
        client = apt.client
        
        # 2. Get available integrations for this business
        int_query = select(Integration).where(Integration.business_id == business.id)
        int_result = await db.execute(int_query)
        integrations = int_result.scalars().all()
        
        whatsapp = next((i for i in integrations if i.provider == 'whatsapp'), None)
        telegram = next((i for i in integrations if i.provider == 'telegram'), None)
        
        reminder_text = (
            f"Hello {client.name}! This is a reminder from {business.name} about your appointment "
            f"tomorrow at {apt.start_time.strftime('%H:%M')}. See you then!"
        )

        sent = False
        
        # 3. Send via WhatsApp (Priority)
        if whatsapp:
            try:
                access_token = decrypt_token(whatsapp.access_token)
                phone_id = whatsapp.settings.get("phone_number_id")
                if access_token and phone_id:
                    url = f"https://graph.facebook.com/v18.0/{phone_id}/messages"
                    headers = {"Authorization": f"Bearer {access_token}"}
                    body = {
                        "messaging_product": "whatsapp",
                        "to": client.phone,
                        "type": "text",
                        "text": {"body": reminder_text}
                    }
                    async with httpx.AsyncClient() as client_http:
                        res = await client_http.post(url, json=body, headers=headers)
                        if res.status_code < 400:
                            sent = True
                        else:
                            print(f"WhatsApp API Error: {res.text}")
            except Exception as e:
                print(f"WhatsApp reminder failed for apt {apt.id}: {e}")

        # 4. Fallback/Alternative: Telegram
        if not sent and telegram:
            try:
                bot_token = decrypt_token(telegram.access_token)
                # For Telegram, we need the chat_id which we might not have in Client 
                # unless we store it. For MVP, we use the phone as a placeholder or 
                # if we have a linked chat_id in settings (e.g. for testing).
                # REALITY: Telegram reminders only work if the user has messaged the bot.
                # For now, we log it.
                print(f"Telegram reminder would be sent to {client.phone} if chat_id was linked.")
            except Exception as e:
                print(f"Telegram reminder failed for apt {apt.id}: {e}")

        if sent:
            apt.reminder_sent = True
            db.add(apt)
            await db.commit()
            print(f"Reminder sent for appointment {apt.id}")
