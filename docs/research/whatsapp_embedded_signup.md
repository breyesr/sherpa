# WhatsApp Embedded Signup (Meta Cloud API) - Technical Research

## 1. Overview
Embedded Signup is Meta's official onboarding flow for "Tech Providers" (SaaS platforms) to connect their customers to the WhatsApp Business API. It replaces the manual process with a React/JS SDK popup.

## 2. Prerequisites for the Startup (Sherpa)
Before writing any code, Sherpa must establish its corporate identity with Meta.

### Hard Blockers (Day 0)
1. **Business Verification:** Sherpa must have a verified Meta Business Account. This requires legal documents (Tax ID, Utility Bills) and takes days/weeks.
2. **App Review (Advanced Access):** The Facebook App must be approved by Meta for:
   - `whatsapp_business_management`
   - `whatsapp_business_messaging`
   - `business_management`
3. **Tech Provider Status:** You must register as a Tech Provider to manage assets on behalf of customers.
4. **HTTPS/Domain:** A live domain with SSL is strictly required to host the Facebook JS SDK and receive Webhooks. `localhost` testing requires tools like `ngrok`.
5. **Privacy Policy:** A public URL is required.

## 3. Technical Implementation Flow

### Frontend (Next.js)
The flow relies on the Facebook JavaScript SDK.

```javascript
// 1. Load SDK & Initialize
window.fbAsyncInit = function() {
  FB.init({
    appId      : 'SHERPA_APP_ID',
    cookie     : true,
    xfbml      : true,
    version    : 'v18.0'
  });
};

// 2. Trigger Login (The Button)
FB.login(function(response) {
  if (response.authResponse) {
    const code = response.authResponse.code;
    // POST /api/whatsapp/exchange-token { code }
  }
}, {
  config_id: 'SHERPA_CONFIG_ID', // Created in Meta Dashboard
  response_type: 'code',
  override_default_response_type: true
});
```

### Backend (FastAPI)
The backend trades the temporary `code` for a System User Access Token.

1. **Exchange Code:** 
   `GET graph.facebook.com/v18.0/oauth/access_token?client_id=X&client_secret=Y&code=Z`
2. **Retrieve Assets:** Use the token to fetch the connected Phone Number ID and WABA (WhatsApp Business Account) ID.
3. **Subscribe to Webhooks:** Programmatically ensure the new WABA is subscribed to Sherpa's global webhook endpoint.

## 4. Requirements for Customers (Non-Tech Users)
Even though the flow is "Embedded," customers still face hurdles:
1. They must have a personal Facebook account (at least 1 day old).
2. They must provide a **clean phone number**. If the number is currently being used on the standard WhatsApp or WhatsApp Business app on their phone, they **must delete the app account first**.
3. They must go through a mini Business Verification to lift the 250 message/day limit.

## 5. Costs
- **Setup:** Free for the API.
- **Messaging (Meta):** First 1,000 service/user-initiated conversations per month are free. After that, rates apply per conversation (e.g., ~$0.01 - $0.08 depending on country and type).
- **Sherpa Cost:** You are responsible for billing your customers for this usage or absorbing the cost in their subscription.

## 6. Known Pitfalls & Risks
- **The "Clean Number" Rule:** This is the #1 point of failure for non-tech users. They often try to use their personal number without deleting their existing WhatsApp account, which causes the flow to fail.
- **Template Rejections:** AI Assistants cannot start conversations with free-form text. Outbound messages (like Reminders) *must* use pre-approved templates. If Meta rejects your reminder template, the feature breaks.
- **Commerce Policy:** If your users are in "restricted" fields (e.g., selling supplements, alcohol, certain medical services), Meta will ban their WhatsApp numbers automatically.
