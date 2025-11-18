# Total Balance Implementation - Summary

## What Changed

The default SMS and email templates now include the **total outstanding balance** in addition to the 60+ days arrears amount.

---

## Backend Changes ✅

### Default Email Template
Now includes:
```
Dear {name},

Your account shows an outstanding balance of R{amount} (60+ days overdue).

Total balance (Total outstanding amount): R{total_balance}

Banking Details:
Bank: {bank_name}
Account Number: {account_number}
Reference: {acc_no}
```

### Default SMS Template
Now includes:
```
Hi {name}, your {pharmacy_name} account is overdue (60+ days): R{amount}. 
Total balance (Total outstanding amount): R{total_balance}. 
EFT {bank_name} {account_number}. Ref {acc_no}. Thanks!
```

---

## Frontend Implementation

### ✅ No Changes Required (If Using Default Templates)

If you're using the default templates, **no frontend changes are needed**. The backend automatically:
- Calculates total balance from account data
- Includes it in default templates
- Formats it as currency

**Just make sure your account objects include ageing bucket data:**

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
  d150: 0.00,
  d180: 0.00,
  balance: 2500.00   // Total balance (optional - will be calculated)
}
```

### Using Custom Templates

If you want to use `{total_balance}` in custom templates:

#### Email Example

```javascript
const emailTemplate = {
  subject: "Account Statement - {pharmacy_name}",
  html_body: `
    <p>Dear {name},</p>
    <p>Your account {acc_no} statement:</p>
    <p><b>60+ Days Overdue:</b> R{amount}</p>
    <p><b>Total Balance (Total outstanding amount):</b> R{total_balance}</p>
    <p>Please settle using:</p>
    <p>Bank: {bank_name}<br>
    Account: {account_number}<br>
    Reference: {acc_no}</p>
  `
};

await fetch('https://debtor-reminder-backend.onrender.com/send_email', {
  method: 'POST',
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

#### SMS Example

```javascript
const smsTemplate = "Hi {name}, your {pharmacy_name} account {acc_no} is overdue (60+ days): R{amount}. Total balance (Total outstanding amount): R{total_balance}. EFT {bank_name} {account_number}. Ref {acc_no}. Thanks!";

await fetch('https://debtor-reminder-backend.onrender.com/send_sms', {
  method: 'POST',
  body: JSON.stringify({
    accounts: selectedDebtors,
    sms_template: smsTemplate,
    template_variables: {
      pharmacy_name: "Your Pharmacy",
      bank_name: "ABSA",
      account_number: "1234567890"
    }
  })
});
```

---

## Available Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `{amount}` | 60+ days arrears | "1,234.56" |
| `{arrears_amount}` | Same as amount (60+ days) | "1,234.56" |
| `{total_balance}` | **Total outstanding (all buckets)** | "2,500.00" |

---

## How Total Balance is Calculated

The backend calculates total balance as:
1. Uses `balance` field if provided in account object
2. Otherwise, sums all ageing buckets: `current + d30 + d60 + d90 + d120 + d150 + d180`

**Example:**
```javascript
// Account data
{
  current: 500.00,
  d30: 300.00,
  d60: 1000.00,
  d90: 500.00,
  d120: 200.00,
  d150: 0.00,
  d180: 0.00
}

// Backend calculates:
total_balance = 500 + 300 + 1000 + 500 + 200 + 0 + 0 = 2500.00
```

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
};

// Send email - check response
const response = await fetch('https://debtor-reminder-backend.onrender.com/send_email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
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

const result = await response.json();
console.log(result);
// Should show email sent successfully with total balance included
```

---

## Summary

### For Frontend Team:

1. ✅ **No changes needed** if using default templates
2. ✅ **Ensure account objects include ageing bucket data** (current, d30, d60, d90, d120, d150, d180)
3. ✅ **Use `{total_balance}` variable** in custom templates if needed
4. ✅ **Total balance is auto-calculated** - no frontend calculation needed

### What You'll See:

**Default Email:**
- Shows 60+ days arrears: R{amount}
- Shows total balance: R{total_balance}
- Shows banking details

**Default SMS:**
- Shows 60+ days arrears: R{amount}
- Shows total balance: R{total_balance}
- Shows banking details

---

**All changes are complete and ready to use!**

See `FRONTEND_TOTAL_BALANCE_GUIDE.md` for complete documentation.

