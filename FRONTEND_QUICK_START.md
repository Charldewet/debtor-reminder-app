# Frontend Implementation - Quick Start Guide

## Overview

This guide shows your frontend team how to integrate the debtor reminder communication features (Email & SMS) into your existing web app.

---

## API Endpoints

### Base URL
```
https://debtor-reminder-backend.onrender.com  (production)
http://localhost:5001  (development/local)
```

**Note:** Use the production URL for your deployed frontend application.

### Endpoints

1. **Send Email**: `POST /send_email`
2. **Send SMS**: `POST /send_sms`

---

## Quick Implementation

### 1. Send Email

**Request:**
```javascript
const response = await fetch('https://debtor-reminder-backend.onrender.com/send_email', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    accounts: selectedDebtors,  // Array of debtor objects
    email_template: {  // Optional: Custom template
      subject: "Reminder: Account Overdue at {pharmacy_name}",
      html_body: "<p>Dear {name},</p><p>Your account {acc_no} is overdue: R{amount}</p>"
    },
    template_variables: {  // REQUIRED: Template variables
      pharmacy_name: "Your Pharmacy Name",        // Required
      bank_name: "ABSA",                          // Required
      account_number: "123 456 7890",            // Required
      pharmacy_email: "info@yourpharmacy.com",    // Required
      pharmacy_phone: "012 345 6789"             // Required
    }
  })
});

const result = await response.json();
// result.sent = array of successfully sent emails
// result.errors = array of errors
```

**Response:**
```json
{
  "status": "ok",
  "sent": [
    {
      "acc_no": "123456",
      "email": "customer@example.com",
      "subject": "Reminder: Account Overdue at Reitz Apteek",
      "status": 202
    }
  ],
  "errors": [
    {
      "acc_no": "789012",
      "error": "No email address"
    }
  ]
}
```

---

### 2. Send SMS

**Request:**
```javascript
const response = await fetch('https://debtor-reminder-backend.onrender.com/send_sms', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    accounts: selectedDebtors,  // Array of debtor objects
    sms_template: "Hi {name}, your {pharmacy_name} account {acc_no} is overdue: R{amount}. EFT {bank_name} {account_number}. Thanks!",  // Optional
    template_variables: {  // REQUIRED: Template variables
      pharmacy_name: "Your Pharmacy Name",  // Required
      bank_name: "ABSA",                    // Required
      account_number: "1234567890"          // Required
    }
  })
});

const result = await response.json();
// result.sent = array of successfully sent SMS
// result.errors = array of errors
```

**Response:**
```json
{
  "status": "ok",
  "sent": [
    {
      "acc_no": "123456",
      "phone": "0821234567",
      "message": "Hi John Doe, your Reitz Apteek account...",
      "status": "sent"
    }
  ],
  "errors": []
}
```

---

## Account Object Format

Each account object in the `accounts` array should have:

```javascript
{
  acc_no: "123456",           // Account number (required)
  name: "John Doe",           // Customer name (required)
  email: "john@example.com",  // Email address (required for email)
  phone: "0821234567",        // Phone number (required for SMS)
  d60: 1000.00,               // 60 days overdue amount
  d90: 500.00,                // 90 days overdue amount
  d120: 200.00,               // 120 days overdue amount
  d150: 0.00,                 // 150 days overdue amount
  d180: 0.00                  // 180 days overdue amount
}
```

---

## Template Variables

### Required Variables

**For Email (`/send_email`):**
- `pharmacy_name` - Pharmacy name (used as "from" name)
- `bank_name` - Bank name (e.g., "ABSA", "FNB")
- `account_number` - Bank account number for EFT payments
- `pharmacy_email` - Pharmacy contact email (used as "from" email)
- `pharmacy_phone` - Pharmacy contact phone number

**For SMS (`/send_sms`):**
- `pharmacy_name` - Pharmacy name
- `bank_name` - Bank name
- `account_number` - Bank account number

### Available Variables in Templates

| Variable | Description | Example | Required For |
|----------|-------------|---------|--------------|
| `{name}` | Customer name | "John Doe" | Auto-filled |
| `{acc_no}` | Account number | "123456" | Auto-filled |
| `{amount}` | Outstanding amount (formatted) | "1,234.56" | Auto-filled |
| `{arrears_amount}` | Arrears amount (formatted) | "1,234.56" | Auto-filled |
| `{pharmacy_name}` | Pharmacy name | "Your Pharmacy" | ✅ Required |
| `{bank_name}` | Bank name | "ABSA" | ✅ Required |
| `{account_number}` | Bank account number | "123 456 7890" | ✅ Required |
| `{pharmacy_email}` | Pharmacy contact email | "info@pharmacy.com" | ✅ Email only |
| `{pharmacy_phone}` | Pharmacy contact phone | "012 345 6789" | ✅ Email only |

**Note:** Variables marked as "Auto-filled" are automatically calculated from the account data. Variables marked as "Required" must be provided in `template_variables`.

---

## Complete Example Component

```javascript
// CommunicationService.js
class CommunicationService {
  constructor(apiUrl) {
    // Use production URL by default, or override for development
    this.apiUrl = apiUrl || 'https://debtor-reminder-backend.onrender.com';
  }

  async sendEmail(accounts, emailTemplate = null, templateVars = null) {
    const body = { accounts };
    
    if (emailTemplate) {
      body.email_template = emailTemplate;
    }
    
    if (templateVars) {
      body.template_variables = templateVars;
    }
    
    const response = await fetch(`${this.apiUrl}/send_email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  }

  async sendSMS(accounts, smsTemplate = null, templateVars = null) {
    const body = { accounts };
    
    if (smsTemplate) {
      body.sms_template = smsTemplate;
    }
    
    if (templateVars) {
      body.template_variables = templateVars;
    }
    
    const response = await fetch(`${this.apiUrl}/send_sms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  }
}

export default CommunicationService;
```

---

## Usage in React Component

```javascript
import { useState } from 'react';
import CommunicationService from './CommunicationService';

function DebtorCommunication({ selectedDebtors }) {
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  
  // Use production URL, or set to 'http://localhost:5001' for local development
  const API_URL = process.env.REACT_APP_API_URL || 'https://debtor-reminder-backend.onrender.com';
  const commService = new CommunicationService(API_URL);

  const handleSendEmail = async () => {
    if (selectedDebtors.length === 0) {
      alert('Please select at least one debtor');
      return;
    }

    setSending(true);
    setResult(null);

    try {
      // Optional: Custom template
      const emailTemplate = {
        subject: "Payment Reminder - {pharmacy_name}",
        html_body: `
          <p>Dear {name},</p>
          <p>Your account {acc_no} has an outstanding balance of R{amount}.</p>
          <p>Please pay to {bank_name} account {account_number}.</p>
          <p>Reference: {acc_no}</p>
          <p>Thank you!</p>
        `
      };

      // REQUIRED: Template variables (get from your pharmacy settings/context)
      const templateVars = {
        pharmacy_name: getPharmacyName(),        // Get from your app state/context
        bank_name: getBankName(),                // Get from your app state/context
        account_number: getAccountNumber(),      // Get from your app state/context
        pharmacy_email: getPharmacyEmail(),      // Get from your app state/context
        pharmacy_phone: getPharmacyPhone()       // Get from your app state/context
      };

      const response = await commService.sendEmail(
        selectedDebtors,
        emailTemplate,  // Optional: omit to use default template
        templateVars    // Optional: omit to use defaults
      );

      setResult(response);
      
      if (response.sent.length > 0) {
        alert(`Successfully sent ${response.sent.length} emails`);
      }
      
      if (response.errors.length > 0) {
        alert(`Failed to send ${response.errors.length} emails`);
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setSending(false);
    }
  };

  const handleSendSMS = async () => {
    if (selectedDebtors.length === 0) {
      alert('Please select at least one debtor');
      return;
    }

    setSending(true);
    setResult(null);

    try {
      // Optional: Custom SMS template
      const smsTemplate = "Hi {name}, please pay R{amount} for account {acc_no}. Bank: {bank_name} {account_number}";

      // REQUIRED: Template variables (get from your pharmacy settings/context)
      const templateVars = {
        pharmacy_name: getPharmacyName(),    // Get from your app state/context
        bank_name: getBankName(),            // Get from your app state/context
        account_number: getAccountNumber()   // Get from your app state/context
      };

      const response = await commService.sendSMS(
        selectedDebtors,
        smsTemplate,  // Optional: omit to use default template
        templateVars  // Optional: omit to use defaults
      );

      setResult(response);
      
      if (response.sent.length > 0) {
        alert(`Successfully sent ${response.sent.length} SMS`);
      }
      
      if (response.errors.length > 0) {
        alert(`Failed to send ${response.errors.length} SMS`);
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <h3>Send Communications</h3>
      
      <button 
        onClick={handleSendEmail}
        disabled={sending || selectedDebtors.length === 0}
      >
        {sending ? 'Sending...' : `Send Email (${selectedDebtors.length})`}
      </button>
      
      <button 
        onClick={handleSendSMS}
        disabled={sending || selectedDebtors.length === 0}
      >
        {sending ? 'Sending...' : `Send SMS (${selectedDebtors.length})`}
      </button>

      {result && (
        <div>
          <p>Sent: {result.sent.length}</p>
          {result.errors.length > 0 && (
            <div>
              <p>Errors: {result.errors.length}</p>
              <ul>
                {result.errors.map((err, idx) => (
                  <li key={idx}>
                    Account {err.acc_no}: {err.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default DebtorCommunication;
```

---

## Using Default Templates

If you don't provide custom templates, the backend uses default templates. However, **you still must provide template_variables**:

```javascript
// Use default templates but provide required variables
const templateVars = {
  pharmacy_name: "Your Pharmacy Name",
  bank_name: "ABSA",
  account_number: "123 456 7890",
  pharmacy_email: "info@pharmacy.com",
  pharmacy_phone: "012 345 6789"
};

const response = await commService.sendEmail(selectedDebtors, null, templateVars);
// or for SMS
const smsVars = {
  pharmacy_name: "Your Pharmacy Name",
  bank_name: "ABSA",
  account_number: "1234567890"
};
const response = await commService.sendSMS(selectedDebtors, null, smsVars);
```

---

## Key Points

1. **Template variables are REQUIRED** - You must provide pharmacy details in `template_variables`
2. **Templates are optional** - Backend uses defaults if not provided, but still requires template_variables
3. **Variables use {variable_name} format** - e.g., `{name}`, `{amount}`, `{pharmacy_name}`
4. **SMS limited to 160 characters** - Backend automatically truncates if longer
5. **Email supports HTML** - Use HTML tags in `html_body`
6. **Partial success is normal** - Check both `sent` and `errors` arrays
7. **Always show loading state** - Disable buttons while sending
8. **Display results** - Show success/error counts to user
9. **Credentials are secure** - All SMS/Email credentials are stored server-side only, never expose them to frontend
10. **No hardcoded values** - All pharmacy details must come from your frontend/application

## Security Note

**IMPORTANT:** SMS and Email credentials (SendGrid API key, SMS Portal credentials) are stored securely in the backend environment variables. **DO NOT** share these credentials with the frontend or expose them in client-side code. The frontend only needs to call the API endpoints - the backend handles all credential management securely.

---

## Error Handling

```javascript
try {
  const result = await commService.sendEmail(selectedDebtors);
  
  // Check for partial success
  if (result.sent.length > 0 && result.errors.length > 0) {
    // Some succeeded, some failed
    console.log(`Sent: ${result.sent.length}, Failed: ${result.errors.length}`);
  } else if (result.errors.length > 0) {
    // All failed
    console.error('All emails failed:', result.errors);
  } else {
    // All succeeded
    console.log('All emails sent successfully');
  }
} catch (error) {
  // Network or API error
  console.error('Communication error:', error);
}
```

---

## Testing

```javascript
// Test with sample data
const testDebtors = [
  {
    acc_no: "123456",
    name: "Test User",
    email: "test@example.com",
    phone: "0821234567",
    d60: 1000.00,
    d90: 500.00,
    d120: 0.00,
    d150: 0.00,
    d180: 0.00
  }
];

// Test email
const emailResult = await commService.sendEmail(testDebtors);
console.log('Email result:', emailResult);

// Test SMS
const smsResult = await commService.sendSMS(testDebtors);
console.log('SMS result:', smsResult);
```

---

## Environment Configuration

### For Production
Use the production API URL:
```javascript
const API_URL = 'https://debtor-reminder-backend.onrender.com';
```

### For Development
If running backend locally, use:
```javascript
const API_URL = 'http://localhost:5001';
```

### Using Environment Variables (Recommended)
Create a `.env` file in your frontend project:
```env
REACT_APP_API_URL=https://debtor-reminder-backend.onrender.com
```

Then in your code:
```javascript
const API_URL = process.env.REACT_APP_API_URL || 'https://debtor-reminder-backend.onrender.com';
```

**Note:** For Vite projects, use `VITE_API_URL` instead:
```env
VITE_API_URL=https://debtor-reminder-backend.onrender.com
```

```javascript
const API_URL = import.meta.env.VITE_API_URL || 'https://debtor-reminder-backend.onrender.com';
```

---

## Important: Required Template Variables

**⚠️ All pharmacy details must be provided by the frontend!**

The backend has **no hardcoded values**. You must provide:
- Pharmacy name
- Bank name and account number
- Pharmacy contact email and phone

See `FRONTEND_REQUIRED_VARIABLES.md` for complete details on where to get these values and how to structure your requests.

---

That's it! Your frontend team can now integrate email and SMS sending into your web app.

For more details, see:
- `FRONTEND_REQUIRED_VARIABLES.md` - **Required variables guide** ⭐
- `COMMUNICATION_INTEGRATION_GUIDE.md` - Complete integration guide
- `CUSTOM_MESSAGES_IMPLEMENTATION.md` - Custom template details

