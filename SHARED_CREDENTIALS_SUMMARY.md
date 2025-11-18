# Shared Credentials - Quick Summary

## Yes, you can use the same SMS and Email portal credentials for all pharmacies!

This is actually the **recommended approach** for most multi-pharmacy setups.

---

## How It Works

### Setup

1. **Store credentials as environment variables** (one set for all pharmacies):
```env
SENDGRID_API_KEY=your_sendgrid_api_key
SMSPORTAL_CLIENT_ID=your_client_id
SMSPORTAL_API_SECRET=your_api_secret
```

2. **Simplified database schema** (no credential fields needed):
```sql
CREATE TABLE pharmacies (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),        -- Used as "from" email address
    phone VARCHAR(20),
    banking_account VARCHAR(50),
    bank_name VARCHAR(100),
    -- NO credential fields needed!
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);
```

3. **Backend uses shared credentials** automatically:
   - All pharmacies use the same SendGrid account
   - All pharmacies use the same SMS Portal account
   - Each pharmacy's `email` and `name` are used as "from" addresses

---

## Benefits

✅ **Simpler setup** - One set of credentials to manage  
✅ **Easier maintenance** - Update credentials in one place  
✅ **Lower cost** - Single account instead of multiple  
✅ **Pharmacy-specific "from" addresses** - Uses pharmacy.email and pharmacy.name  
✅ **No encryption needed** - Credentials stored securely in environment variables  

---

## Example

**Pharmacy 1:**
- Name: "Reitz Apteek"
- Email: "reitz@example.com"
- Sends emails **from**: "reitz@example.com" (Reitz Apteek)

**Pharmacy 2:**
- Name: "City Pharmacy"
- Email: "city@example.com"
- Sends emails **from**: "city@example.com" (City Pharmacy)

**Both use:**
- Same SendGrid API key (from environment)
- Same SMS Portal credentials (from environment)

---

## Implementation

See `CREDENTIALS_CONFIGURATION.md` for complete implementation details.

**Quick Code Example:**
```python
import os

# Shared credentials (loaded once at startup)
SENDGRID_API_KEY = os.environ.get('SENDGRID_API_KEY')
SMSPORTAL_CLIENT_ID = os.environ.get('SMSPORTAL_CLIENT_ID')
SMSPORTAL_API_SECRET = os.environ.get('SMSPORTAL_API_SECRET')

def send_email(pharmacy, debtor, subject, html_content):
    """Send email using shared SendGrid, but pharmacy-specific 'from' address."""
    sg = sendgrid.SendGridAPIClient(SENDGRID_API_KEY)
    
    # Use pharmacy email as "from" address
    from_email = Email(
        pharmacy.email or 'no-reply@yourdomain.com',
        pharmacy.name
    )
    
    to = To(debtor.email)
    mail = Mail(from_email, to, subject, Content('text/html', html_content))
    response = sg.client.mail.send.post(request_body=mail.get())
    return response.status_code
```

---

## When to Use Per-Pharmacy Credentials

Only use per-pharmacy credentials if:
- Each pharmacy manages their own SendGrid/SMS Portal accounts
- You need separate billing per pharmacy
- Pharmacies have different account requirements

For most cases, **shared credentials are simpler and recommended**.

---

**See `CREDENTIALS_CONFIGURATION.md` for complete details and migration guide.**

