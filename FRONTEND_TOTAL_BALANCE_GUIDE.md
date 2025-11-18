# Total Balance Feature - Frontend Guide

## Overview

The default SMS and email templates now include the **total outstanding balance** in addition to the 60+ days arrears amount.

---

## What Changed

### Default Email Template

Now includes:
- **60+ days arrears**: R{amount} (e.g., R1,234.56)
- **Total balance (Total outstanding amount)**: R{total_balance} (e.g., R2,500.00)
- Banking details

### Default SMS Template

Now includes:
- **60+ days arrears**: R{amount}
- **Total balance (Total outstanding amount)**: R{total_balance}
- Banking details

---

## Available Variables

### New Variable: `{total_balance}`

The `{total_balance}` variable is automatically calculated and includes:
- All ageing buckets: current, d30, d60, d90, d120, d150, d180
- Or uses the `balance` field if available in the account object

**Example:**
```javascript
{
  name: "John Doe",
  acc_no: "123456",
  amount: "1,234.56",           // 60+ days arrears
  total_balance: "2,500.00",    // Total outstanding (all buckets)
  arrears_amount: "1,234.56"    // Same as amount (60+ days)
}
```

---

## Using in Custom Templates

### Email Template Example

```javascript
const emailTemplate = {
  subject: "Payment Reminder - {pharmacy_name}",
  html_body: `
    <p>Dear {name},</p>
    <p>Your account {acc_no} has:</p>
    <ul>
      <li>60+ days overdue: R{amount}</li>
      <li>Total balance (Total outstanding amount): R{total_balance}</li>
    </ul>
    <p>Please pay to {bank_name} account {account_number}.</p>
    <p>Reference: {acc_no}</p>
  `
};
```

### SMS Template Example

```javascript
const smsTemplate = "Hi {name}, your {pharmacy_name} account {acc_no} is overdue (60+ days): R{amount}. Total balance (Total outstanding amount): R{total_balance}. EFT {bank_name} {account_number}. Ref {acc_no}. Thanks!";
```

---

## Account Object Format

Make sure your account objects include the `balance` field or all ageing buckets:

```javascript
{
  acc_no: "123456",
  name: "John Doe",
  email: "john@example.com",
  phone: "0821234567",
  current: 500.00,    // Current balance
  d30: 300.00,       // 30 days overdue
  d60: 1000.00,      // 60 days overdue
  d90: 500.00,       // 90 days overdue
  d120: 200.00,      // 120 days overdue
  d150: 0.00,        // 150 days overdue
  d180: 0.00,        // 180 days overdue
  balance: 2500.00   // Total balance (optional - will be calculated if not provided)
}
```

**Note:** If `balance` is not provided, the backend calculates it as the sum of all ageing buckets.

---

## Default Templates

### Default Email Template

The backend uses this default template if you don't provide a custom one:

```
Dear {name},

We hope you're well. This is a reminder that your account at {pharmacy_name} 
shows an outstanding balance of R{amount}, which has been overdue for more than 60 days.

Total balance (Total outstanding amount): R{total_balance}

We kindly request that payment be made at your earliest convenience using the EFT details below:

Banking Details:
Bank: {bank_name}
Account Number: {account_number}
Reference: {acc_no}

If you've already made this payment or require a statement, please feel free to contact us.
Thank you for your continued support.

Warm regards,
{pharmacy_name} Team
{pharmacy_email}
{pharmacy_phone}
```

### Default SMS Template

The backend uses this default template if you don't provide a custom one:

```
Hi {name}, your {pharmacy_name} account is overdue (60+ days): R{amount}. 
Total balance (Total outstanding amount): R{total_balance}. 
EFT {bank_name} {account_number}. Ref {acc_no}. Thanks!
```

**Note:** SMS is automatically truncated to 160 characters if too long.

---

## Implementation Example

### Using Default Templates (Recommended)

```javascript
// Just provide accounts and template_variables
// Backend will use default templates with total balance included
const response = await fetch('https://debtor-reminder-backend.onrender.com/send_email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    accounts: selectedDebtors,
    template_variables: {
      pharmacy_name: "Your Pharmacy",
      bank_name: "ABSA",
      account_number: "123 456 7890",
      pharmacy_email: "info@pharmacy.com",
      pharmacy_phone: "012 345 6789"
    }
  })
});
```

### Using Custom Templates

```javascript
// Custom template with total balance
const emailTemplate = {
  subject: "Account Statement - {pharmacy_name}",
  html_body: `
    <p>Dear {name},</p>
    <p>Your account {acc_no} statement:</p>
    <p><b>60+ Days Overdue:</b> R{amount}</p>
    <p><b>Total Balance (Total outstanding amount):</b> R{total_balance}</p>
    <p>Please settle your account using:</p>
    <p>Bank: {bank_name}<br>
    Account: {account_number}<br>
    Reference: {acc_no}</p>
  `
};

const response = await fetch('https://debtor-reminder-backend.onrender.com/send_email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    accounts: selectedDebtors,
    email_template: emailTemplate,
    template_variables: {
      pharmacy_name: "Your Pharmacy",
      bank_name: "ABSA",
      account_number: "123 456 7890",
      pharmacy_email: "info@pharmacy.com",
      pharmacy_phone: "012 345 6789"
    }
  })
});
```

---

## Key Points

1. ✅ **`{total_balance}` is auto-calculated** - No need to calculate it in frontend
2. ✅ **Available in all templates** - Use `{total_balance}` in custom templates
3. ✅ **Included in default templates** - Automatically shown if using defaults
4. ✅ **Formatted as currency** - Already formatted (e.g., "2,500.00")
5. ✅ **Includes all ageing buckets** - Sum of current + d30 + d60 + d90 + d120 + d150 + d180

---

## Testing

Test that total balance is included:

```javascript
const testDebtor = {
  acc_no: "123456",
  name: "Test User",
  email: "test@example.com",
  current: 500.00,
  d30: 300.00,
  d60: 1000.00,
  d90: 500.00,
  d120: 200.00,
  d150: 0.00,
  d180: 0.00
  // balance: 2500.00 (optional)
};

// Send email - check that total_balance is included
const response = await fetch('https://debtor-reminder-backend.onrender.com/send_email', {
  method: 'POST',
  body: JSON.stringify({
    accounts: [testDebtor],
    template_variables: {
      pharmacy_name: "Test Pharmacy",
      bank_name: "ABSA",
      account_number: "1234567890",
      pharmacy_email: "test@pharmacy.com",
      pharmacy_phone: "0123456789"
    }
  })
});

// Response should show email was sent with total balance included
```

---

## Summary

- ✅ Default templates now include total balance
- ✅ `{total_balance}` variable available in all templates
- ✅ Automatically calculated from account data
- ✅ No frontend changes needed if using default templates
- ✅ Can use `{total_balance}` in custom templates

The backend handles everything - just make sure your account objects include ageing bucket data!

