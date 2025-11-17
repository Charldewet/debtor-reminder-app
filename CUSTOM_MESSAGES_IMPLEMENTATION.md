# Custom Message Templates - Implementation Guide

## Overview

This guide shows how to implement customizable email and SMS message templates that can be configured from the frontend.

---

## Backend API Changes

### Updated Email Endpoint

**Endpoint:** `POST /api/pharmacies/{pharmacy_id}/debtors/send-email`

**Request Body:**
```json
{
  "debtor_ids": [1, 2, 3],
  "ageing_buckets": ["d60", "d90", "d120"],
  "email_template": {
    "subject": "Reminder: Account Overdue at {pharmacy_name}",
    "html_body": "<p>Dear {name},</p><p>Your account {acc_no} is overdue...</p>"
  },
  "template_variables": {
    "pharmacy_name": "Reitz Apteek",
    "bank_name": "ABSA",
    "account_number": "409 0014 954",
    "pharmacy_email": "charl@thelocalchoice.co.za",
    "pharmacy_phone": "058 863 2801"
  }
}
```

### Updated SMS Endpoint

**Endpoint:** `POST /api/pharmacies/{pharmacy_id}/debtors/send-sms`

**Request Body:**
```json
{
  "debtor_ids": [1, 2, 3],
  "ageing_buckets": ["d60", "d90", "d120"],
  "sms_template": "Hi {name}, your {pharmacy_name} account {acc_no} is overdue: R{amount}. EFT {bank_name} {account_number}. Thanks!",
  "template_variables": {
    "pharmacy_name": "Reitz Apteek",
    "bank_name": "ABSA",
    "account_number": "4090014954"
  }
}
```

---

## Backend Implementation

### Updated Email Handler

```python
@app.route('/api/pharmacies/<pharmacy_id>/debtors/send-email', methods=['POST'])
@require_pharmacy_access(pharmacy_id)
def send_email(pharmacy_id):
    data = request.json
    debtor_ids = data.get('debtor_ids', [])
    ageing_buckets = data.get('ageing_buckets', ['d60', 'd90', 'd120', 'd150', 'd180'])
    
    # Get custom template or use default
    email_template = data.get('email_template', {})
    subject_template = email_template.get('subject', 'Reminder: Account Overdue at {pharmacy_name}')
    html_body_template = email_template.get('html_body', None)
    
    # Get template variables
    template_vars = data.get('template_variables', {})
    
    # Get pharmacy info
    pharmacy = db.session.query(Pharmacy).filter_by(id=pharmacy_id).first()
    if not pharmacy:
        return jsonify({'error': 'Pharmacy not found'}), 404
    
    # Merge pharmacy data into template variables
    template_vars.setdefault('pharmacy_name', pharmacy.name)
    template_vars.setdefault('bank_name', pharmacy.bank_name or 'ABSA')
    template_vars.setdefault('account_number', pharmacy.banking_account or '409 0014 954')
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
    
    # Decrypt API key
    api_key = decrypt_api_key(pharmacy.sendgrid_api_key)
    
    for debtor in debtors:
        if not debtor.email:
            errors.append({
                'debtor_id': debtor.id,
                'error': 'No email address'
            })
            continue
        
        # Calculate arrears
        arrears_60_plus = sum([
            float(getattr(debtor, bucket)) for bucket in ageing_buckets
        ])
        
        # Prepare debtor-specific variables
        debtor_vars = {
            **template_vars,
            'name': debtor.name,
            'acc_no': debtor.acc_no,
            'amount': f"{arrears_60_plus:,.2f}",
            'arrears_amount': f"{arrears_60_plus:,.2f}",
        }
        
        # Render subject
        subject = render_template_string(subject_template, **debtor_vars)
        
        # Render HTML body (use custom or default)
        if html_body_template:
            html_content = render_template_string(html_body_template, **debtor_vars)
        else:
            # Default template
            html_content = create_default_email_template(debtor, pharmacy, arrears_60_plus)
        
        try:
            # Send via SendGrid
            sg = sendgrid.SendGridAPIClient(api_key)
            from_email = Email(pharmacy.email or 'no-reply@example.com', pharmacy.name)
            to_email = To(debtor.email)
            mail = Mail(from_email, to_email, subject, Content('text/html', html_content))
            response = sg.client.mail.send.post(request_body=mail.get())
            
            # Log communication
            log = CommunicationLog(
                pharmacy_id=pharmacy_id,
                debtor_id=debtor.id,
                communication_type='email',
                recipient=debtor.email,
                subject=subject,
                message=html_content,
                status='sent',
                external_id=str(response.status_code),
                sent_at=datetime.utcnow()
            )
            db.session.add(log)
            
            sent.append({
                'debtor_id': debtor.id,
                'email': debtor.email,
                'status': 'sent',
                'external_id': str(response.status_code)
            })
            
        except Exception as e:
            # Log failed communication
            log = CommunicationLog(
                pharmacy_id=pharmacy_id,
                debtor_id=debtor.id,
                communication_type='email',
                recipient=debtor.email,
                subject=subject,
                message=html_content,
                status='failed',
                error_message=str(e)
            )
            db.session.add(log)
            
            errors.append({
                'debtor_id': debtor.id,
                'error': str(e)
            })
    
    db.session.commit()
    
    return jsonify({
        'sent': sent,
        'errors': errors
    })


def render_template_string(template, **kwargs):
    """
    Simple template rendering using string format.
    Supports {variable} placeholders.
    """
    try:
        return template.format(**kwargs)
    except KeyError as e:
        # If variable not found, leave placeholder as-is
        import re
        return re.sub(r'\{' + str(e.args[0]) + r'\}', f'{{{e.args[0]}}}', template)
```

### Updated SMS Handler

```python
@app.route('/api/pharmacies/<pharmacy_id>/debtors/send-sms', methods=['POST'])
@require_pharmacy_access(pharmacy_id)
def send_sms(pharmacy_id):
    data = request.json
    debtor_ids = data.get('debtor_ids', [])
    ageing_buckets = data.get('ageing_buckets', ['d60', 'd90', 'd120', 'd150', 'd180'])
    
    # Get custom SMS template or use default
    sms_template = data.get('sms_template', None)
    
    # Get template variables
    template_vars = data.get('template_variables', {})
    
    # Get pharmacy info
    pharmacy = db.session.query(Pharmacy).filter_by(id=pharmacy_id).first()
    if not pharmacy:
        return jsonify({'error': 'Pharmacy not found'}), 404
    
    # Merge pharmacy data
    template_vars.setdefault('pharmacy_name', pharmacy.name)
    template_vars.setdefault('bank_name', pharmacy.bank_name or 'ABSA')
    template_vars.setdefault('account_number', pharmacy.banking_account or '4090014954')
    
    # Get SMS Portal token
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
            errors.append({
                'debtor_id': debtor.id,
                'error': 'No phone number'
            })
            continue
        
        # Calculate arrears
        arrears_60_plus = sum([
            float(getattr(debtor, bucket)) for bucket in ageing_buckets
        ])
        
        # Prepare debtor-specific variables
        debtor_vars = {
            **template_vars,
            'name': debtor.name,
            'acc_no': debtor.acc_no,
            'amount': f"{arrears_60_plus:,.2f}",
        }
        
        # Render message (use custom or default)
        if sms_template:
            message = render_template_string(sms_template, **debtor_vars)
        else:
            # Default template
            message = f"Hi {debtor.name}, your {pharmacy.name} account is overdue (60+ days): R{arrears_60_plus:,.2f}. EFT {pharmacy.bank_name} {pharmacy.banking_account}. Ref {debtor.acc_no}. Thanks!"
        
        # Ensure message doesn't exceed SMS limit (160 chars recommended)
        if len(message) > 160:
            message = message[:157] + "..."
        
        try:
            # Send via SMS Portal
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
            # Log failed communication
            log = CommunicationLog(
                pharmacy_id=pharmacy_id,
                debtor_id=debtor.id,
                communication_type='sms',
                recipient=debtor.phone,
                message=message,
                status='failed',
                error_message=str(e)
            )
            db.session.add(log)
            
            errors.append({
                'debtor_id': debtor.id,
                'error': str(e)
            })
    
    db.session.commit()
    
    return jsonify({
        'sent': sent,
        'errors': errors
    })
```

---

## Frontend Implementation

### Message Template Configuration Component

```javascript
// components/MessageTemplateConfig.jsx
import React, { useState } from 'react';

const MessageTemplateConfig = ({ onSave, defaultTemplates }) => {
  const [emailTemplate, setEmailTemplate] = useState({
    subject: defaultTemplates?.email?.subject || 'Reminder: Account Overdue at {pharmacy_name}',
    html_body: defaultTemplates?.email?.html_body || '',
  });
  
  const [smsTemplate, setSmsTemplate] = useState(
    defaultTemplates?.sms || 'Hi {name}, your {pharmacy_name} account {acc_no} is overdue: R{amount}. EFT {bank_name} {account_number}. Ref {acc_no}. Thanks!'
  );
  
  const [templateVars, setTemplateVars] = useState({
    pharmacy_name: defaultTemplates?.vars?.pharmacy_name || '',
    bank_name: defaultTemplates?.vars?.bank_name || '',
    account_number: defaultTemplates?.vars?.account_number || '',
    pharmacy_email: defaultTemplates?.vars?.pharmacy_email || '',
    pharmacy_phone: defaultTemplates?.vars?.pharmacy_phone || '',
  });

  const handleSave = () => {
    onSave({
      email: emailTemplate,
      sms: smsTemplate,
      vars: templateVars,
    });
  };

  return (
    <div className="message-template-config">
      <h3>Message Templates</h3>
      
      {/* Email Template */}
      <div className="template-section">
        <h4>Email Template</h4>
        
        <div className="form-group">
          <label>Subject:</label>
          <input
            type="text"
            value={emailTemplate.subject}
            onChange={(e) => setEmailTemplate({...emailTemplate, subject: e.target.value})}
            placeholder="Reminder: Account Overdue at {pharmacy_name}"
          />
        </div>
        
        <div className="form-group">
          <label>HTML Body:</label>
          <textarea
            rows={10}
            value={emailTemplate.html_body}
            onChange={(e) => setEmailTemplate({...emailTemplate, html_body: e.target.value})}
            placeholder="<p>Dear {name},</p><p>Your account {acc_no} is overdue...</p>"
          />
        </div>
      </div>
      
      {/* SMS Template */}
      <div className="template-section">
        <h4>SMS Template</h4>
        <div className="form-group">
          <label>Message:</label>
          <textarea
            rows={3}
            value={smsTemplate}
            onChange={(e) => setSmsTemplate(e.target.value)}
            placeholder="Hi {name}, your account is overdue..."
            maxLength={160}
          />
          <div className="char-count">{smsTemplate.length}/160 characters</div>
        </div>
      </div>
      
      {/* Template Variables */}
      <div className="template-section">
        <h4>Template Variables</h4>
        <div className="form-group">
          <label>Pharmacy Name:</label>
          <input
            type="text"
            value={templateVars.pharmacy_name}
            onChange={(e) => setTemplateVars({...templateVars, pharmacy_name: e.target.value})}
          />
        </div>
        <div className="form-group">
          <label>Bank Name:</label>
          <input
            type="text"
            value={templateVars.bank_name}
            onChange={(e) => setTemplateVars({...templateVars, bank_name: e.target.value})}
          />
        </div>
        <div className="form-group">
          <label>Account Number:</label>
          <input
            type="text"
            value={templateVars.account_number}
            onChange={(e) => setTemplateVars({...templateVars, account_number: e.target.value})}
          />
        </div>
        <div className="form-group">
          <label>Pharmacy Email:</label>
          <input
            type="email"
            value={templateVars.pharmacy_email}
            onChange={(e) => setTemplateVars({...templateVars, pharmacy_email: e.target.value})}
          />
        </div>
        <div className="form-group">
          <label>Pharmacy Phone:</label>
          <input
            type="text"
            value={templateVars.pharmacy_phone}
            onChange={(e) => setTemplateVars({...templateVars, pharmacy_phone: e.target.value})}
          />
        </div>
      </div>
      
      {/* Available Variables */}
      <div className="template-section">
        <h4>Available Variables</h4>
        <div className="variables-list">
          <div><code>{'{name}'}</code> - Customer name</div>
          <div><code>{'{acc_no}'}</code> - Account number</div>
          <div><code>{'{amount}'}</code> - Outstanding amount (formatted)</div>
          <div><code>{'{arrears_amount}'}</code> - Arrears amount (formatted)</div>
          <div><code>{'{pharmacy_name}'}</code> - Pharmacy name</div>
          <div><code>{'{bank_name}'}</code> - Bank name</div>
          <div><code>{'{account_number}'}</code> - Bank account number</div>
          <div><code>{'{pharmacy_email}'}</code> - Pharmacy contact email</div>
          <div><code>{'{pharmacy_phone}'}</code> - Pharmacy contact phone</div>
        </div>
      </div>
      
      <button onClick={handleSave}>Save Templates</button>
    </div>
  );
};

export default MessageTemplateConfig;
```

---

### Updated Communication Service

```javascript
// services/communicationService.js

class CommunicationService {
  /**
   * Send emails with custom template
   */
  async sendEmail(debtorIds, ageingBuckets, emailTemplate, templateVars) {
    const pharmacyId = this.getPharmacyId();
    
    const requestBody = {
      debtor_ids: debtorIds,
      ageing_buckets: ageingBuckets,
    };
    
    // Add custom template if provided
    if (emailTemplate) {
      requestBody.email_template = {
        subject: emailTemplate.subject,
        html_body: emailTemplate.html_body,
      };
    }
    
    // Add template variables if provided
    if (templateVars) {
      requestBody.template_variables = templateVars;
    }
    
    const response = await fetch(
      `${this.baseURL}/api/pharmacies/${pharmacyId}/debtors/send-email`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Send SMS with custom template
   */
  async sendSMS(debtorIds, ageingBuckets, smsTemplate, templateVars) {
    const pharmacyId = this.getPharmacyId();
    
    const requestBody = {
      debtor_ids: debtorIds,
      ageing_buckets: ageingBuckets,
    };
    
    // Add custom template if provided
    if (smsTemplate) {
      requestBody.sms_template = smsTemplate;
    }
    
    // Add template variables if provided
    if (templateVars) {
      requestBody.template_variables = templateVars;
    }
    
    const response = await fetch(
      `${this.baseURL}/api/pharmacies/${pharmacyId}/debtors/send-sms`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  }
}
```

---

### Updated Communication Panel

```javascript
// components/CommunicationPanel.jsx
import React, { useState } from 'react';
import { communicationService } from '../services/communicationService';
import MessageTemplateConfig from './MessageTemplateConfig';

const CommunicationPanel = ({ selectedDebtors, ageingBuckets }) => {
  const [showTemplateConfig, setShowTemplateConfig] = useState(false);
  const [templates, setTemplates] = useState(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const handleSendEmail = async () => {
    if (selectedDebtors.length === 0) {
      alert('Please select at least one debtor');
      return;
    }

    setSending(true);
    setResult(null);

    try {
      const debtorIds = selectedDebtors.map(d => d.id);
      
      // Use custom templates if configured, otherwise use defaults
      const emailTemplate = templates?.email;
      const templateVars = templates?.vars;
      
      const response = await communicationService.sendEmail(
        debtorIds,
        ageingBuckets,
        emailTemplate,
        templateVars
      );

      setResult({
        type: 'email',
        sent: response.sent || [],
        errors: response.errors || [],
      });
    } catch (err) {
      setResult({
        type: 'email',
        error: err.message,
      });
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
      const debtorIds = selectedDebtors.map(d => d.id);
      
      // Use custom templates if configured
      const smsTemplate = templates?.sms;
      const templateVars = templates?.vars;
      
      const response = await communicationService.sendSMS(
        debtorIds,
        ageingBuckets,
        smsTemplate,
        templateVars
      );

      setResult({
        type: 'sms',
        sent: response.sent || [],
        errors: response.errors || [],
      });
    } catch (err) {
      setResult({
        type: 'sms',
        error: err.message,
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="communication-panel">
      <div className="panel-header">
        <h3>Send Communications</h3>
        <button onClick={() => setShowTemplateConfig(!showTemplateConfig)}>
          {showTemplateConfig ? 'Hide' : 'Configure'} Templates
        </button>
      </div>

      {showTemplateConfig && (
        <MessageTemplateConfig
          onSave={(savedTemplates) => {
            setTemplates(savedTemplates);
            setShowTemplateConfig(false);
          }}
          defaultTemplates={templates}
        />
      )}

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

      {result && (
        <div className="result-message">
          {result.error ? (
            <div className="error">Error: {result.error}</div>
          ) : (
            <>
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
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default CommunicationPanel;
```

---

## Default Templates

### Default Email Template

```html
<p>Dear {name},</p>
<p>We hope you're well. This is a reminder that your account at <b>{pharmacy_name}</b> 
shows an outstanding balance of <b>R{amount}</b>, which has been overdue for more than 60 days.</p>
<p>We kindly request that payment be made at your earliest convenience using the EFT details below:</p>
<hr>
<p>
<b>Banking Details:</b><br>
Bank: {bank_name}<br>
Account Number: {account_number}<br>
Reference: {acc_no}
</p>
<hr>
<p>If you've already made this payment or require a statement, please feel free to contact us.</p>
<p>Thank you for your continued support.</p>
<p style='margin-top:24px;'>
Warm regards,<br>
<b>{pharmacy_name} Team</b><br>
<a href='mailto:{pharmacy_email}'>{pharmacy_email}</a><br>
{pharmacy_phone}
</p>
```

### Default SMS Template

```
Hi {name}, your {pharmacy_name} account is overdue (60+ days): R{amount}. EFT {bank_name} {account_number}. Ref {acc_no}. Thanks!
```

---

## Template Variables

### Available Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `{name}` | Customer name | "John Doe" |
| `{acc_no}` | Account number | "123456" |
| `{amount}` | Outstanding amount (formatted) | "1,234.56" |
| `{arrears_amount}` | Arrears amount (formatted) | "1,234.56" |
| `{pharmacy_name}` | Pharmacy name | "Reitz Apteek" |
| `{bank_name}` | Bank name | "ABSA" |
| `{account_number}` | Bank account number | "409 0014 954" |
| `{pharmacy_email}` | Pharmacy contact email | "info@pharmacy.com" |
| `{pharmacy_phone}` | Pharmacy contact phone | "058 863 2801" |

---

## Usage Examples

### Example 1: Simple Custom Email

```javascript
const emailTemplate = {
  subject: "Payment Reminder - {pharmacy_name}",
  html_body: `
    <p>Hello {name},</p>
    <p>Your account {acc_no} has an outstanding balance of R{amount}.</p>
    <p>Please pay to {bank_name} account {account_number}.</p>
    <p>Thank you!</p>
  `
};

await communicationService.sendEmail(
  [1, 2, 3],
  ['d60', 'd90'],
  emailTemplate,
  {
    pharmacy_name: "My Pharmacy",
    bank_name: "ABSA",
    account_number: "123456789"
  }
);
```

### Example 2: Custom SMS

```javascript
const smsTemplate = "Hi {name}, please pay R{amount} for account {acc_no}. Bank: {bank_name} {account_number}";

await communicationService.sendSMS(
  [1, 2, 3],
  ['d60', 'd90'],
  smsTemplate,
  {
    pharmacy_name: "My Pharmacy",
    bank_name: "ABSA",
    account_number: "123456789"
  }
);
```

### Example 3: Using Default Templates

```javascript
// Don't pass templates - backend uses defaults
await communicationService.sendEmail([1, 2, 3], ['d60', 'd90']);
await communicationService.sendSMS([1, 2, 3], ['d60', 'd90']);
```

---

## Template Storage

### Option 1: Store in Frontend State

```javascript
// Store templates in component state or global state
const [templates, setTemplates] = useState({
  email: { subject: '...', html_body: '...' },
  sms: '...',
  vars: { pharmacy_name: '...', ... }
});
```

### Option 2: Store in LocalStorage

```javascript
// Save templates
localStorage.setItem('message_templates', JSON.stringify(templates));

// Load templates
const templates = JSON.parse(localStorage.getItem('message_templates') || '{}');
```

### Option 3: Store in Database (Recommended)

Create an API endpoint to save/load templates per pharmacy:

```javascript
// Save templates
await fetch(`/api/pharmacies/${pharmacyId}/message-templates`, {
  method: 'POST',
  body: JSON.stringify(templates)
});

// Load templates
const response = await fetch(`/api/pharmacies/${pharmacyId}/message-templates`);
const templates = await response.json();
```

---

## Template Validation

### Email Template Validation

```javascript
function validateEmailTemplate(template) {
  const errors = [];
  
  if (!template.subject || !template.subject.trim()) {
    errors.push('Subject is required');
  }
  
  if (!template.html_body || !template.html_body.trim()) {
    errors.push('HTML body is required');
  }
  
  // Check for required variables
  const requiredVars = ['name', 'acc_no', 'amount'];
  requiredVars.forEach(varName => {
    if (!template.html_body.includes(`{${varName}}`) && 
        !template.subject.includes(`{${varName}}`)) {
      errors.push(`Template should include {${varName}} variable`);
    }
  });
  
  return errors;
}
```

### SMS Template Validation

```javascript
function validateSMSTemplate(template) {
  const errors = [];
  
  if (!template || !template.trim()) {
    errors.push('SMS template is required');
  }
  
  if (template.length > 160) {
    errors.push('SMS template must be 160 characters or less');
  }
  
  // Check for required variables
  const requiredVars = ['name', 'amount'];
  requiredVars.forEach(varName => {
    if (!template.includes(`{${varName}}`)) {
      errors.push(`Template should include {${varName}} variable`);
    }
  });
  
  return errors;
}
```

---

## Preview Functionality

### Preview Email Template

```javascript
function previewEmailTemplate(template, vars, sampleDebtor) {
  const previewVars = {
    ...vars,
    name: sampleDebtor.name || 'John Doe',
    acc_no: sampleDebtor.acc_no || '123456',
    amount: '1,234.56',
    arrears_amount: '1,234.56',
  };
  
  return {
    subject: template.subject.replace(/\{(\w+)\}/g, (match, key) => previewVars[key] || match),
    html_body: template.html_body.replace(/\{(\w+)\}/g, (match, key) => previewVars[key] || match),
  };
}
```

### Preview SMS Template

```javascript
function previewSMSTemplate(template, vars, sampleDebtor) {
  const previewVars = {
    ...vars,
    name: sampleDebtor.name || 'John Doe',
    acc_no: sampleDebtor.acc_no || '123456',
    amount: '1,234.56',
  };
  
  return template.replace(/\{(\w+)\}/g, (match, key) => previewVars[key] || match);
}
```

---

## Best Practices

1. **Always validate templates** before sending
2. **Preview templates** with sample data before sending
3. **Store templates** per pharmacy for consistency
4. **Provide default templates** for quick setup
5. **Limit SMS length** to 160 characters
6. **Escape HTML** in email templates to prevent XSS
7. **Test templates** with sample data before production use
8. **Document available variables** for users

---

## Security Considerations

1. **Sanitize HTML** in email templates to prevent XSS
2. **Validate template variables** before rendering
3. **Limit template length** to prevent abuse
4. **Rate limit** template updates
5. **Audit log** template changes

---

This implementation allows full customization of email and SMS messages from the frontend while maintaining security and flexibility.

