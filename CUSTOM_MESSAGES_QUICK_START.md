# Custom Messages - Quick Start Guide

## Overview

Configure email and SMS message templates from your frontend instead of hardcoding them in the backend.

---

## API Request Format

### Send Email with Custom Template

```javascript
POST /api/pharmacies/{pharmacy_id}/debtors/send-email

{
  "debtor_ids": [1, 2, 3],
  "ageing_buckets": ["d60", "d90", "d120"],
  "email_template": {
    "subject": "Payment Reminder - {pharmacy_name}",
    "html_body": "<p>Dear {name},</p><p>Your account {acc_no} is overdue: R{amount}</p>"
  },
  "template_variables": {
    "pharmacy_name": "Reitz Apteek",
    "bank_name": "ABSA",
    "account_number": "409 0014 954"
  }
}
```

### Send SMS with Custom Template

```javascript
POST /api/pharmacies/{pharmacy_id}/debtors/send-sms

{
  "debtor_ids": [1, 2, 3],
  "ageing_buckets": ["d60", "d90", "d120"],
  "sms_template": "Hi {name}, pay R{amount} for account {acc_no}. Bank: {bank_name} {account_number}",
  "template_variables": {
    "pharmacy_name": "Reitz Apteek",
    "bank_name": "ABSA",
    "account_number": "4090014954"
  }
}
```

---

## Frontend Integration

### Simple Example

```javascript
// Send email with custom template
async function sendCustomEmail(debtorIds, ageingBuckets) {
  const response = await fetch(
    `/api/pharmacies/${pharmacyId}/debtors/send-email`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        debtor_ids: debtorIds,
        ageing_buckets: ageingBuckets,
        email_template: {
          subject: "Payment Reminder - {pharmacy_name}",
          html_body: `
            <p>Dear {name},</p>
            <p>Your account {acc_no} has an outstanding balance of R{amount}.</p>
            <p>Please pay to {bank_name} account {account_number}.</p>
            <p>Reference: {acc_no}</p>
            <p>Thank you!</p>
          `
        },
        template_variables: {
          pharmacy_name: "My Pharmacy",
          bank_name: "ABSA",
          account_number: "123456789",
          pharmacy_email: "info@pharmacy.com",
          pharmacy_phone: "012 345 6789"
        }
      })
    }
  );
  
  return await response.json();
}

// Send SMS with custom template
async function sendCustomSMS(debtorIds, ageingBuckets) {
  const response = await fetch(
    `/api/pharmacies/${pharmacyId}/debtors/send-sms`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        debtor_ids: debtorIds,
        ageing_buckets: ageingBuckets,
        sms_template: "Hi {name}, please pay R{amount} for account {acc_no}. Bank: {bank_name} {account_number}",
        template_variables: {
          pharmacy_name: "My Pharmacy",
          bank_name: "ABSA",
          account_number: "123456789"
        }
      })
    }
  );
  
  return await response.json();
}
```

---

## Available Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `{name}` | Customer name | "John Doe" |
| `{acc_no}` | Account number | "123456" |
| `{amount}` | Outstanding amount | "1,234.56" |
| `{arrears_amount}` | Arrears amount | "1,234.56" |
| `{pharmacy_name}` | Pharmacy name | "Reitz Apteek" |
| `{bank_name}` | Bank name | "ABSA" |
| `{account_number}` | Bank account | "409 0014 954" |
| `{pharmacy_email}` | Pharmacy email | "info@pharmacy.com" |
| `{pharmacy_phone}` | Pharmacy phone | "012 345 6789" |

---

## Using Default Templates

If you don't provide custom templates, the backend uses default templates:

```javascript
// Use defaults - don't include email_template or sms_template
{
  "debtor_ids": [1, 2, 3],
  "ageing_buckets": ["d60", "d90"]
}
```

---

## Template Configuration UI

```javascript
// Simple template config component
function MessageConfig({ onSave }) {
  const [emailSubject, setEmailSubject] = useState('Reminder: Account Overdue at {pharmacy_name}');
  const [emailBody, setEmailBody] = useState('<p>Dear {name},</p><p>Your account {acc_no} is overdue...</p>');
  const [smsMessage, setSmsMessage] = useState('Hi {name}, your account {acc_no} is overdue: R{amount}');
  
  return (
    <div>
      <h3>Email Template</h3>
      <input 
        value={emailSubject} 
        onChange={e => setEmailSubject(e.target.value)}
        placeholder="Subject"
      />
      <textarea 
        value={emailBody} 
        onChange={e => setEmailBody(e.target.value)}
        placeholder="HTML Body"
        rows={10}
      />
      
      <h3>SMS Template</h3>
      <textarea 
        value={smsMessage} 
        onChange={e => setSmsMessage(e.target.value)}
        placeholder="SMS Message (max 160 chars)"
        maxLength={160}
      />
      <div>{smsMessage.length}/160</div>
      
      <button onClick={() => onSave({
        email: { subject: emailSubject, html_body: emailBody },
        sms: smsMessage
      })}>
        Save Templates
      </button>
    </div>
  );
}
```

---

## Key Points

1. **Templates are optional** - Backend uses defaults if not provided
2. **Variables use {variable_name} format**
3. **SMS limited to 160 characters**
4. **Email supports HTML**
5. **Template variables can be set per request or stored per pharmacy**

---

For complete implementation details, see `CUSTOM_MESSAGES_IMPLEMENTATION.md`

