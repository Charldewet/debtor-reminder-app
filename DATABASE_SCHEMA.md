# Database Schema - Debtor Reminder System

## Overview

This system integrates into your existing database with new tables to support multiple pharmacies. Each pharmacy has a unique pharmacy ID and manages their own debtor accounts.

---

## Tables

### 1. pharmacies

Stores pharmacy information.

```sql
CREATE TABLE pharmacies (
    id VARCHAR(50) PRIMARY KEY,           -- Unique pharmacy ID (e.g., UUID or custom ID)
    name VARCHAR(255) NOT NULL,            -- Pharmacy name
    email VARCHAR(255),                    -- Contact email
    phone VARCHAR(20),                     -- Contact phone
    banking_account VARCHAR(50),           -- Bank account number for EFT
    bank_name VARCHAR(100),                -- Bank name (e.g., "ABSA")
    sendgrid_api_key VARCHAR(255),        -- SendGrid API key (encrypted)
    smsportal_client_id VARCHAR(255),      -- SMS Portal client ID (encrypted)
    smsportal_api_secret VARCHAR(255),     -- SMS Portal API secret (encrypted)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);
```

**Indexes:**
```sql
CREATE INDEX idx_pharmacies_active ON pharmacies(is_active);
```

---

### 2. debtor_reports

Stores uploaded PDF reports metadata.

```sql
CREATE TABLE debtor_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pharmacy_id VARCHAR(50) NOT NULL,      -- Foreign key to pharmacies
    filename VARCHAR(255) NOT NULL,        -- Original filename
    file_path VARCHAR(500),                -- Server file path (if stored)
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    uploaded_by VARCHAR(100),              -- User ID who uploaded
    total_accounts INT DEFAULT 0,         -- Number of accounts in report
    total_outstanding DECIMAL(15,2) DEFAULT 0.00,  -- Total outstanding amount
    status ENUM('processing', 'completed', 'failed') DEFAULT 'processing',
    error_message TEXT,                   -- Error message if failed
    FOREIGN KEY (pharmacy_id) REFERENCES pharmacies(id) ON DELETE CASCADE,
    INDEX idx_pharmacy_uploaded (pharmacy_id, uploaded_at)
);
```

---

### 3. debtors

Stores individual debtor account information.

```sql
CREATE TABLE debtors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pharmacy_id VARCHAR(50) NOT NULL,      -- Foreign key to pharmacies
    report_id INT,                        -- Foreign key to debtor_reports (optional)
    acc_no VARCHAR(20) NOT NULL,          -- Account number (6 digits typically)
    name VARCHAR(255) NOT NULL,           -- Customer name
    current DECIMAL(15,2) DEFAULT 0.00,  -- Current balance
    d30 DECIMAL(15,2) DEFAULT 0.00,      -- 30 days overdue
    d60 DECIMAL(15,2) DEFAULT 0.00,       -- 60 days overdue
    d90 DECIMAL(15,2) DEFAULT 0.00,      -- 90 days overdue
    d120 DECIMAL(15,2) DEFAULT 0.00,      -- 120 days overdue
    d150 DECIMAL(15,2) DEFAULT 0.00,      -- 150 days overdue
    d180 DECIMAL(15,2) DEFAULT 0.00,      -- 180 days overdue
    balance DECIMAL(15,2) DEFAULT 0.00,   -- Total outstanding balance
    email VARCHAR(255),                   -- Email address
    phone VARCHAR(20),                    -- Phone number
    is_medical_aid_control BOOLEAN DEFAULT FALSE,  -- Flag for medical aid accounts
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (pharmacy_id) REFERENCES pharmacies(id) ON DELETE CASCADE,
    FOREIGN KEY (report_id) REFERENCES debtor_reports(id) ON DELETE SET NULL,
    UNIQUE KEY unique_pharmacy_account (pharmacy_id, acc_no),
    INDEX idx_pharmacy_acc (pharmacy_id, acc_no),
    INDEX idx_balance (pharmacy_id, balance),
    INDEX idx_medical_aid (pharmacy_id, is_medical_aid_control)
);
```

---

### 4. communication_logs

Stores communication history (emails and SMS).

```sql
CREATE TABLE communication_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pharmacy_id VARCHAR(50) NOT NULL,      -- Foreign key to pharmacies
    debtor_id INT NOT NULL,                -- Foreign key to debtors
    communication_type ENUM('email', 'sms') NOT NULL,
    recipient VARCHAR(255) NOT NULL,       -- Email or phone number
    subject VARCHAR(255),                  -- Email subject (NULL for SMS)
    message TEXT NOT NULL,                 -- Message content
    status ENUM('pending', 'sent', 'failed') DEFAULT 'pending',
    external_id VARCHAR(255),              -- External service ID (SendGrid/SMS Portal)
    error_message TEXT,                   -- Error message if failed
    sent_at TIMESTAMP NULL,               -- When actually sent
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pharmacy_id) REFERENCES pharmacies(id) ON DELETE CASCADE,
    FOREIGN KEY (debtor_id) REFERENCES debtors(id) ON DELETE CASCADE,
    INDEX idx_pharmacy_created (pharmacy_id, created_at),
    INDEX idx_debtor (debtor_id),
    INDEX idx_status (status)
);
```

---

## Database Relationships

```
pharmacies (1) ──< (many) debtor_reports
pharmacies (1) ──< (many) debtors
pharmacies (1) ──< (many) communication_logs
debtor_reports (1) ──< (many) debtors
debtors (1) ──< (many) communication_logs
```

---

## Sample Queries

### Get all debtors for a pharmacy (excluding medical aid)
```sql
SELECT * FROM debtors 
WHERE pharmacy_id = ? 
  AND is_medical_aid_control = FALSE
ORDER BY balance DESC;
```

### Get debtors with 60+ day arrears
```sql
SELECT * FROM debtors 
WHERE pharmacy_id = ? 
  AND is_medical_aid_control = FALSE
  AND (d60 + d90 + d120 + d150 + d180) > ?
ORDER BY balance DESC;
```

### Get communication history for a debtor
```sql
SELECT * FROM communication_logs 
WHERE debtor_id = ? 
ORDER BY created_at DESC;
```

### Get pharmacy statistics
```sql
SELECT 
    COUNT(*) as total_accounts,
    SUM(balance) as total_outstanding,
    SUM(current) as total_current,
    SUM(d30) as total_d30,
    SUM(d60) as total_d60,
    SUM(d90) as total_d90,
    SUM(d120) as total_d120,
    SUM(d150) as total_d150,
    SUM(d180) as total_d180
FROM debtors 
WHERE pharmacy_id = ? 
  AND is_medical_aid_control = FALSE;
```

---

## Migration Notes

1. **Add tables to existing database** - These tables can coexist with your existing schema
2. **Pharmacy ID Integration** - Use your existing pharmacy identification system
3. **User Authentication** - Link `uploaded_by` to your existing user system
4. **Encryption** - Encrypt sensitive fields (API keys) before storing
5. **Soft Deletes** - Consider adding `deleted_at` timestamp if you need soft deletes

---

## Security Considerations

1. **Row-Level Security**: Always filter by `pharmacy_id` in queries
2. **API Key Encryption**: Store encrypted API keys, decrypt when needed
3. **Access Control**: Ensure users can only access their pharmacy's data
4. **Audit Trail**: `created_at` and `updated_at` provide basic audit trail

