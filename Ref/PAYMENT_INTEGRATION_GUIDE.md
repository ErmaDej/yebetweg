# YeBetWeg Payment Integration Guide

## Overview

YeBetWeg supports two Ethiopian payment gateways for premium subscriptions:
- **Chapa** — cards, banks, and mobile money (CBHI, Amole, etc.)
- **TeleBirr** — Ethio Telecom mobile money

Both follow the same architecture:

```
User → Frontend Dialog → Edge Function → Gateway API → Webhook → Subscription Activation
```

---

## Chapa Integration

### Architecture

```
[Frontend] → POST /api.chapa.co/v1/transaction/initialize
          ← { checkout_url, reference }
          → Redirect user to checkout_url
          → User pays on Chapa's hosted page
          → Chapa POSTs webhook to /functions/v1/chapa-webhook
          → Chapa webhook calls activate_subscription RPC
          → User redirected to return_url on success
```

### Files

| File | Role |
|---|---|
| `src/lib/chapa.ts` | Client-side: calls Chapa API directly with secret key to initialize payment |
| `src/hooks/usePayment.ts` | Orchestrates payment: creates subscription record, calls chapa/telebirr libs |
| `src/components/sections/PremiumSection.tsx` | UI: pricing table, "Pay with Chapa" button, payment dialog |
| `supabase/functions/chapa-webhook/index.ts` | Server-side: receives Chapa webhook, verifies signature, activates subscription |

### Step-by-Step Flow

#### 1. User clicks "Pay with Chapa" on Premium Section
- `PremiumSection.tsx` opens a dialog showing payment method
- User confirms → calls `usePayment().initiatePayment("premium", "chapa")`

#### 2. usePayment hook creates a subscription record
- `usePayment.ts` calls `createSubscriptionRecord()` which inserts into `premium_subscriptions` table with `status: "pending"` and `is_active: false`
- Generates a unique `tx_ref` like `YB-1712345678900-ABC123`

#### 3. Frontend initializes Chapa payment
- `initializeChapaPayment()` in `chapa.ts` POSTs to `https://api.chapa.co/v1/transaction/initialize`
- Sends: `amount`, `currency: "ETB"`, `email`, `first_name`, `last_name`, `tx_ref`, `callback_url`, `return_url`
- Headers: `Authorization: Bearer {VITE_CHAPA_SECRET_KEY}`
- Returns: `{ status: "success", data: { checkout_url, reference } }`

#### 4. User is redirected to Chapa checkout
- `usePayment.ts` returns `{ redirectUrl: result.checkoutUrl }`
- `PremiumSection.tsx` sets `window.location.href` to the checkout URL
- User completes payment on Chapa's hosted page

#### 5. Chapa sends webhook to `/functions/v1/chapa-webhook`
- Event: `charge.completed` (or `charge.failed`)
- Payload includes: `tx_ref`, `reference`, `status`, `amount`, `first_name`, `last_name`, `email`
- Webhook URL is: `{VITE_SUPABASE_URL}/functions/v1/chapa-webhook`

#### 6. Webhook verifies and activates
- `chapa-webhook/index.ts`:
  1. Validates HMAC signature via `x-chapa-signature` header (if `CHAPA_WEBHOOK_SECRET` is configured)
  2. Logs event to `payment_webhook_events` table
  3. Calls `supabase.rpc("activate_subscription", { p_reference: txRef, p_gateway: "chapa" })`
  4. RPC activates the subscription (sets `is_active = true`, `status = "active"`)
  5. Returns `200 OK` to acknowledge

#### 7. User lands on return_url (PaymentSuccessPage)
- Page checks URL params for `reference` and shows success/failure
- Calls `queryTeleBirrPayment()` or `verifyChapaPayment()` to confirm status

### Chapa API Endpoints Used

| Endpoint | Method | Purpose |
|---|---|---|
| `https://api.chapa.co/v1/transaction/initialize` | POST | Initialize payment, get checkout URL |
| `https://api.chapa.co/v1/transaction/verify/{tx_ref}` | GET | Verify payment status after redirect |

### Required Environment Variables

| Variable | Where Used | Purpose |
|---|---|---|
| `VITE_CHAPA_PUBLIC_KEY` | Frontend (unused currently) | Public key for client-side operations |
| `VITE_CHAPA_SECRET_KEY` | Frontend `chapa.ts` | Secret key to call Chapa API |
| `CHAPA_SECRET_KEY` | Supabase secret | Used by `chapa-webhook` edge function |
| `CHAPA_WEBHOOK_SECRET` | Supabase secret | HMAC secret for webhook signature verification |

---

## TeleBirr Integration

### Architecture

```
[Frontend] → POST /functions/v1/telebirr-service (Supabase Edge Function)
          ← { qrCode, toPayUrl, reference }
          → Display QR code to user
          → User scans QR with TeleBirr app and pays
          → TeleBirr POSTs notification to /functions/v1/telebirr-webhook
          → telebirr-webhook calls activate_subscription RPC
```

### Key Difference from Chapa
Unlike Chapa (which is called directly from the browser with the secret key), **TeleBirr uses a server-side edge function** (`telebirr-service`) as a proxy. This keeps TeleBirr API credentials off the client.

### Files

| File | Role |
|---|---|
| `src/lib/telebirr.ts` | Client-side: formats phone, calls `telebirr-service` edge function |
| `src/hooks/usePayment.ts` | Orchestrates payment for both gateways |
| `src/components/sections/PremiumSection.tsx` | UI: "Pay with TeleBirr" button, phone input, QR display |
| `supabase/functions/telebirr-service/index.ts` | Server-side: calls TeleBirr payment API with credentials |
| `supabase/functions/telebirr-webhook/index.ts` | Server-side: receives TeleBirr notification, activates subscription |

### Step-by-Step Flow

#### 1. User clicks "Pay with TeleBirr" on Premium Section
- Dialog opens asking for phone number
- Phone validation: `^(\+251|0)?9\d{8}$` (Ethiopian format)
- User clicks "Confirm Payment"

#### 2. usePayment hook formats phone and calls TeleBirr lib
- `formatEthiopianPhoneNumber()` normalizes to `+2519XXXXXXXX`
- `validateEthiopianPhoneNumber()` validates format
- `initializeTeleBirrPayment()` in `telebirr.ts` POSTs to edge function

#### 3. Frontend calls telebirr-service edge function
- URL: `{VITE_SUPABASE_URL}/functions/v1/telebirr-service`
- Payload: `{ amount, phoneNumber, subject, description, reference, notifyUrl, returnUrl }`
- Headers: `apikey: {anon_key}`, `Authorization: Bearer {session_token}`
- **Why Edge Function?** TeleBirr API key must never be exposed to the browser. The edge function acts as a secure proxy.

#### 4. telebirr-service calls TeleBirr API
- Validates environment variables (`VITE_TELEBIRR_API_KEY`, `VITE_TELEBIRR_MERCHANT_APP_ID`, `VITE_TELEBIRR_FABRIC_APP_ID`, `VITE_TELEBIRR_SHORT_CODE`)
- POSTs to `https://api.telebirr.com/v1/payment/create` (or TeleBirr's configured endpoint)
- Returns `{ success, prepayId, reference, toPayUrl, qrCode, codeUrl }`

#### 5. Frontend displays QR code
- `PremiumSection.tsx` shows the QR code and reference number
- Instruction: "Scan with TeleBirr app to complete payment"
- Reference displayed in monospace for manual entry

#### 6. TeleBirr sends notification to `/functions/v1/telebirr-webhook`
- After user pays, TeleBirr POSTs status to `notifyUrl`
- Payload: `{ outTradeNo, reference, status, code, ... }`

#### 7. telebirr-webhook activates subscription
- Logs event to `payment_webhook_events` table
- If status is success: calls `supabase.rpc("activate_subscription", { p_gateway: "telebirr", p_reference })`
- Returns `200 OK`

#### 8. PaymentSuccessPage confirms
- User can manually verify subscription status in dashboard
- Dashboard shows active subscription with expiry date

### TeleBirr API Concepts (from Ethio Telecom Developer Docs)

TeleBirr offers four integration types. YeBetWeg uses **C2B (Customer to Business)** — the most appropriate for a web-based marketplace:

| Type | Description | Use Case |
|---|---|---|
| **C2B** | Customer → Business | Users paying YeBetWeg for subscriptions |
| B2B | Business → Business | Business-to-business transfers |
| H5 | In-App WebView | Mini-program within SuperApp |
| Mini App | Lightweight app | Inside messaging apps |

**C2B Web Checkout Flow (standard):**
1. Apply Fabric Token → get auth token
2. Create Order → get prepay_id + rawRequest
3. Start Pay → redirect user to checkout URL or QR
4. User authenticates (phone + PIN or QR scan)
5. Notify → TeleBirr calls merchant's notify_url
6. Query Order → merchant checks payment status

### Required Environment Variables

| Variable | Where Used | Purpose |
|---|---|---|
| `VITE_TELEBIRR_API_KEY` | Supabase secret + Frontend config | Bearer token for TeleBirr API |
| `VITE_TELEBIRR_MERCHANT_APP_ID` | Supabase secret + Frontend config | Merchant application ID |
| `VITE_TELEBIRR_FABRIC_APP_ID` | Supabase secret + Frontend config | Fabric application ID |
| `VITE_TELEBIRR_SHORT_CODE` | Supabase secret + Frontend config | Merchant short code |

---

## Database Schema

### premium_subscriptions
```sql
-- Tracks each subscription purchase
premium_subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  tier TEXT CHECK (tier IN ('premium', 'pro')),
  payment_method TEXT CHECK (method IN ('chapa', 'telebirr')),
  chapa_reference TEXT,
  telebirr_reference TEXT,
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
)
```

### subscription_payments
```sql
-- Records each payment transaction
subscription_payments (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  subscription_id UUID REFERENCES premium_subscriptions(id),
  amount NUMERIC,
  currency TEXT DEFAULT 'ETB',
  method TEXT,
  reference TEXT,
  status TEXT DEFAULT 'pending',
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
)
```

### payment_webhook_events
```sql
-- Logs all incoming webhooks for debugging
payment_webhook_events (
  id UUID PRIMARY KEY,
  gateway TEXT,
  event_type TEXT,
  reference TEXT,
  payload JSONB,
  status TEXT,
  error_message TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
)
```

### activate_subscription RPC
```sql
-- Called by both webhooks to activate a pending subscription
CREATE OR REPLACE FUNCTION activate_subscription(
  p_reference TEXT,
  p_gateway TEXT
) RETURNS JSONB AS $$
DECLARE
  v_subscription_id UUID;
  v_user_id UUID;
BEGIN
  UPDATE premium_subscriptions
  SET is_active = true,
      status = 'active',
      updated_at = now()
  WHERE (CASE
    WHEN p_gateway = 'chapa' THEN chapa_reference = p_reference
    WHEN p_gateway = 'telebirr' THEN telebirr_reference = p_reference
  END)
  AND is_active = false
  RETURNING id, user_id INTO v_subscription_id, v_user_id;

  IF v_subscription_id IS NULL THEN
    RETURN jsonb_build_object('error', 'No pending subscription found');
  END IF;

  INSERT INTO subscription_payments (user_id, subscription_id, amount, currency, method, reference, status)
  SELECT user_id, id,
    CASE WHEN tier = 'premium' THEN 500 ELSE 1200 END,
    'ETB', p_gateway, p_reference, 'completed'
  FROM premium_subscriptions WHERE id = v_subscription_id;

  RETURN jsonb_build_object(
    'subscription_id', v_subscription_id,
    'user_id', v_user_id,
    'status', 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Subscription Tiers & Pricing

| Tier | Price (ETB/mo) | Key Features |
|---|---|---|
| Free | 0 | Basic listings, limited tips & prices |
| Premium | 500 | Full price data, premium tips, priority |
| Pro | 1,200 | Everything + analytics, consultation, alerts |

Prices are defined in `usePayment.ts`:
```typescript
const TIER_PRICES = { free: 0, premium: 500, pro: 1200 }
```

---

## Testing

### Chapa Test Mode
- Use `CHAPUBK_TEST-*` and `CHASECK_TEST-*` keys
- Test cards: https://developer.chapa.co/test/testing-cards
- Test phones: https://developer.chapa.co/test/testing-mobile

### TeleBirr Test Mode
- Use TeleBirr sandbox credentials from Ethio Telecom developer portal
- Test phone: `+251911234567` (as noted in existing test config)
- No real money moves in sandbox mode

### End-to-End Test Checklist
1. Visit Premium section, verify pricing table renders
2. Click "Pay with Chapa" → dialog opens → click Confirm → redirect to Chapa
3. Click "Pay with TeleBirr" → enter phone → dialog shows QR code
4. After payment (simulated): check dashboard shows active subscription
5. Verify premium content (tips, prices) is unlocked
6. Check `subscription_payments` table for new records
7. Check `payment_webhook_events` table for webhook logs

---

## Security Notes

1. **Chapa secret key** is exposed in the frontend (`VITE_CHAPA_SECRET_KEY`). This is Chapa's standard pattern — their keys are scoped and safe for client-side use. For production, consider moving Chapa initialization server-side too.
2. **TeleBirr credentials are NEVER in the frontend.** The edge function proxy (`telebirr-service`) keeps them server-side.
3. **Webhook endpoints should be kept secret** but the security comes from signature verification, not URL obscurity.
4. **Admin actions edge function** verifies the caller is an admin by checking JWT + `users.role` before executing any operation.
