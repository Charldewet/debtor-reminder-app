# Communication Integration - Quick Start

## Quick Integration Steps

### 1. Backend Setup

**Install Dependencies:**
```bash
pip install sendgrid requests
```

**Set Environment Variables:**
```env
SENDGRID_API_KEY=your_key_here
SMSPORTAL_CLIENT_ID=your_client_id
SMSPORTAL_API_SECRET=your_secret
```

---

### 2. Frontend Integration

#### Minimal JavaScript Example

```javascript
// Send Email
async function sendEmail(debtorIds, ageingBuckets, pharmacyId) {
  const response = await fetch(
    `https://api.yourdomain.com/api/pharmacies/${pharmacyId}/debtors/send-email`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify({
        debtor_ids: debtorIds,
        ageing_buckets: ageingBuckets,
      }),
    }
  );
  return await response.json();
}

// Send SMS
async function sendSMS(debtorIds, ageingBuckets, pharmacyId) {
  const response = await fetch(
    `https://api.yourdomain.com/api/pharmacies/${pharmacyId}/debtors/send-sms`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify({
        debtor_ids: debtorIds,
        ageing_buckets: ageingBuckets,
      }),
    }
  );
  return await response.json();
}

// Usage
const debtorIds = [1, 2, 3];
const ageingBuckets = ['d60', 'd90', 'd120'];
const pharmacyId = 'pharmacy_123';

// Send email
const emailResult = await sendEmail(debtorIds, ageingBuckets, pharmacyId);
console.log('Sent:', emailResult.sent.length);
console.log('Errors:', emailResult.errors.length);

// Send SMS
const smsResult = await sendSMS(debtorIds, ageingBuckets, pharmacyId);
console.log('Sent:', smsResult.sent.length);
console.log('Errors:', smsResult.errors.length);
```

---

## API Endpoints

### Send Email
```
POST /api/pharmacies/{pharmacy_id}/debtors/send-email
```

**Request:**
```json
{
  "debtor_ids": [1, 2, 3],
  "ageing_buckets": ["d60", "d90", "d120"]
}
```

**Response:**
```json
{
  "status": "ok",
  "sent": [{"debtor_id": 1, "email": "user@example.com"}],
  "errors": [{"debtor_id": 2, "error": "No email address"}]
}
```

### Send SMS
```
POST /api/pharmacies/{pharmacy_id}/debtors/send-sms
```

**Request:** Same as email

**Response:** Same format as email

---

## Key Points

1. **Always include pharmacy_id** in URL
2. **Send array of debtor IDs**, not full objects
3. **Specify ageing_buckets** to calculate arrears
4. **Handle partial success** - check both `sent` and `errors` arrays
5. **Show loading state** while sending
6. **Display results** to user after completion

---

## Complete Example

```javascript
// Complete working example
class DebtorCommunication {
  constructor(apiUrl, pharmacyId, authToken) {
    this.apiUrl = apiUrl;
    this.pharmacyId = pharmacyId;
    this.authToken = authToken;
  }

  async sendEmail(debtorIds, ageingBuckets) {
    const response = await fetch(
      `${this.apiUrl}/api/pharmacies/${this.pharmacyId}/debtors/send-email`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`,
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

  async sendSMS(debtorIds, ageingBuckets) {
    const response = await fetch(
      `${this.apiUrl}/api/pharmacies/${this.pharmacyId}/debtors/send-sms`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`,
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

// Usage
const comm = new DebtorCommunication(
  'https://api.yourdomain.com',
  'pharmacy_123',
  'your_auth_token'
);

// Send to selected debtors
const selectedIds = [1, 2, 3];
const buckets = ['d60', 'd90', 'd120'];

try {
  const result = await comm.sendEmail(selectedIds, buckets);
  console.log(`Sent ${result.sent.length} emails`);
  if (result.errors.length > 0) {
    console.log(`Failed: ${result.errors.length}`);
  }
} catch (error) {
  console.error('Error:', error);
}
```

---

For detailed documentation, see `COMMUNICATION_INTEGRATION_GUIDE.md`

