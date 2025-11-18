# Changes Summary: No Hardcoded Pharmacy Details

## What Changed

The backend has been updated to **remove all hardcoded pharmacy details**. All pharmacy information must now be provided by the frontend.

---

## Before vs After

### ❌ Before (Old Behavior)
- Backend had hardcoded defaults: "Reitz Apteek", "ABSA", "409 0014 954", etc.
- Frontend could omit `template_variables` and backend would use defaults
- Not flexible for multiple pharmacies

### ✅ After (New Behavior)
- **No hardcoded values** in backend
- Frontend **must** provide all pharmacy details in `template_variables`
- Backend validates and returns error if missing
- Fully flexible for any pharmacy

---

## Required Changes in Frontend

### 1. Always Provide Template Variables

**For Email:**
```javascript
{
  template_variables: {
    pharmacy_name: "Your Pharmacy Name",        // ✅ Required
    bank_name: "ABSA",                          // ✅ Required
    account_number: "123 456 7890",            // ✅ Required
    pharmacy_email: "info@pharmacy.com",       // ✅ Required
    pharmacy_phone: "012 345 6789"             // ✅ Required
  }
}
```

**For SMS:**
```javascript
{
  template_variables: {
    pharmacy_name: "Your Pharmacy Name",  // ✅ Required
    bank_name: "ABSA",                    // ✅ Required
    account_number: "1234567890"          // ✅ Required
  }
}
```

### 2. Get Values from Your Application

These values should come from:
- Your pharmacy database/state
- User's selected pharmacy
- Application context/settings
- User profile/settings

**Example:**
```javascript
// Get from your app state/context
const pharmacy = getCurrentPharmacy();

const templateVars = {
  pharmacy_name: pharmacy.name,
  bank_name: pharmacy.bank_name,
  account_number: pharmacy.banking_account,
  pharmacy_email: pharmacy.email,
  pharmacy_phone: pharmacy.phone
};
```

---

## Error Handling

If you don't provide required variables, the API will return:

```json
{
  "status": "error",
  "error": "Missing required template variables: pharmacy_name, bank_name",
  "required_variables": ["pharmacy_name", "bank_name", "account_number", ...]
}
```

**HTTP Status:** `400 Bad Request`

---

## Migration Guide

### Step 1: Identify Where Pharmacy Data Lives

Find where you store pharmacy information:
- Database query?
- Application state/context?
- User settings?
- Selected pharmacy?

### Step 2: Create Helper Function

```javascript
function getPharmacyTemplateVars() {
  const pharmacy = getCurrentPharmacy(); // Your function to get pharmacy
  
  return {
    pharmacy_name: pharmacy.name,
    bank_name: pharmacy.bank_name || pharmacy.bankName,
    account_number: pharmacy.banking_account || pharmacy.accountNumber,
    pharmacy_email: pharmacy.email,
    pharmacy_phone: pharmacy.phone
  };
}
```

### Step 3: Update All API Calls

**Before:**
```javascript
await fetch('/send_email', {
  body: JSON.stringify({ accounts: selectedDebtors })
});
```

**After:**
```javascript
const templateVars = getPharmacyTemplateVars();

await fetch('/send_email', {
  body: JSON.stringify({
    accounts: selectedDebtors,
    template_variables: templateVars  // ✅ Now required
  })
});
```

---

## Testing

Test that your frontend provides all required variables:

```javascript
// Test email endpoint
const testVars = {
  pharmacy_name: "Test Pharmacy",
  bank_name: "ABSA",
  account_number: "1234567890",
  pharmacy_email: "test@pharmacy.com",
  pharmacy_phone: "0123456789"
};

const response = await fetch('https://debtor-reminder-backend.onrender.com/send_email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    accounts: [{ acc_no: "123", name: "Test", email: "test@example.com", d60: 100 }],
    template_variables: testVars
  })
});

const result = await response.json();
console.log(result); // Should succeed if all vars provided
```

---

## Benefits

✅ **Multi-pharmacy support** - Each pharmacy can have different details  
✅ **No hardcoded values** - Fully flexible  
✅ **Clear validation** - Backend tells you exactly what's missing  
✅ **Better security** - No sensitive data in backend code  

---

## Documentation

See these files for complete details:
- `FRONTEND_REQUIRED_VARIABLES.md` - Complete guide on required variables
- `FRONTEND_QUICK_START.md` - Updated quick start guide
- `FRONTEND_QUICK_START.md` - All examples updated

---

## Summary

**Action Required:** Update all API calls to include `template_variables` with pharmacy details from your application.

**No Breaking Changes:** If you were already providing `template_variables`, your code will continue to work. The change is that it's now **required** instead of optional.

