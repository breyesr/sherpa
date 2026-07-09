from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
import uuid
import traceback
import httpx

from app.core.database import get_db
from app.models.business import BusinessProfile
from app.models.integration import Integration
from app.api.auth import get_current_user
from app.core.security import encrypt_token, decrypt_token
from app.core.telegram_service import TelegramService
from app.core.config import settings
from app.core.limiter import limiter

router = APIRouter()

@router.get("/debug/info")
async def telegram_debug_info(db: AsyncSession = Depends(get_db)):
    """Fetch debug information about all registered Telegram bots and their current webhooks."""
    result = await db.execute(
        select(Integration).where(Integration.provider == 'telegram')
    )
    all_tg = result.scalars().all()
    
    debug_results = []
    for integration in all_tg:
        try:
            token = decrypt_token(integration.access_token)
            tg_info = await TelegramService.get_webhook_info(token)
        except Exception as e:
            tg_info = {"error": f"Failed to decrypt or call Telegram: {e}"}
            
        debug_results.append({
            "integration_id": integration.id,
            "business_id": integration.business_id,
            "settings": integration.settings,
            "telegram_webhook_info": tg_info
        })
        
    return {
        "settings_base_url": settings.BASE_URL,
        "integrations_count": len(all_tg),
        "integrations": debug_results
    }

@router.post("/webhook/{webhook_id}")
@limiter.limit("60/minute")
async def telegram_webhook(webhook_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    """Receive messages from Telegram via a unique webhook ID."""
    print(f"!!! TELEGRAM WEBHOOK PING RECEIVED for ID: {webhook_id} !!!")
    try:
        payload = await request.json()
        print(f"DEBUG: Incoming Payload: {payload}")
        
        # 1. Find the integration
        result = await db.execute(
            select(Integration).where(Integration.provider == 'telegram')
        )
        all_tg = result.scalars().all()
        integration = next((i for i in all_tg if i.settings.get("webhook_id") == webhook_id), None)
        
        if not integration:
            print(f"ERROR: Webhook ID {webhook_id} not found in database.")
            return {"status": "ignored", "reason": "invalid webhook_id"}

        # 2. Fetch business profile
        result = await db.execute(
            select(BusinessProfile)
            .where(BusinessProfile.id == integration.business_id)
            .options(selectinload(BusinessProfile.agents))
        )
        business = result.scalars().first()
        if not business:
            print(f"ERROR: Business not found for integration {integration.id}")
            return {"status": "ignored", "reason": "business not found"}

        # 3. Extract Message
        message = payload.get("message", {})
        chat_id = message.get("chat", {}).get("id")
        text = message.get("text")
        contact = message.get("contact")
        
        if not chat_id:
            print("DEBUG: Payload has no chat_id. Might be a status update or edited message.")
            return {"status": "ignored"}

        chat_id_str = str(chat_id)
        first_name = message.get("from", {}).get("first_name")
        last_name = message.get("from", {}).get("last_name")
        username = message.get("from", {}).get("username")

        # Intercept contact payload
        if contact:
            phone_number = contact.get("phone_number")
            print(f"DEBUG: Received contact share from {chat_id_str}. Phone: {phone_number}")
            if phone_number:
                from app.services.identity_resolver import IdentityResolver
                norm_phone = IdentityResolver.clean_identifier(phone_number)
                
                # Check if it matches Admin/Sales Rep
                biz_phone = IdentityResolver.clean_identifier(business.contact_phone) if business.contact_phone else None
                bot_token = decrypt_token(integration.access_token)
                
                from app.models.crm import Client
                if biz_phone and norm_phone == biz_phone:
                    # Link this admin to integration settings
                    integration.settings = {
                        **integration.settings,
                        "admin_telegram_id": chat_id_str
                    }
                    db.add(integration)
                    
                    # Check by telegram_id_hash first to prevent duplicate key violations
                    res_tg_cli = await db.execute(
                        select(Client).where(Client.business_id == business.id, Client.telegram_id_hash == Client.hash_id(chat_id_str))
                    )
                    client_obj = res_tg_cli.scalars().first()
                    
                    if not client_obj:
                        # Fallback: check by phone
                        res_biz_cli = await db.execute(
                            select(Client).where(Client.business_id == business.id, Client.phone == biz_phone)
                        )
                        client_obj = res_biz_cli.scalars().first()
                        
                    if not client_obj:
                        client_obj = Client(
                            business_id=business.id,
                            name="Sales Rep (Admin)",
                            phone=biz_phone,
                            role="sales_rep",
                            is_prospect=False,
                            telegram_id=encrypt_token(chat_id_str),
                            telegram_id_hash=Client.hash_id(chat_id_str)
                        )
                        db.add(client_obj)
                    else:
                        client_obj.name = "Sales Rep (Admin)"
                        client_obj.phone = biz_phone
                        client_obj.role = "sales_rep"
                        client_obj.is_prospect = False
                        client_obj.telegram_id = encrypt_token(chat_id_str)
                        client_obj.telegram_id_hash = Client.hash_id(chat_id_str)
                        db.add(client_obj)
                        
                    await db.commit()
                    
                    reply_markup = {"remove_keyboard": True}
                    await TelegramService.send_message(
                        bot_token, chat_id, 
                        "✅ ¡Vinculación como Administrador exitosa! A partir de ahora, tus mensajes serán procesados como Representante de Ventas.",
                        reply_markup=reply_markup
                    )
                    
                    from app.core.limiter import _get_redis_client
                    redis_client = _get_redis_client()
                    await redis_client.delete(f"tg_contact_prompt:{chat_id_str}")
                    await redis_client.aclose()
                    
                    return {"status": "ok"}
                
                # Fetch existing client with this Telegram ID if any
                res_tg_cli = await db.execute(
                    select(Client).where(Client.business_id == business.id, Client.telegram_id_hash == Client.hash_id(chat_id_str))
                )
                existing_tg_client = res_tg_cli.scalars().first()

                # If not Admin, check if it matches a Client/Distributor by phone
                res_cli = await db.execute(
                    select(Client).where(Client.business_id == business.id, Client.phone == norm_phone)
                )
                client_obj = res_cli.scalars().first()
                if client_obj:
                    # If another client already has this Telegram ID hash, release it first
                    if existing_tg_client and existing_tg_client.id != client_obj.id:
                        existing_tg_client.telegram_id = None
                        existing_tg_client.telegram_id_hash = None
                        db.add(existing_tg_client)
                        await db.flush()

                    client_obj.telegram_id = encrypt_token(chat_id_str)
                    client_obj.telegram_id_hash = Client.hash_id(chat_id_str)
                    db.add(client_obj)
                    await db.commit()
                    
                    role_text = "Cliente/Distribuidor" if client_obj.stores else "Prospecto"
                    reply_markup = {"remove_keyboard": True}
                    await TelegramService.send_message(
                        bot_token, chat_id, 
                        f"✅ ¡Cuenta vinculada con éxito! Has sido reconocido como {role_text}.",
                        reply_markup=reply_markup
                    )
                    
                    from app.core.limiter import _get_redis_client
                    redis_client = _get_redis_client()
                    await redis_client.delete(f"tg_contact_prompt:{chat_id_str}")
                    await redis_client.aclose()
                    
                    return {"status": "ok"}
                else:
                    # It's a new Prospect! Use existing tg client if any, otherwise create new
                    if existing_tg_client:
                        client_obj = existing_tg_client
                        client_obj.phone = norm_phone
                        if not client_obj.name or client_obj.name == "Prospecto Telegram":
                            client_obj.name = f"{first_name or ''} {last_name or ''}".strip() or "Prospecto Telegram"
                    else:
                        client_obj = Client(
                            business_id=business.id,
                            name=f"{first_name or ''} {last_name or ''}".strip() or "Prospecto Telegram",
                            phone=norm_phone,
                            role="client",
                            is_prospect=True,
                            telegram_id=encrypt_token(chat_id_str),
                            telegram_id_hash=Client.hash_id(chat_id_str)
                        )
                    db.add(client_obj)
                    await db.commit()
                    
                    reply_markup = {"remove_keyboard": True}
                    await TelegramService.send_message(
                        bot_token, chat_id, 
                        "✅ Gracias por compartir tus datos. Tu cuenta ha sido registrada temporalmente como prospecto.",
                        reply_markup=reply_markup
                    )
                    
                    from app.core.limiter import _get_redis_client
                    redis_client = _get_redis_client()
                    await redis_client.delete(f"tg_contact_prompt:{chat_id_str}")
                    await redis_client.aclose()
                    
                    text = "Hola"
            else:
                return {"status": "ignored"}

        if not text:
            print(f"DEBUG: Received non-text message from {chat_id}. Ignoring.")
            return {"status": "ignored"}

        print(f"DEBUG: Processing message from {chat_id}: '{text[:30]}...'")
        chat_id_str = str(chat_id)
        
        # Check if the message is a start command with token or link command
        clean_text = text.strip()
        if clean_text.startswith("/start"):
            parts = clean_text.split(None, 1)
            start_arg = parts[1].strip() if len(parts) > 1 else ""
            if start_arg.startswith("admin_bind_"):
                from app.core.limiter import _get_redis_client
                import json
                
                redis_client = _get_redis_client()
                key = f"tg_bind:{start_arg}"
                bind_data_bytes = await redis_client.get(key)
                if bind_data_bytes:
                    bind_data = json.loads(bind_data_bytes.decode("utf-8"))
                    token_biz_id = bind_data.get("business_id")
                    
                    if token_biz_id == business.id:
                        # Save admin_telegram_id to integration settings
                        integration.settings = {
                            **integration.settings,
                            "admin_telegram_id": chat_id_str
                        }
                        db.add(integration)
                        
                        # Clean up Redis
                        await redis_client.delete(key)
                        await redis_client.aclose()
                        await db.commit()
                        
                        bot_token = decrypt_token(integration.access_token)
                        await TelegramService.send_message(
                            bot_token, chat_id, 
                            "✅ ¡Vinculación como Administrador exitosa! A partir de ahora, tus mensajes serán procesados como Representante de Ventas."
                        )
                        return {"status": "ok"}
                    else:
                        await redis_client.aclose()
                else:
                    await redis_client.aclose()
                
                bot_token = decrypt_token(integration.access_token)
                await TelegramService.send_message(
                    bot_token, chat_id, 
                    "❌ El enlace de vinculación es inválido o ha expirado. Por favor, genera uno nuevo en el panel de control de Sherpa."
                )
                return {"status": "ok"}
        
        if clean_text.startswith("/link"):
            parts = clean_text.split(None, 1)
            raw_phone = parts[1].strip() if len(parts) > 1 else ""
            from app.services.identity_resolver import IdentityResolver
            norm_phone = IdentityResolver.clean_identifier(raw_phone)
            
            if not norm_phone:
                bot_token = decrypt_token(integration.access_token)
                await TelegramService.send_message(
                    bot_token, chat_id, 
                    "Por favor, indica tu número de teléfono. Ejemplo: /link 5218132477146"
                )
                return {"status": "ok"}
                
            # Find the client with this phone number
            from app.models.crm import Client
            res_cli = await db.execute(
                select(Client).where(Client.business_id == business.id, Client.phone == norm_phone)
            )
            client_to_link = res_cli.scalars().first()
            
            # Also check if it matches business contact_phone
            biz_phone = IdentityResolver.clean_identifier(business.contact_phone) if business.contact_phone else None
            if not client_to_link and biz_phone and norm_phone == biz_phone:
                # Create the sales rep client record dynamically
                client_to_link = Client(
                    business_id=business.id,
                    name="Sales Rep (Admin)",
                    phone=biz_phone,
                    role="sales_rep",
                    is_prospect=False
                )
                db.add(client_to_link)
                await db.flush()
            
            if client_to_link:
                # If another client already has this Telegram ID hash, release it first
                res_tg_cli = await db.execute(
                    select(Client).where(Client.business_id == business.id, Client.telegram_id_hash == Client.hash_id(chat_id_str))
                )
                existing_tg_client = res_tg_cli.scalars().first()
                if existing_tg_client and existing_tg_client.id != client_to_link.id:
                    existing_tg_client.telegram_id = None
                    existing_tg_client.telegram_id_hash = None
                    db.add(existing_tg_client)
                    await db.flush()

                # Link this Telegram chat ID
                client_to_link.telegram_id = chat_id_str
                client_to_link.telegram_id_hash = Client.hash_id(chat_id_str)
                db.add(client_to_link)
                await db.commit()
                
                bot_token = decrypt_token(integration.access_token)
                await TelegramService.send_message(
                    bot_token, chat_id, 
                    f"¡Tu Telegram ha sido vinculado con éxito al número {raw_phone}! Ahora estás registrado como {client_to_link.name} y puedes usar todos los comandos."
                )
                return {"status": "ok"}
            else:
                bot_token = decrypt_token(integration.access_token)
                await TelegramService.send_message(
                    bot_token, chat_id, 
                    f"No pudimos encontrar ningún contacto con el número {raw_phone} en nuestro sistema CRM. Por favor, asegúrate de que el número esté registrado en tu panel de Sherpa."
                )
                return {"status": "ok"}

        # Trigger 'typing' status immediately to improve UX
        try:
            bot_token = decrypt_token(integration.access_token)
            await TelegramService.send_typing(bot_token, chat_id)
        except: pass

        # 4. Resolve identity and check routing configuration
        from app.services.identity_resolver import IdentityResolver
        sender_type, client_obj = await IdentityResolver.resolve_sender(db, business.id, chat_id_str, is_telegram=True)
        
        # Fallback onboarding check for unknown Telegram users
        if sender_type == "prospective_client" and client_obj is None:
            from app.core.limiter import _get_redis_client
            redis_client = _get_redis_client()
            prompt_key = f"tg_contact_prompt:{chat_id_str}"
            already_prompted = await redis_client.get(prompt_key)
            
            if not already_prompted:
                await redis_client.set(prompt_key, "true", ex=3600)  # 1 hour TTL
                await redis_client.aclose()
                
                bot_token = decrypt_token(integration.access_token)
                reply_markup = {
                    "keyboard": [[
                        {
                            "text": "📱 Compartir mi número de teléfono",
                            "request_contact": True
                        }
                    ]],
                    "resize_keyboard": True,
                    "one_time_keyboard": True
                }
                await TelegramService.send_message(
                    bot_token, chat_id,
                    "¡Hola! Bienvenido a Sherpa. Para brindarte un mejor servicio, por favor comparte tu contacto usando el botón de abajo para verificar tu cuenta.",
                    reply_markup=reply_markup
                )
                return {"status": "ok"}
            else:
                await redis_client.aclose()
        
        from app.models.business import VerticalType
        is_trade = business.vertical_type == VerticalType.TRADE

        # Determine feature/flow entitlement
        feature_enabled = True
        flow_enabled = False
        
        from app.api.business import get_default_features_config, get_default_routing_config
        vertical = business.vertical_type.value if hasattr(business.vertical_type, "value") else (business.vertical_type or "BASIC")
        feat_cfg = business.features_config or get_default_features_config(vertical)
        cfg = business.routing_config or get_default_routing_config(vertical)

        if sender_type == "customer":
            feature_enabled = feat_cfg.get("scheduling", {}).get("enabled", True)
            flow_enabled = cfg.get("prospective_clients", {}).get("enabled", True)
        elif sender_type == "prospective_client":
            feature_enabled = is_trade and feat_cfg.get("campaign_flow", {}).get("enabled", False)
            flow_enabled = is_trade and cfg.get("prospective_clients", {}).get("enabled", False)
        elif sender_type == "distributor_retailer":
            feature_enabled = is_trade and feat_cfg.get("b2b_solutions", {}).get("enabled", False)
            flow_enabled = is_trade and cfg.get("distributors_retailers", {}).get("enabled", False)
        elif sender_type == "sales_rep":
            feature_enabled = is_trade and feat_cfg.get("sales_intelligence", {}).get("enabled", False)
            flow_enabled = is_trade and cfg.get("sales_reps", {}).get("enabled", True)

        if not feature_enabled or not flow_enabled:
            response_text = "Este servicio no está habilitado actualmente para este número."
        else:
            if sender_type == "prospective_client":
                from app.services.prospect_qualifier import ProspectQualifier
                qualifier = ProspectQualifier(db)
                try:
                    response_text, is_completed = await qualifier.get_response(
                        business_id=business.id,
                        sender_phone=chat_id_str,
                        user_message=text,
                        platform="telegram"
                    )
                    print(f"DEBUG: Prospect Qualifier Success for {chat_id_str}. Sending response...")
                except Exception as e:
                    print(f"ERROR: ProspectQualifier failed for {chat_id_str}: {e}")
                    traceback.print_exc()
                    response_text = "I'm having a bit of trouble thinking right now. Please try again in a moment."
            else:
                from app.core.ai_service import AIService
                ai = AIService(business, db)
                
                flow_name = "customer" if sender_type == "customer" else ("sales_rep" if sender_type == "sales_rep" else "distributor")
                meta = {
                    "platform": "telegram",
                    "first_name": first_name,
                    "last_name": last_name,
                    "username": username,
                    "flow": flow_name,
                    "client_id": client_obj.id if client_obj else None
                }
                
                try:
                    # get_response now handles registration, normalization and healing
                    response_text = await ai.get_response(chat_id_str, text, meta)
                    print(f"DEBUG: AI Success for {chat_id_str}. Sending response...")
                except Exception as e:
                    print(f"ERROR: AIService failed for {chat_id_str}: {e}")
                    traceback.print_exc()
                    response_text = "I'm having a bit of trouble thinking right now. Please try again in a moment."
        
        # 5. Send Response
        try:
            bot_token = decrypt_token(integration.access_token)
            await TelegramService.send_message(bot_token, chat_id, response_text)
            print(f"DEBUG: Successfully sent reply to {chat_id}")
        except Exception as se:
            print(f"CRITICAL ERROR: Failed to send Telegram message to {chat_id}: {se}")
            traceback.print_exc()

        return {"status": "ok"}
    except Exception as e:
        print(f"CRITICAL: Telegram Webhook Entry Crash: {e}")
        traceback.print_exc()
        return {"status": "error"}

@router.post("/generate-bind-token")
async def generate_bind_token(
    db: AsyncSession = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """Generate a temporary, secure token to bind the admin's Telegram account."""
    result = await db.execute(select(BusinessProfile).where(BusinessProfile.user_id == current_user.id))
    business = result.scalars().first()
    if not business:
        raise HTTPException(status_code=404, detail="Business profile not found. Please complete onboarding.")
    
    # Check if Telegram integration is configured first
    result = await db.execute(
        select(Integration).where(Integration.business_id == business.id, Integration.provider == "telegram")
    )
    integration = result.scalars().first()
    if not integration:
        raise HTTPException(status_code=400, detail="Telegram integration is not configured. Please link the bot first.")

    # Generate a unique token
    try:
        token = f"admin_bind_{uuid.uuid4().hex}"
        
        # Store in Redis
        from app.core.limiter import _get_redis_client
        import json
        
        redis_client = _get_redis_client()
        payload = {
            "business_id": str(business.id),
            "user_id": str(current_user.id)
        }
        
        # 10 minutes TTL
        key = f"tg_bind:{token}"
        try:
            await redis_client.set(key, json.dumps(payload), ex=600)
        finally:
            await redis_client.aclose()
        
        settings_dict = integration.settings if (integration.settings and isinstance(integration.settings, dict)) else {}
        bot_username = settings_dict.get("bot_username")
        deep_link_url = f"https://t.me/{bot_username}?start={token}" if bot_username else ""
        
        return {
            "status": "success",
            "token": token,
            "bot_username": bot_username,
            "deep_link_url": deep_link_url
        }
    except Exception as e:
        print(f"ERROR in generate_bind_token: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")

@router.get("/bind-status")
async def get_bind_status(
    db: AsyncSession = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """Check if the admin's Telegram account is linked to the current user's business."""
    result = await db.execute(select(BusinessProfile).where(BusinessProfile.user_id == current_user.id))
    business = result.scalars().first()
    if not business:
        raise HTTPException(status_code=404, detail="Business profile not found.")
        
    result = await db.execute(
        select(Integration).where(Integration.business_id == business.id, Integration.provider == "telegram")
    )
    integration = result.scalars().first()
    if not integration:
        return {"connected": False, "admin_linked": False}
        
    settings_dict = integration.settings if (integration.settings and isinstance(integration.settings, dict)) else {}
    admin_telegram_id = settings_dict.get("admin_telegram_id")
    return {
        "connected": True,
        "admin_linked": bool(admin_telegram_id),
        "admin_telegram_id": admin_telegram_id,
        "bot_username": settings_dict.get("bot_username")
    }

@router.post("/link")
async def link_telegram(
    data: dict,
    db: AsyncSession = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """Link a Telegram Bot to the current user's business."""
    result = await db.execute(select(BusinessProfile).where(BusinessProfile.user_id == current_user.id))
    business = result.scalars().first()
    if not business:
        raise HTTPException(status_code=404, detail="Business profile not found. Please complete onboarding.")
    
    bot_token = data.get("bot_token")
    if not bot_token:
        raise HTTPException(status_code=400, detail="bot_token is required")

    bot_info = await TelegramService.get_bot_info(bot_token)
    if not bot_info:
        raise HTTPException(status_code=400, detail="Invalid Telegram Bot Token.")

    result = await db.execute(
        select(Integration)
        .where(Integration.business_id == business.id, Integration.provider == 'telegram')
    )
    integration = result.scalars().first()
    
    if not integration:
        integration = Integration(business_id=business.id, provider='telegram', settings={})
        db.add(integration)
    
    webhook_id = integration.settings.get("webhook_id") or str(uuid.uuid4())
    webhook_res = await TelegramService.set_webhook(bot_token, webhook_id)
    
    if not webhook_res.get("ok"):
        raise HTTPException(status_code=400, detail=f"Telegram webhook error: {webhook_res.get('description')}")

    integration.access_token = encrypt_token(bot_token)
    integration.settings = {
        "webhook_id": webhook_id,
        "bot_username": bot_info.get("username"),
        "bot_name": bot_info.get("first_name"),
        "local_testing": webhook_res.get("local_skip", False)
    }
    print(f"DEBUG: Saving integration to DB. settings={integration.settings}")
    
    await db.commit()
    return {"status": "success", "bot_username": bot_info.get("username")}

@router.get("/status")
async def get_telegram_status(
    db: AsyncSession = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """Check if Telegram is connected."""
    result = await db.execute(select(BusinessProfile).where(BusinessProfile.user_id == current_user.id))
    business = result.scalars().first()
    if not business:
        return {"connected": False}

    result = await db.execute(
        select(Integration).where(Integration.business_id == business.id, Integration.provider == 'telegram')
    )
    integration = result.scalars().first()
    if not integration:
        return {"connected": False}
    
    return {
        "connected": True,
        "bot_username": integration.settings.get("bot_username"),
        "bot_name": integration.settings.get("bot_name")
    }

@router.delete("/disconnect")
async def disconnect_telegram(
    db: AsyncSession = Depends(get_db),
    current_user: Any = Depends(get_current_user)
):
    """Remove Telegram integration."""
    result = await db.execute(select(BusinessProfile).where(BusinessProfile.user_id == current_user.id))
    business = result.scalars().first()
    if not business:
        raise HTTPException(status_code=404, detail="Business not found")

    result = await db.execute(
        select(Integration).where(Integration.business_id == business.id, Integration.provider == 'telegram')
    )
    integration = result.scalars().first()
    
    if integration:
        try:
            token = decrypt_token(integration.access_token)
            async with httpx.AsyncClient() as http_client:
                await http_client.get(f"https://api.telegram.org/bot{token}/deleteWebhook")
        except: pass
        await db.delete(integration)
        await db.commit()
    
    return {"status": "success"}
