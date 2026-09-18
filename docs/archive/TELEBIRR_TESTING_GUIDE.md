# TeleBirr Integration Testing Guide

**Last Updated**: May 18, 2026  
**API Type**: Subscription Payment Integration (REST)  
**Status**: ✅ Ready for Testing

---

## Quick Verification Checklist

### ✅ Pre-Test Configuration

Run this in your browser console to verify environment variables are loaded:

```javascript
// In browser console (while your app is running)
console.log("Merchant App ID:", import.meta.env.VITE_TELEBIRR_MERCHANT_APP_ID)
console.log("Fabric App ID:", import.meta.env.VITE_TELEBIRR_FABRIC_APP_ID)
console.log("Short Code:", import.meta.env.VITE_TELEBIRR_SHORT_CODE)
console.log("API Key Present:", !!import.meta.env.VITE_TELEBIRR_API_KEY)

// Expected output:
// Merchant App ID: 1504661904051204
// Fabric App ID: c4182ef8-9249-458a-985e-06d191f4d505
// Short Code: 2159
// API Key Present: true
```

---

## Testing Flow

### Stage 1: Configuration Validation

**What to test:**
- Environment variables are properly loaded
- No configuration warnings in console
- All required fields are present

**How to test:**
```javascript
// Check the browser console for these messages
// Should NOT see: "[TeleBirr Config Warning]"
```

**Expected Result:**
- ✅ No warnings about missing configuration

---

### Stage 2: Payment Initialization

**What to test:**
- Phone number validation
- Payment amount validation
- TeleBirr API connectivity
- Response parsing

**Test Cases:**

#### Test 2.1: Valid Ethiopian Phone Numbers
```javascript
// Valid formats that should work:
"+251911234567"      // ✅ International format
"0911234567"         // ✅ Local format
"+251 911 234 567"   // ✅ With spaces (auto-cleaned)
```

#### Test 2.2: Invalid Phone Numbers
```javascript
// Should reject with error:
"1234567890"         // ❌ Wrong country
"+1911234567"        // ❌ US number
"8123456"            // ❌ Too short
```

#### Test 2.3: Valid Payment Amounts
```javascript
// Valid tier prices (from usePayment.ts):
const TIER_PRICES = {
  premium: 500,   // ✅ ETB 500
  pro: 1200,      // ✅ ETB 1200
}

// Test should accept these amounts
```

#### Test 2.4: TeleBirr API Call
**Monitor in Developer Tools:**

1. Open Network tab
2. Start a payment
3. Look for request to: `https://api.telebirr.com/v1/payment/create`

**Expected Request:**
```
POST /v1/payment/create HTTP/1.1
Host: api.telebirr.com
Content-Type: application/json
Authorization: Bearer 94cc42bee412696d754508c06ca1db20

{
  "appId": "1504661904051204",
  "fabricAppId": "c4182ef8-9249-458a-985e-06d191f4d505",
  "shortCode": "2159",
  "amount": 500,
  "phoneNumber": "+251911234567",
  "reference": "YB-1726667890123-ABC123",
  "subject": "YeBetWeg Premium Subscription",
  "description": "Payment for premium membership (ETB 500)",
  "notifyUrl": "https://yourapp/functions/v1/telebirr-webhook",
  "returnUrl": "https://yourapp/payment/success"
}
```

**Expected Response (Success):**
```json
{
  "code": "0000",
  "msg": "success",
  "data": {
    "prepayId": "1779122163651abc123def456",
    "reference": "YB-1726667890123-ABC123",
    "qrCode": "iVBORw0KGgoAAAANSUhEUgAA...",
    "codeUrl": "https://api.telebirr.com/qr/..."
  }
}
```

**Expected Response (Error):**
```json
{
  "code": "E001",
  "msg": "Invalid phone number format"
}
```

---

### Stage 3: Webhook Reception

**What to test:**
- Webhook endpoint receives payment notifications
- Webhook processes data correctly
- Subscription is activated on success

**How to Simulate:**

Option A: Use TeleBirr Test Console (if available)
- Send test webhook to your webhook URL
- Monitor Supabase logs

Option B: Test locally
```bash
# Test webhook endpoint directly
curl -X POST https://yourapp/functions/v1/telebirr-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "reference": "YB-1726667890123-ABC123",
    "status": "SUCCESS",
    "transactionId": "TXN123456",
    "amount": "500",
    "msisdn": "251911234567"
  }'

# Expected response:
# {"success":true}
```

**Check in Supabase:**

1. Go to Supabase Dashboard
2. Query `payment_webhook_events` table
3. Should have entry:
   ```
   {
     "gateway": "telebirr",
     "external_id": "TXN123456",
     "status": "received",
     "payload": {...}
   }
   ```

4. Check `premium_subscriptions` table
5. Status should be "active" if webhook was successful

---

## Debugging Guide

### Issue: "VITE_TELEBIRR_API_KEY is not configured"

**Cause**: Environment variable not loaded  
**Solution**:
```bash
# Verify .env file has the variable
grep VITE_TELEBIRR_API_KEY .env

# Restart dev server
npm run dev

# Check again in console
```

### Issue: Phone number validation fails

**Cause**: Invalid format  
**Solution**:
```javascript
// Test phone validation directly:
import { validateEthiopianPhoneNumber } from "@/lib/telebirr"

validateEthiopianPhoneNumber("+251911234567")  // Should return true
validateEthiopianPhoneNumber("0911234567")      // Should return true
validateEthiopianPhoneNumber("1234567")         // Should return false
```

### Issue: 401 Unauthorized from TeleBirr

**Cause**: Invalid or expired bearer token  
**Solution**:
```bash
# Regenerate token from TeleBirr Developer Portal
# Update in .env: VITE_TELEBIRR_API_KEY=Bearer <new_token>
# Restart dev server
```

### Issue: Payment shows "pending" forever

**Cause**: Webhook not received or not processed  
**Solution**:
1. Check `payment_webhook_events` table in Supabase
2. If entries exist but status="received", check RPC logs
3. Verify `activate_subscription` RPC exists and has correct logic
4. Check webhook URL is accessible from TeleBirr servers (not localhost)

### Issue: CORS error from TeleBirr API

**Cause**: Browser security policy  
**Note**: This should NOT happen - REST API should support CORS

**Debug**:
```javascript
// Check response in Network tab
// Look for Access-Control-Allow-Origin header
```

---

## Browser Console Commands for Testing

Add these to your browser console while the app is running:

```javascript
// Test phone validation
import { 
  validateEthiopianPhoneNumber, 
  formatEthiopianPhoneNumber,
  initializeTeleBirrPayment 
} from "@/lib/telebirr"

// Validate phones
console.log(validateEthiopianPhoneNumber("+251911234567"))  // true
console.log(validateEthiopianPhoneNumber("0911234567"))      // true
console.log(formatEthiopianPhoneNumber("0911234567"))        // +251911234567

// Test payment initialization manually
const result = await initializeTeleBirrPayment({
  amount: 500,
  phoneNumber: "+251911234567",
  reference: "TEST-" + Date.now(),
  notifyUrl: "https://yourapp/functions/v1/telebirr-webhook",
  returnUrl: "https://yourapp/payment/success",
  subject: "Test Payment",
  description: "Testing TeleBirr integration"
})

console.log(result)
// Should show: { success: true, prepayId: "...", reference: "...", qrCode: "..." }
```

---

## Performance Metrics to Monitor

### Ideal Response Times
- Payment initialization: < 2 seconds
- Webhook processing: < 1 second
- Query payment status: < 2 seconds

### Error Rates (Target)
- Success rate: > 95%
- Webhook delivery: > 99%
- False positives: < 1%

---

## Security Checklist

- [ ] API key is not exposed in client logs
- [ ] Phone numbers are masked in logs (current: masked after 3 chars)
- [ ] Webhook validates request origin (if TeleBirr supports signatures)
- [ ] No sensitive data in error messages shown to users
- [ ] HTTPS used for all API calls
- [ ] Bearer token rotation policy defined

---

## Endpoints Summary

| Endpoint | Purpose | Status |
|----------|---------|--------|
| `POST /v1/payment/create` | Initialize payment | ✅ Implemented |
| `GET /v1/payment/query` | Check payment status | ✅ Implemented |
| `POST /functions/v1/telebirr-webhook` | Receive notifications | ✅ Implemented |

---

## Next Steps After Testing

1. ✅ Verify all payment flow works end-to-end
2. ✅ Check webhook receives updates from TeleBirr
3. ✅ Confirm subscriptions activate correctly
4. ⏳ Set up monitoring and alerting
5. ⏳ Document any API quirks or edge cases
6. ⏳ Set up rate limiting to prevent abuse
7. ⏳ Implement transaction logging for reconciliation

---

## Support Resources

- **TeleBirr Documentation**: https://developer.ethiotelecom.et/docs/GettingStarted
- **Your Implementation**: `src/lib/telebirr.ts`
- **Webhook Handler**: `supabase/functions/telebirr-webhook/index.ts`
- **Payment Hook**: `src/hooks/usePayment.ts`
- **Configuration**: `.env` (VITE_TELEBIRR_* variables)

---

## Credentials Reference

```
API Type: Subscription Payment Integration (REST)
Base URL: https://api.telebirr.com/v1

Merchant AppId:   1504661904051204
Fabric App ID:    c4182ef8-9249-458a-985e-06d191f4d505
ShortCode:        2159
Bearer Token:     94cc42bee412696d754508c06ca1db20
App Secret:       fad0f06383c6297f545876694b974599
```

⚠️ **WARNING**: These credentials are sensitive. Never commit to version control.  
Store in `.env` and `.env.local` only (ignored by git).

---

## Questions?

Refer back to:
- [TELEBIRR_IMPLEMENTATION_ANALYSIS.md](./TELEBIRR_IMPLEMENTATION_ANALYSIS.md) - Complete architectural analysis
- Console debug logs with `[TeleBirr]` prefix
- Network tab in browser developer tools
