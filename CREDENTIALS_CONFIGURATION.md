# Credentials Configuration Guide

## Overview

You can configure SMS and Email credentials in two ways:
1. **Shared Credentials** (Recommended for single account) - All pharmacies use the same credentials
2. **Per-Pharmacy Credentials** (Flexible) - Each pharmacy has their own credentials

---

## Option 1: Shared Credentials (Simpler)

Use the same SendGrid and SMS Portal account for all pharmacies. This is simpler and recommended if you manage all pharmacies centrally.

### Database Schema (Simplified)

**Remove credential fields from pharmacies table:**

```sql
CREATE TABLE pharmacies (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),                    -- Pharmacy contact email (for "from" address)
    phone VARCHAR(20),                     -- Pharmacy contact phone
    banking_account VARCHAR(50),           -- Bank account number for EFT
    bank_name VARCHAR(100),                -- Bank name (e.g., "ABSA")
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
    -- NO sendgrid_api_key, smsportal_client_id, smsportal_api_secret fields
);
```

### Environment Variables

Store credentials as environment variables (shared across all pharmacies):

```env
# Shared SendGrid credentials
SENDGRID_API_KEY=your_sendgrid_api_key_here

# Shared SMS Portal credentials
SMSPORTAL_CLIENT_ID=your_client_id
SMSPORTAL_API_SECRET=your_api_secret
```

### Backend Implementation

```python
import os
import sendgrid
from sendgrid.helpers.mail import Mail, Email, To, Content
import requests
import base64

# Shared credentials from environment
SENDGRID_API_KEY = os.environ.get('SENDGRID_API_KEY')
SMSPORTAL_CLIENT_ID = os.environ.get('SMSPORTAL_CLIENT_ID')
SMSPORTAL_API_SECRET = os.environ.get('SMSPORTAL_API_SECRET')

def get_smsportal_token():
    """Get OAuth2 token using shared credentials."""
    url = 'https://rest.smsportal.com/authentication'
    auth_str = f"{SMSPORTAL_CLIENT_ID}:{SMSPORTAL_API_SECRET}"
    b64_auth = base64.b64encode(auth_str.encode()).decode()
    
    headers = {
        'Authorization': f'Basic {b64_auth}',
        'Content-Type': 'application/x-www-form-urlencoded'
    }
    
    payload = {'grant_type': 'client_credentials'}
    response = requests.post(url, data=payload, headers=headers)
    response.raise_for_status()
    token_data = response.json()
    return token_data.get('access_token') or token_data.get('token')


def send_email_via_sendgrid(to_email, subject, html_content, from_email=None, from_name=None):
    """
    Send email using shared SendGrid credentials.
    
    Args:
        to_email: Recipient email
        subject: Email subject
        html_content: HTML email content
        from_email: From email (uses pharmacy email if provided, else default)
        from_name: From name (uses pharmacy name if provided, else default)
    """
    sg = sendgrid.SendGridAPIClient(SENDGRID_API_KEY)
    
    # Use provided from_email or default
    from_addr = Email(
        from_email or 'no-reply@yourdomain.com',
        from_name or 'Debtor Reminder System'
    )
    
    to = To(to_email)
    mail = Mail(from_addr, to, subject, Content('text/html', html_content))
    response = sg.client.mail.send.post(request_body=mail.get())
    return response.status_code


def send_smsportal_sms(phone, message, token=None):
    """Send SMS using shared SMS Portal credentials."""
    if not token:
        token = get_smsportal_token()
    
    url = 'https://rest.smsportal.com/v1/bulkmessages'
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    payload = {
        'messages': [
            {
                'content': message,
                'destination': phone
            }
        ]
    }
    
    response = requests.post(url, json=payload, headers=headers)
    response.raise_for_status()
    return response.json()


@app.route('/api/pharmacies/<pharmacy_id>/debtors/send-email', methods=['POST'])
@require_pharmacy_access(pharmacy_id)
def send_email(pharmacy_id):
    data = request.json
    debtor_ids = data.get('debtor_ids', [])
    ageing_buckets = data.get('ageing_buckets', ['d60', 'd90', 'd120', 'd150', 'd180'])
    
    # Get pharmacy info (for from_email and from_name)
    pharmacy = db.session.query(Pharmacy).filter_by(id=pharmacy_id).first()
    if not pharmacy:
        return jsonify({'error': 'Pharmacy not found'}), 404
    
    # Get email template (custom or default)
    email_template = data.get('email_template', {})
    template_vars = data.get('template_variables', {})
    
    # Merge pharmacy data into template variables
    template_vars.setdefault('pharmacy_name', pharmacy.name)
    template_vars.setdefault('bank_name', pharmacy.bank_name or 'ABSA')
    template_vars.setdefault('account_number', pharmacy.banking_account or '')
    template_vars.setdefault('pharmacy_email', pharmacy.email or '')
    template_vars.setdefault('pharmacy_phone', pharmacy.phone or '')
    
    # Get debtors
    debtors = db.session.query(Debtor).filter(
        Debtor.pharmacy_id == pharmacy_id,
        Debtor.id.in_(debtor_ids),
        Debtor.is_medical_aid_control == False
    ).all()
    
    sent = []
    errors = []
    
    for debtor in debtors:
        if not debtor.email:
            errors.append({'debtor_id': debtor.id, 'error': 'No email address'})
            continue
        
        # Calculate arrears
        arrears_60_plus = sum([
            float(getattr(debtor, bucket)) for bucket in ageing_buckets
        ])
        
        # Prepare variables
        debtor_vars = {
            **template_vars,
            'name': debtor.name,
            'acc_no': debtor.acc_no,
            'amount': f"{arrears_60_plus:,.2f}",
            'arrears_amount': f"{arrears_60_plus:,.2f}",
        }
        
        # Render templates
        if email_template:
            subject = render_template_string(
                email_template.get('subject', 'Reminder: Account Overdue'),
                **debtor_vars
            )
            html_content = render_template_string(
                email_template.get('html_body', ''),
                **debtor_vars
            )
        else:
            # Use default template
            subject = f"Reminder: Account Overdue at {pharmacy.name}"
            html_content = create_default_email_template(debtor, pharmacy, arrears_60_plus)
        
        try:
            # Send email using shared credentials
            # Use pharmacy email as "from" if available
            status = send_email_via_sendgrid(
                debtor.email,
                subject,
                html_content,
                from_email=pharmacy.email,
                from_name=pharmacy.name
            )
            
            # Log communication
            log = CommunicationLog(
                pharmacy_id=pharmacy_id,
                debtor_id=debtor.id,
                communication_type='email',
                recipient=debtor.email,
                subject=subject,
                message=html_content,
                status='sent',
                external_id=str(status),
                sent_at=datetime.utcnow()
            )
            db.session.add(log)
            
            sent.append({
                'debtor_id': debtor.id,
                'email': debtor.email,
                'status': 'sent'
            })
            
        except Exception as e:
            errors.append({'debtor_id': debtor.id, 'error': str(e)})
    
    db.session.commit()
    return jsonify({'sent': sent, 'errors': errors})


@app.route('/api/pharmacies/<pharmacy_id>/debtors/send-sms', methods=['POST'])
@require_pharmacy_access(pharmacy_id)
def send_sms(pharmacy_id):
    data = request.json
    debtor_ids = data.get('debtor_ids', [])
    ageing_buckets = data.get('ageing_buckets', ['d60', 'd90', 'd120', 'd150', 'd180'])
    
    # Get pharmacy info
    pharmacy = db.session.query(Pharmacy).filter_by(id=pharmacy_id).first()
    if not pharmacy:
        return jsonify({'error': 'Pharmacy not found'}), 404
    
    # Get SMS template
    sms_template = data.get('sms_template', None)
    template_vars = data.get('template_variables', {})
    template_vars.setdefault('pharmacy_name', pharmacy.name)
    template_vars.setdefault('bank_name', pharmacy.bank_name or 'ABSA')
    template_vars.setdefault('account_number', pharmacy.banking_account or '')
    
    # Get shared SMS Portal token
    try:
        token = get_smsportal_token()
    except Exception as e:
        return jsonify({'error': f'Failed to get SMSPortal token: {str(e)}'}), 500
    
    # Get debtors
    debtors = db.session.query(Debtor).filter(
        Debtor.pharmacy_id == pharmacy_id,
        Debtor.id.in_(debtor_ids),
        Debtor.is_medical_aid_control == False
    ).all()
    
    sent = []
    errors = []
    
    for debtor in debtors:
        if not debtor.phone:
            errors.append({'debtor_id': debtor.id, 'error': 'No phone number'})
            continue
        
        # Calculate arrears
        arrears_60_plus = sum([
            float(getattr(debtor, bucket)) for bucket in ageing_buckets
        ])
        
        # Prepare variables
        debtor_vars = {
            **template_vars,
            'name': debtor.name,
            'acc_no': debtor.acc_no,
            'amount': f"{arrears_60_plus:,.2f}",
        }
        
        # Render message
        if sms_template:
            message = render_template_string(sms_template, **debtor_vars)
        else:
            message = f"Hi {debtor.name}, your {pharmacy.name} account is overdue (60+ days): R{arrears_60_plus:,.2f}. EFT {pharmacy.bank_name} {pharmacy.banking_account}. Ref {debtor.acc_no}. Thanks!"
        
        # Truncate if too long
        if len(message) > 160:
            message = message[:157] + "..."
        
        try:
            # Send SMS using shared credentials
            resp = send_smsportal_sms(debtor.phone, message, token)
            
            # Log communication
            log = CommunicationLog(
                pharmacy_id=pharmacy_id,
                debtor_id=debtor.id,
                communication_type='sms',
                recipient=debtor.phone,
                message=message,
                status='sent',
                external_id=str(resp.get('id', '')),
                sent_at=datetime.utcnow()
            )
            db.session.add(log)
            
            sent.append({
                'debtor_id': debtor.id,
                'phone': debtor.phone,
                'message': message,
                'status': 'sent'
            })
            
        except Exception as e:
            errors.append({'debtor_id': debtor.id, 'error': str(e)})
    
    db.session.commit()
    return jsonify({'sent': sent, 'errors': errors})
```

---

## Option 2: Per-Pharmacy Credentials (Flexible)

Each pharmacy can have their own SendGrid and SMS Portal credentials. Use this if pharmacies manage their own accounts.

### Database Schema (Full)

```sql
CREATE TABLE pharmacies (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    banking_account VARCHAR(50),
    bank_name VARCHAR(100),
    sendgrid_api_key VARCHAR(255),        -- Pharmacy-specific (encrypted)
    smsportal_client_id VARCHAR(255),      -- Pharmacy-specific (encrypted)
    smsportal_api_secret VARCHAR(255),    -- Pharmacy-specific (encrypted)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);
```

### Backend Implementation

```python
def get_pharmacy_credentials(pharmacy_id):
    """Get pharmacy-specific credentials, fallback to shared if not set."""
    pharmacy = db.session.query(Pharmacy).filter_by(id=pharmacy_id).first()
    
    if not pharmacy:
        return None
    
    # Use pharmacy-specific credentials if available, else use shared
    sendgrid_key = (
        decrypt_api_key(pharmacy.sendgrid_api_key) if pharmacy.sendgrid_api_key
        else os.environ.get('SENDGRID_API_KEY')
    )
    
    sms_client_id = (
        decrypt_api_key(pharmacy.smsportal_client_id) if pharmacy.smsportal_client_id
        else os.environ.get('SMSPORTAL_CLIENT_ID')
    )
    
    sms_secret = (
        decrypt_api_key(pharmacy.smsportal_api_secret) if pharmacy.smsportal_api_secret
        else os.environ.get('SMSPORTAL_API_SECRET')
    )
    
    return {
        'sendgrid_key': sendgrid_key,
        'sms_client_id': sms_client_id,
        'sms_secret': sms_secret
    }
```

---

## Recommendation: Shared Credentials

**Use shared credentials if:**
- ✅ You manage all pharmacies centrally
- ✅ You have a single SendGrid account
- ✅ You have a single SMS Portal account
- ✅ You want simpler setup and maintenance
- ✅ You want to reduce database complexity

**Use per-pharmacy credentials if:**
- ✅ Each pharmacy manages their own accounts
- ✅ Pharmacies have different SendGrid accounts
- ✅ Pharmacies have different SMS Portal accounts
- ✅ You need separate billing per pharmacy
- ✅ You need different sender addresses per pharmacy

---

## Migration Guide

### From Per-Pharmacy to Shared Credentials

1. **Remove credential columns from database:**
```sql
ALTER TABLE pharmacies 
DROP COLUMN sendgrid_api_key,
DROP COLUMN smsportal_client_id,
DROP COLUMN smsportal_api_secret;
```

2. **Set environment variables:**
```env
SENDGRID_API_KEY=your_key
SMSPORTAL_CLIENT_ID=your_id
SMSPORTAL_API_SECRET=your_secret
```

3. **Update backend code** to use shared credentials (see Option 1 above)

### From Shared to Per-Pharmacy Credentials

1. **Add credential columns to database:**
```sql
ALTER TABLE pharmacies 
ADD COLUMN sendgrid_api_key VARCHAR(255),
ADD COLUMN smsportal_client_id VARCHAR(255),
ADD COLUMN smsportal_api_secret VARCHAR(255);
```

2. **Update backend code** to check pharmacy credentials first, fallback to shared

---

## Security Best Practices

### Shared Credentials

1. **Store in environment variables** (never in code)
2. **Use secrets management** (AWS Secrets Manager, Azure Key Vault, etc.)
3. **Rotate credentials regularly**
4. **Restrict access** to environment variables
5. **Monitor usage** across all pharmacies

### Per-Pharmacy Credentials

1. **Encrypt at rest** (use encryption library)
2. **Encrypt in transit** (HTTPS)
3. **Limit access** to credential fields
4. **Audit credential access**
5. **Rotate per pharmacy** as needed

---

## Example: Hybrid Approach

Support both shared and per-pharmacy credentials with fallback:

```python
def get_sendgrid_key(pharmacy_id):
    """Get SendGrid key: pharmacy-specific or shared."""
    pharmacy = db.session.query(Pharmacy).filter_by(id=pharmacy_id).first()
    
    if pharmacy and pharmacy.sendgrid_api_key:
        return decrypt_api_key(pharmacy.sendgrid_api_key)
    
    # Fallback to shared credentials
    return os.environ.get('SENDGRID_API_KEY')


def get_smsportal_credentials(pharmacy_id):
    """Get SMS Portal credentials: pharmacy-specific or shared."""
    pharmacy = db.session.query(Pharmacy).filter_by(id=pharmacy_id).first()
    
    if pharmacy and pharmacy.smsportal_client_id:
        return {
            'client_id': decrypt_api_key(pharmacy.smsportal_client_id),
            'secret': decrypt_api_key(pharmacy.smsportal_api_secret)
        }
    
    # Fallback to shared credentials
    return {
        'client_id': os.environ.get('SMSPORTAL_CLIENT_ID'),
        'secret': os.environ.get('SMSPORTAL_API_SECRET')
    }
```

This allows:
- Most pharmacies use shared credentials (simpler)
- Some pharmacies can have their own credentials (flexible)
- Automatic fallback to shared if pharmacy credentials not set

---

## Summary

**For your use case (shared credentials):**

1. ✅ **Simpler database** - No credential fields needed
2. ✅ **Easier management** - One set of credentials to manage
3. ✅ **Lower cost** - Single account instead of multiple
4. ✅ **Easier setup** - Just set environment variables
5. ✅ **Pharmacy-specific "from" addresses** - Use pharmacy.email and pharmacy.name

**Implementation:**
- Remove credential fields from pharmacies table
- Use environment variables for credentials
- Use pharmacy.email/pharmacy.name for "from" addresses
- All pharmacies share the same SendGrid/SMS Portal account

---

This approach is recommended for most multi-pharmacy setups where you manage all pharmacies centrally.

