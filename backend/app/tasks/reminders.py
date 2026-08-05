import logging
from datetime import datetime, timedelta, timezone
from sqlalchemy.future import select

logger = logging.getLogger(__name__)
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
                from app.services.messaging import MessagingService
                engine = MessagingService.get_engine(whatsapp)
                sent = await engine.send_text(client.phone, reminder_text)
            except Exception as e:
                logger.error("WhatsApp reminder failed for apt %s: %s", apt.id, e)

        # 4. Fallback/Alternative: Telegram
        if not sent and telegram:
            try:
                bot_token = decrypt_token(telegram.access_token)
                # For Telegram, we need the chat_id which we might not have in Client 
                # unless we store it. For MVP, we use the phone as a placeholder or 
                # if we have a linked chat_id in settings (e.g. for testing).
                # REALITY: Telegram reminders only work if the user has messaged the bot.
                # For now, we log it.
                logger.info("Telegram reminder would be sent to %s if chat_id was linked.", client.phone)
            except Exception as e:
                logger.error("Telegram reminder failed for apt %s: %s", apt.id, e)

        if sent:
            apt.reminder_sent = True
            db.add(apt)
            await db.commit()
            logger.info("Reminder sent for appointment %s", apt.id)
