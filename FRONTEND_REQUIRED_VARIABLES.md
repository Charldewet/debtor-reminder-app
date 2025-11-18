# Required Template Variables - Frontend Guide

## Overview

The backend **requires** pharmacy details to be provided by the frontend. There are no hardcoded values in the backend - all pharmacy information must come from your application.

---

## Required Variables

### For Email (`POST /send_email`)

You **must** provide these variables in `template_variables`:

```javascript
{
  pharmacy_name: "Your Pharmacy Name",        // Required - Used as "from" name
  bank_name: "ABSA",                          // Required - Bank name
  account_number: "123 456 7890",            // Required - Bank account for EFT
  pharmacy_email: "info@yourpharmacy.com",    // Required - Used as "from" email
  pharmacy_phone: "012 345 6789"             // Required - Contact phone
}
```

### For SMS (`POST /send_sms`)

You **must** provide these variables in `template_variables`:

```javascript
{
  pharmacy_name: "Your Pharmacy Name",  // Required
  bank_name: "ABSA",                    // Required
  account_number: "1234567890"          // Required
}
```

---

## Error Response

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

## Where to Get These Values

### Option 1: From Your Application State/Context

```javascript
// React Example
import { useContext } from 'react';
import { PharmacyContext } from './PharmacyContext';

function DebtorCommunication({ selectedDebtors }) {
  const { pharmacy } = useContext(PharmacyContext);
  
  const templateVars = {
    pharmacy_name: pharmacy.name,
    bank_name: pharmacy.bankName,
    account_number: pharmacy.accountNumber,
    pharmacy_email: pharmacy.email,
    pharmacy_phone: pharmacy.phone
  };
  
  // Use templateVars in API call
}
```

### Option 2: From User Settings/Profile

```javascript
// Get from user's pharmacy settings
const pharmacySettings = await fetchUserPharmacySettings();

const templateVars = {
  pharmacy_name: pharmacySettings.name,
  bank_name: pharmacySettings.bankName,
  account_number: pharmacySettings.accountNumber,
  pharmacy_email: pharmacySettings.email,
  pharmacy_phone: pharmacySettings.phone
};
```

### Option 3: From Current Pharmacy Selection

```javascript
// If user can select pharmacy
const currentPharmacy = getSelectedPharmacy();

const templateVars = {
  pharmacy_name: currentPharmacy.name,
  bank_name: currentPharmacy.bank_name,
  account_number: currentPharmacy.banking_account,
  pharmacy_email: currentPharmacy.email,
  pharmacy_phone: currentPharmacy.phone
};
```

---

## Complete Example

```javascript
// Get pharmacy details from your application
function getPharmacyDetails() {
  // This should come from your app state, API, or user settings
  return {
    name: "Reitz Apteek",
    bankName: "ABSA",
    accountNumber: "409 0014 954",
    email: "info@reitzapteek.co.za",
    phone: "058 863 2801"
  };
}

async function sendEmailToDebtors(selectedDebtors) {
  const pharmacy = getPharmacyDetails();
  
  const response = await fetch('https://debtor-reminder-backend.onrender.com/send_email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      accounts: selectedDebtors,
      template_variables: {
        pharmacy_name: pharmacy.name,           // Required
        bank_name: pharmacy.bankName,            // Required
        account_number: pharmacy.accountNumber,  // Required
        pharmacy_email: pharmacy.email,          // Required
        pharmacy_phone: pharmacy.phone          // Required
      }
    })
  });
  
  return await response.json();
}

async function sendSMSToDebtors(selectedDebtors) {
  const pharmacy = getPharmacyDetails();
  
  const response = await fetch('https://debtor-reminder-backend.onrender.com/send_sms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      accounts: selectedDebtors,
      template_variables: {
        pharmacy_name: pharmacy.name,           // Required
        bank_name: pharmacy.bankName,          // Required
        account_number: pharmacy.accountNumber // Required
      }
    })
  });
  
  return await response.json();
}
```

---

## Integration with Your Existing System

If you already have pharmacy data in your database/state:

```javascript
// Example: Using pharmacy from your existing system
const pharmacy = {
  id: "pharmacy_123",
  name: "Reitz Apteek",
  email: "info@reitzapteek.co.za",
  phone: "058 863 2801",
  banking_account: "409 0014 954",
  bank_name: "ABSA"
};

// Map to template variables
const templateVars = {
  pharmacy_name: pharmacy.name,
  bank_name: pharmacy.bank_name,
  account_number: pharmacy.banking_account,
  pharmacy_email: pharmacy.email,
  pharmacy_phone: pharmacy.phone
};
```

---

## Validation

Always validate that you have all required variables before making the API call:

```javascript
function validateTemplateVars(vars, forEmail = false) {
  const required = forEmail
    ? ['pharmacy_name', 'bank_name', 'account_number', 'pharmacy_email', 'pharmacy_phone']
    : ['pharmacy_name', 'bank_name', 'account_number'];
  
  const missing = required.filter(key => !vars[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required variables: ${missing.join(', ')}`);
  }
  
  return true;
}

// Usage
const templateVars = getPharmacyDetails();
validateTemplateVars(templateVars, true); // true for email

await sendEmailToDebtors(selectedDebtors, templateVars);
```

---

## Summary

✅ **DO:** Provide all required template variables from your application  
✅ **DO:** Get pharmacy details from your app state/context/database  
✅ **DO:** Validate variables before making API calls  

❌ **DON'T:** Expect backend to have hardcoded pharmacy details  
❌ **DON'T:** Send requests without required template_variables  
❌ **DON'T:** Hardcode pharmacy details in frontend (get from your system)  

---

**Remember:** The backend has no hardcoded pharmacy information. All details must come from your frontend application.

