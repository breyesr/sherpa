# Implementation Plan: Cross-Platform Admin Binding & CRM Routing

## Objective
Implement frictionless routing of incoming messages (WhatsApp & Telegram) into the appropriate conversational behavior (Sales Rep, Distributor, Prospect). For Telegram, bypass API constraints by using a QR-code-based Deep Link flow to bind the Admin's Telegram ID to their profile.

## Dependencies & Constraints
*   **Dependencies**: Requires existing Auth & Business Profile infrastructure (Epic 2).
*   **Constraints**:
    *   **Telegram API**: Bots cannot initiate conversations using phone numbers.
    *   **Telegram Privacy**: Phone numbers are hidden from bots by default. They can only be accessed if the user sends a `contact` object via a specialized keyboard button.
    *   **Security**: Deep link tokens for admin binding must be short-lived, single-use, and cryptographically secure to prevent unauthorized binding.

## Phase 1: Deep Link Admin Binding (Telegram)
1.  **Token Generation (Backend)**:
    *   Create endpoint `POST /api/v1/telegram/generate-bind-token`.
    *   Generate a secure UUID (e.g., `admin_bind_12345`).
    *   Store in Redis with a 10-minute TTL, mapping `token -> {business_id, user_id}`.
2.  **QR Code & Deep Link UI (Frontend)**:
    *   Update the Telegram Integration success state in `/settings`.
    *   Generate a deep link URL: `https://t.me/<BotUsername>?start=<token>`.
    *   Implement a QR code generator (e.g., using `qrcode.react`) rendering the deep link for easy mobile scanning.
3.  **Webhook `/start` Handler (Backend)**:
    *   Update `telegram_webhook` to intercept messages matching the regex `/start admin_bind_(.+)`.
    *   Validate the token against Redis.
    *   If valid, link the incoming Telegram `from.id` to the respective `User` record in the database.
    *   Send a localized success message: *"✅ Successfully linked as Admin. Your messages will now be processed as a Sales Rep."*

## Phase 2: Inbound Routing Logic (WhatsApp & Telegram)
1.  **WhatsApp Routing Engine (`whatsapp.py`)**:
    *   On inbound message, extract the sender's phone number.
    *   **Condition 1 (Admin/Sales Rep)**: Does the number match a `User.contact_phone` for this business? Route to Sales Rep graph.
    *   **Condition 2 (Distributor)**: Does the number match a `Contact.phone` linked to a `Client` account? Route to Distributor graph.
    *   **Fallback (Prospect)**: Route to Prospect graph.
2.  **Telegram Routing Engine (`telegram.py`)**:
    *   On inbound message, extract the sender's Telegram ID.
    *   Query the database to resolve the Telegram ID to a phone number (via `User` or `Contact` mapping tables).
    *   Apply the exact same Conditions 1 & 2 as WhatsApp.
    *   **Fallback**: If the ID is unregistered, trigger the Telegram Onboarding Flow.

## Phase 3: Telegram Fallback Onboarding
1.  **Request Contact Keyboard**:
    *   When an unknown Telegram ID messages the bot, reply with: *"Welcome! To help me assist you better, please share your contact details."*
    *   Attach a Telegram `ReplyKeyboardMarkup` containing a `KeyboardButton` with `request_contact=True`.
2.  **Contact Payload Handler**:
    *   Listen for inbound Telegram payloads containing the `message.contact` object.
    *   Extract `contact.phone_number`.
    *   Re-run the database matching logic (Condition 1 & 2).
    *   **If Match**: Save the Telegram ID against the matched record for future instant routing, and route to the correct graph.
    *   **If No Match**: Continue with Prospect flow (requesting Name, Email, Company).
