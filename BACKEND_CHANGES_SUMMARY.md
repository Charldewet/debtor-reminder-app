# Backend Changes Summary

## What Changed

The backend API (`backend_api/app.py`) has been updated to support:

1. **Custom Email Templates** - Frontend can now configure email subject and HTML body
2. **Custom SMS Templates** - Frontend can now configure SMS message text
3. **Template Variables** - Support for dynamic variables like `{name}`, `{amount}`, `{pharmacy_name}`, etc.
4. **Shared Credentials** - Uses environment variables for SendGrid and SMS Portal (no per-pharmacy credentials needed)

---

## Environment Variables Required

Make sure these are set in your `.env` file or environment:

```env
SENDGRID_API_KEY=your_sendgrid_api_key_here
SMSPORTAL_CLIENT_ID=your_client_id_here
SMSPORTAL_API_SECRET=your_api_secret_here
```

---

## Updated Endpoints

### 1. Send Email (`POST /send_email`)

**New Features:**
- Accepts optional `email_template` with `subject` and `html_body`
- Accepts optional `template_variables` for customization
- Uses pharmacy email/name as "from" address if provided

**Request Example:**
```json
{
  "accounts": [...],
  "email_template": {
    "subject": "Payment Reminder - {pharmacy_name}",
    "html_body": "<p>Dear {name}, your account {acc_no} is overdue: R{amount}</p>"
  },
  "template_variables": {
    "pharmacy_name": "Reitz Apteek",
    "bank_name": "ABSA",
    "account_number": "409 0014 954"
  }
}
```

### 2. Send SMS (`POST /send_sms`)

**New Features:**
- Accepts optional `sms_template` for custom message
- Accepts optional `template_variables` for customization
- Automatically truncates messages longer than 160 characters

**Request Example:**
```json
{
  "accounts": [...],
  "sms_template": "Hi {name}, pay R{amount} for account {acc_no}",
  "template_variables": {
    "pharmacy_name": "Reitz Apteek",
    "bank_name": "ABSA",
    "account_number": "4090014954"
  }
}
```

---

## Backward Compatibility

✅ **Fully backward compatible** - If templates are not provided, backend uses default templates
✅ **Existing frontend code will continue to work** - Just send `accounts` array as before
✅ **Gradual migration** - Frontend can add templates when ready

---

## New Functions Added

1. **`render_template_string()`** - Renders templates with variable substitution
2. **Updated `send_email_via_sendgrid()`** - Now accepts `from_email` and `from_name` parameters

---

## Testing

Test the updated endpoints:

```bash
# Test email with default template
curl -X POST http://localhost:5001/send_email \
  -H "Content-Type: application/json" \
  -d '{"accounts": [{"acc_no": "123456", "name": "Test", "email": "test@example.com", "d60": 1000}]}'

# Test email with custom template
curl -X POST http://localhost:5001/send_email \
  -H "Content-Type: application/json" \
  -d '{
    "accounts": [{"acc_no": "123456", "name": "Test", "email": "test@example.com", "d60": 1000}],
    "email_template": {
      "subject": "Test - {name}",
      "html_body": "<p>Hi {name}, amount: {amount}</p>"
    }
  }'
```

---

## Next Steps

1. ✅ Backend is ready - No further changes needed
2. 📝 Frontend can now use custom templates (see `FRONTEND_QUICK_START.md`)
3. 🔧 Set environment variables for SendGrid and SMS Portal credentials

---

All changes are complete and ready to use!

