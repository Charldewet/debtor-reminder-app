# SMS & Email Communication Integration Guide

## Overview

This guide explains how the SMS and email communication functions work and how to integrate them into your frontend application.

---

## How It Works

### Architecture

```
Frontend → API Endpoint → Communication Service → External API → Recipient
```

### Flow

1. **Frontend** sends selected debtor accounts to backend API
2. **Backend** processes each account:
   - Calculates outstanding amount
   - Generates personalized message
   - Sends via external service (SendGrid/SMS Portal)
   - Logs results
3. **Backend** returns success/error status for each account
4. **Frontend** displays results to user

---

## Backend Implementation

### Email Service (SendGrid)

**Service:** SendGrid API  
**Authentication:** API Key  
**Format:** HTML emails

#### Configuration

```python
# Environment variables required
SENDGRID_API_KEY=your_sendgrid_api_key_here
```

#### Implementation

```python
import sendgrid
from sendgrid.helpers.mail import Mail, Email, To, Content
import os

def send_email_via_sendgrid(to_email, subject, html_content):
    """
    Send email via SendGrid API.
    
    Args:
        to_email: Recipient email address
        subject: Email subject
        html_content: HTML email content
        
    Returns:
        HTTP status code (202 = success)
    """
    api_key = os.environ.get('SENDGRID_API_KEY')
    sg = sendgrid.SendGridAPIClient(api_key)
    
    # Configure email
    from_email = Email('no-reply@em8172.pharmasight.co.za', 'Reitz Apteek')
    to = To(to_email)
    mail = Mail(from_email, to, subject, Content('text/html', html_content))
    
    # Send email
    response = sg.client.mail.send.post(request_body=mail.get())
    return response.status_code
```

---

### SMS Service (SMS Portal)

**Service:** SMS Portal API  
**Authentication:** OAuth2 Client Credentials  
**Format:** Plain text SMS

#### Configuration

```python
# Environment variables required
SMSPORTAL_CLIENT_ID=your_client_id
SMSPORTAL_API_SECRET=your_api_secret
```

#### Implementation

```python
import requests
import base64
import os

def get_smsportal_token():
    """
    Get OAuth2 access token from SMS Portal.
    
    Returns:
        Access token string
    """
    url = 'https://rest.smsportal.com/authentication'
    client_id = os.environ.get('SMSPORTAL_CLIENT_ID')
    client_secret = os.environ.get('SMSPORTAL_API_SECRET')
    
    # Create Basic Auth header
    auth_str = f"{client_id}:{client_secret}"
    b64_auth = base64.b64encode(auth_str.encode()).decode()
    
    headers = {
        'Authorization': f'Basic {b64_auth}',
        'Content-Type': 'application/x-www-form-urlencoded'
    }
    
    payload = {
        'grant_type': 'client_credentials'
    }
    
    response = requests.post(url, data=payload, headers=headers)
    response.raise_for_status()
    token_data = response.json()
    return token_data.get('access_token') or token_data.get('token')


def send_smsportal_sms(phone, message, token=None):
    """
    Send SMS via SMS Portal API.
    
    Args:
        phone: Recipient phone number (South African format)
        message: SMS message content
        token: OAuth2 access token (optional, will fetch if not provided)
        
    Returns:
        API response JSON
    """
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
```

---

## API Endpoints

### Send Email

**Endpoint:** `POST /api/pharmacies/{pharmacy_id}/debtors/send-email`

**Request Body:**
```json
{
  "debtor_ids": [1, 2, 3],
  "ageing_buckets": ["d60", "d90", "d120", "d150", "d180"]
}
```

**Response:**
```json
{
  "status": "ok",
  "sent": [
    {
      "debtor_id": 1,
      "email": "customer@example.com",
      "status": "sent",
      "external_id": "202"
    }
  ],
  "errors": [
    {
      "debtor_id": 2,
      "error": "No email address"
    }
  ]
}
```

---

### Send SMS

**Endpoint:** `POST /api/pharmacies/{pharmacy_id}/debtors/send-sms`

**Request Body:**
```json
{
  "debtor_ids": [1, 2, 3],
  "ageing_buckets": ["d60", "d90", "d120", "d150", "d180"]
}
```

**Response:**
```json
{
  "status": "ok",
  "sent": [
    {
      "debtor_id": 1,
      "phone": "0821234567",
      "message": "Hi John Doe, your REITZ APTEEK account...",
      "status": "sent"
    }
  ],
  "errors": [
    {
      "debtor_id": 2,
      "error": "No phone number"
    }
  ]
}
```

---

## Frontend Integration

### Step 1: API Service Setup

Create a service file for communication API calls:

```javascript
// services/communicationService.js

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

class CommunicationService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  /**
   * Get authentication token from your auth system
   */
  getAuthToken() {
    // Integrate with your auth system
    return localStorage.getItem('auth_token');
  }

  /**
   * Get current pharmacy ID
   */
  getPharmacyId() {
    // Get from your app state/context
    return this.getCurrentPharmacyId(); // Your implementation
  }

  /**
   * Send emails to selected debtors
   */
  async sendEmail(debtorIds, ageingBuckets) {
    const pharmacyId = this.getPharmacyId();
    const response = await fetch(
      `${this.baseURL}/api/pharmacies/${pharmacyId}/debtors/send-email`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
        body: JSON.stringify({
          debtor_ids: debtorIds,
          ageing_buckets: ageingBuckets,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Send SMS to selected debtors
   */
  async sendSMS(debtorIds, ageingBuckets) {
    const pharmacyId = this.getPharmacyId();
    const response = await fetch(
      `${this.baseURL}/api/pharmacies/${pharmacyId}/debtors/send-sms`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
        body: JSON.stringify({
          debtor_ids: debtorIds,
          ageing_buckets: ageingBuckets,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }
}

export const communicationService = new CommunicationService();
```

---

### Step 2: React Component Example

```javascript
// components/CommunicationPanel.jsx
import React, { useState } from 'react';
import { communicationService } from '../services/communicationService';

const CommunicationPanel = ({ selectedDebtors, ageingBuckets }) => {
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSendEmail = async () => {
    if (selectedDebtors.length === 0) {
      alert('Please select at least one debtor');
      return;
    }

    setSending(true);
    setError(null);
    setResult(null);

    try {
      const debtorIds = selectedDebtors.map(d => d.id);
      const response = await communicationService.sendEmail(debtorIds, ageingBuckets);

      setResult({
        type: 'email',
        sent: response.sent || [],
        errors: response.errors || [],
      });
    } catch (err) {
      setError(err.message);
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
    setError(null);
    setResult(null);

    try {
      const debtorIds = selectedDebtors.map(d => d.id);
      const response = await communicationService.sendSMS(debtorIds, ageingBuckets);

      setResult({
        type: 'sms',
        sent: response.sent || [],
        errors: response.errors || [],
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="communication-panel">
      <h3>Send Communications</h3>
      
      <div className="button-group">
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
      </div>

      {error && (
        <div className="error-message">
          Error: {error}
        </div>
      )}

      {result && (
        <div className="result-message">
          <h4>Results:</h4>
          <p>Successfully sent: {result.sent.length}</p>
          {result.errors.length > 0 && (
            <div>
              <p>Errors: {result.errors.length}</p>
              <ul>
                {result.errors.map((err, idx) => (
                  <li key={idx}>
                    Account {err.debtor_id}: {err.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CommunicationPanel;
```

---

### Step 3: Vue.js Example

```vue
<!-- components/CommunicationPanel.vue -->
<template>
  <div class="communication-panel">
    <h3>Send Communications</h3>
    
    <div class="button-group">
      <button
        @click="handleSendEmail"
        :disabled="sending || selectedDebtors.length === 0"
      >
        {{ sending ? 'Sending...' : `Send Email (${selectedDebtors.length})` }}
      </button>
      
      <button
        @click="handleSendSMS"
        :disabled="sending || selectedDebtors.length === 0"
      >
        {{ sending ? 'Sending...' : `Send SMS (${selectedDebtors.length})` }}
      </button>
    </div>

    <div v-if="error" class="error-message">
      Error: {{ error }}
    </div>

    <div v-if="result" class="result-message">
      <h4>Results:</h4>
      <p>Successfully sent: {{ result.sent.length }}</p>
      <div v-if="result.errors.length > 0">
        <p>Errors: {{ result.errors.length }}</p>
        <ul>
          <li v-for="(err, idx) in result.errors" :key="idx">
            Account {{ err.debtor_id }}: {{ err.error }}
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script>
import { communicationService } from '../services/communicationService';

export default {
  name: 'CommunicationPanel',
  props: {
    selectedDebtors: {
      type: Array,
      required: true,
    },
    ageingBuckets: {
      type: Array,
      required: true,
    },
  },
  data() {
    return {
      sending: false,
      result: null,
      error: null,
    };
  },
  methods: {
    async handleSendEmail() {
      if (this.selectedDebtors.length === 0) {
        alert('Please select at least one debtor');
        return;
      }

      this.sending = true;
      this.error = null;
      this.result = null;

      try {
        const debtorIds = this.selectedDebtors.map(d => d.id);
        const response = await communicationService.sendEmail(
          debtorIds,
          this.ageingBuckets
        );

        this.result = {
          type: 'email',
          sent: response.sent || [],
          errors: response.errors || [],
        };
      } catch (err) {
        this.error = err.message;
      } finally {
        this.sending = false;
      }
    },

    async handleSendSMS() {
      if (this.selectedDebtors.length === 0) {
        alert('Please select at least one debtor');
        return;
      }

      this.sending = true;
      this.error = null;
      this.result = null;

      try {
        const debtorIds = this.selectedDebtors.map(d => d.id);
        const response = await communicationService.sendSMS(
          debtorIds,
          this.ageingBuckets
        );

        this.result = {
          type: 'sms',
          sent: response.sent || [],
          errors: response.errors || [],
        };
      } catch (err) {
        this.error = err.message;
      } finally {
        this.sending = false;
      }
    },
  },
};
</script>
```

---

### Step 4: Angular Example

```typescript
// services/communication.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CommunicationService {
  private apiUrl = 'http://localhost:5001';

  constructor(private http: HttpClient) {}

  sendEmail(pharmacyId: string, debtorIds: number[], ageingBuckets: string[]): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.getAuthToken()}`
    });

    return this.http.post(
      `${this.apiUrl}/api/pharmacies/${pharmacyId}/debtors/send-email`,
      {
        debtor_ids: debtorIds,
        ageing_buckets: ageingBuckets
      },
      { headers }
    );
  }

  sendSMS(pharmacyId: string, debtorIds: number[], ageingBuckets: string[]): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.getAuthToken()}`
    });

    return this.http.post(
      `${this.apiUrl}/api/pharmacies/${pharmacyId}/debtors/send-sms`,
      {
        debtor_ids: debtorIds,
        ageing_buckets: ageingBuckets
      },
      { headers }
    );
  }

  private getAuthToken(): string {
    // Get from your auth service
    return localStorage.getItem('auth_token') || '';
  }
}
```

```typescript
// components/communication-panel.component.ts
import { Component, Input } from '@angular/core';
import { CommunicationService } from '../services/communication.service';

@Component({
  selector: 'app-communication-panel',
  template: `
    <div class="communication-panel">
      <h3>Send Communications</h3>
      
      <div class="button-group">
        <button
          (click)="handleSendEmail()"
          [disabled]="sending || selectedDebtors.length === 0"
        >
          {{ sending ? 'Sending...' : 'Send Email (' + selectedDebtors.length + ')' }}
        </button>
        
        <button
          (click)="handleSendSMS()"
          [disabled]="sending || selectedDebtors.length === 0"
        >
          {{ sending ? 'Sending...' : 'Send SMS (' + selectedDebtors.length + ')' }}
        </button>
      </div>

      <div *ngIf="error" class="error-message">
        Error: {{ error }}
      </div>

      <div *ngIf="result" class="result-message">
        <h4>Results:</h4>
        <p>Successfully sent: {{ result.sent.length }}</p>
        <div *ngIf="result.errors.length > 0">
          <p>Errors: {{ result.errors.length }}</p>
          <ul>
            <li *ngFor="let err of result.errors">
              Account {{ err.debtor_id }}: {{ err.error }}
            </li>
          </ul>
        </div>
      </div>
    </div>
  `
})
export class CommunicationPanelComponent {
  @Input() selectedDebtors: any[] = [];
  @Input() ageingBuckets: string[] = [];
  @Input() pharmacyId: string = '';

  sending = false;
  result: any = null;
  error: string | null = null;

  constructor(private communicationService: CommunicationService) {}

  handleSendEmail() {
    if (this.selectedDebtors.length === 0) {
      alert('Please select at least one debtor');
      return;
    }

    this.sending = true;
    this.error = null;
    this.result = null;

    const debtorIds = this.selectedDebtors.map(d => d.id);

    this.communicationService.sendEmail(this.pharmacyId, debtorIds, this.ageingBuckets)
      .subscribe({
        next: (response) => {
          this.result = {
            type: 'email',
            sent: response.sent || [],
            errors: response.errors || [],
          };
          this.sending = false;
        },
        error: (err) => {
          this.error = err.message;
          this.sending = false;
        }
      });
  }

  handleSendSMS() {
    if (this.selectedDebtors.length === 0) {
      alert('Please select at least one debtor');
      return;
    }

    this.sending = true;
    this.error = null;
    this.result = null;

    const debtorIds = this.selectedDebtors.map(d => d.id);

    this.communicationService.sendSMS(this.pharmacyId, debtorIds, this.ageingBuckets)
      .subscribe({
        next: (response) => {
          this.result = {
            type: 'sms',
            sent: response.sent || [],
            errors: response.errors || [],
          };
          this.sending = false;
        },
        error: (err) => {
          this.error = err.message;
          this.sending = false;
        }
      });
  }
}
```

---

## Message Templates

### Email Template

The email template includes:
- Personalized greeting
- Outstanding balance (60+ days arrears)
- Banking details
- Account reference number
- Contact information

**Template Variables:**
- `{name}` - Customer name
- `{arrears_amount}` - Total 60+ day arrears
- `{acc_no}` - Account number
- `{pharmacy_name}` - Pharmacy name
- `{bank_name}` - Bank name
- `{account_number}` - Bank account number
- `{pharmacy_email}` - Pharmacy contact email
- `{pharmacy_phone}` - Pharmacy contact phone

### SMS Template

**Format:**
```
Hi {name}, your {pharmacy_name} account is overdue (60+ days): R{amount}. EFT {bank_name} {account_number}. Ref {acc_no}. Thanks!
```

**Character Limit:** 160 characters (SMS standard)

---

## Error Handling

### Common Errors

1. **No Email/Phone**
   - Error: "No email address" or "No phone number"
   - Solution: Skip account, log error

2. **Invalid Email Format**
   - Error: SendGrid validation error
   - Solution: Validate email format before sending

3. **Invalid Phone Format**
   - Error: SMS Portal validation error
   - Solution: Validate phone format (South African)

4. **API Authentication Failure**
   - Error: "Failed to authenticate"
   - Solution: Check API keys/credentials

5. **Rate Limiting**
   - Error: "Too many requests"
   - Solution: Implement retry logic with backoff

### Error Response Format

```json
{
  "status": "ok",
  "sent": [...],
  "errors": [
    {
      "debtor_id": 123,
      "error": "Error message here"
    }
  ]
}
```

---

## Best Practices

### 1. Validation

```javascript
// Validate before sending
const validDebtors = selectedDebtors.filter(debtor => {
  if (type === 'email') {
    return debtor.email && isValidEmail(debtor.email);
  } else {
    return debtor.phone && isValidPhone(debtor.phone);
  }
});
```

### 2. Loading States

```javascript
// Show loading indicator
setSending(true);

try {
  // Send communications
} finally {
  setSending(false);
}
```

### 3. User Feedback

```javascript
// Show success/error messages
if (result.sent.length > 0) {
  showNotification(`Successfully sent ${result.sent.length} messages`);
}

if (result.errors.length > 0) {
  showError(`Failed to send ${result.errors.length} messages`);
}
```

### 4. Retry Logic

```javascript
async function sendWithRetry(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

---

## Configuration

### Environment Variables

**Backend (.env):**
```env
SENDGRID_API_KEY=your_sendgrid_api_key
SMSPORTAL_CLIENT_ID=your_client_id
SMSPORTAL_API_SECRET=your_api_secret
```

**Frontend (.env):**
```env
REACT_APP_API_URL=https://api.yourdomain.com
# or
VITE_API_URL=https://api.yourdomain.com
```

---

## Testing

### Test Email Sending

```javascript
// Test email service
const testDebtors = [
  { id: 1, email: 'test@example.com', name: 'Test User' }
];

const result = await communicationService.sendEmail(
  [1],
  ['d60', 'd90']
);

console.log('Email sent:', result.sent.length > 0);
```

### Test SMS Sending

```javascript
// Test SMS service
const testDebtors = [
  { id: 1, phone: '0821234567', name: 'Test User' }
];

const result = await communicationService.sendSMS(
  [1],
  ['d60', 'd90']
);

console.log('SMS sent:', result.sent.length > 0);
```

---

## Security Considerations

1. **API Keys**: Never expose API keys in frontend code
2. **Authentication**: Always authenticate API requests
3. **Validation**: Validate all inputs server-side
4. **Rate Limiting**: Implement rate limiting on backend
5. **Logging**: Log all communication attempts
6. **Privacy**: Don't log sensitive customer data

---

## Troubleshooting

### Email Not Sending

1. Check SendGrid API key is correct
2. Verify sender email is verified in SendGrid
3. Check email format is valid
4. Review SendGrid dashboard for errors

### SMS Not Sending

1. Check SMS Portal credentials
2. Verify phone number format (South African)
3. Check account balance/credits
4. Review SMS Portal dashboard for errors

### API Errors

1. Check authentication token
2. Verify pharmacy ID is correct
3. Check network connectivity
4. Review backend logs for errors

---

## Support

For issues:
1. Check API service status (SendGrid/SMS Portal)
2. Verify credentials are correct
3. Review error messages in response
4. Check backend logs for detailed errors

---

**Last Updated**: 2025-01-16

