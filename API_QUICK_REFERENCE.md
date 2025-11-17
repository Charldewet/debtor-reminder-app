# Debtor Reminder API - Quick Reference

## Base URL
```
http://localhost:5001
```

## Endpoints Summary

| Method | Endpoint | Purpose | Request Body | Response |
|--------|----------|---------|--------------|----------|
| GET | `/` | Health check | None | JSON status |
| POST | `/upload` | Upload PDF | FormData (file) | JSON array of debtors |
| POST | `/download` | Download CSV | JSON (rows, min_balance) | CSV file |
| POST | `/download_missing_contacts_pdf` | Missing contacts PDF | JSON (rows) | PDF file |
| POST | `/download_filtered_table_pdf` | Filtered table PDF | JSON (rows, ageing_buckets, col_names) | PDF file |
| POST | `/send_email` | Send emails | JSON (accounts) | JSON (sent, errors) |
| POST | `/send_sms` | Send SMS | JSON (accounts) | JSON (sent, errors) |

---

## Request/Response Examples

### 1. Upload PDF
```bash
POST /upload
Content-Type: multipart/form-data

FormData:
  file: <PDF file>
```

**Response:**
```json
[
  {
    "acc_no": "123456",
    "name": "John Doe",
    "current": 100.50,
    "d30": 200.00,
    "d60": 150.00,
    "d90": 75.00,
    "d120": 50.00,
    "d150": 25.00,
    "d180": 10.00,
    "balance": 610.50,
    "email": "john@example.com",
    "phone": "0821234567"
  }
]
```

---

### 2. Download CSV
```bash
POST /download
Content-Type: application/json

{
  "rows": [...debtor objects...],
  "min_balance": 100
}
```

**Response:** CSV file download

---

### 3. Send Email
```bash
POST /send_email
Content-Type: application/json

{
  "accounts": [
    {
      "acc_no": "123456",
      "name": "John Doe",
      "email": "john@example.com",
      "d60": 150.00,
      "d90": 75.00,
      "d120": 50.00,
      "d150": 25.00,
      "d180": 10.00
    }
  ]
}
```

**Response:**
```json
{
  "status": "ok",
  "sent": [
    {
      "acc_no": "123456",
      "email": "john@example.com",
      "status": 202
    }
  ],
  "errors": []
}
```

---

### 4. Send SMS
```bash
POST /send_sms
Content-Type: application/json

{
  "accounts": [
    {
      "acc_no": "123456",
      "name": "John Doe",
      "phone": "0821234567",
      "d60": 150.00,
      "d90": 75.00,
      "d120": 50.00,
      "d150": 25.00,
      "d180": 10.00
    }
  ]
}
```

**Response:**
```json
{
  "status": "ok",
  "sent": [
    {
      "acc_no": "123456",
      "phone": "0821234567",
      "message": "Hi John Doe, your REITZ APTEEK account..."
    }
  ],
  "errors": []
}
```

---

## Data Model

### Debtor Object
```typescript
{
  acc_no: string;      // 6-digit account number
  name: string;        // Customer name
  current: number;     // Current balance
  d30: number;         // 30 days overdue
  d60: number;         // 60 days overdue
  d90: number;         // 90 days overdue
  d120: number;        // 120 days overdue
  d150: number;        // 150 days overdue
  d180: number;        // 180 days overdue
  balance: number;     // Total outstanding
  email: string;       // Email (may be empty)
  phone: string;      // Phone (may be empty)
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "No file part"
}
```

### 500 Internal Server Error
```json
{
  "error": "Failed to process file"
}
```

---

## Environment Variables

```env
PORT=5001
SENDGRID_API_KEY=your_key_here
SMSPORTAL_CLIENT_ID=your_client_id
SMSPORTAL_API_SECRET=your_secret
```

---

## CORS Configuration

Backend is configured to accept requests from:
- `http://localhost:5173` (development)
- Configure production domain in `backend_api/app.py`

```python
CORS(app, supports_credentials=True)
```

