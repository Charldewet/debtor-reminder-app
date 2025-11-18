# Backend Implementation Guide - Debtor Reminder System

## Overview

This guide provides complete backend implementation details for integrating the debtor reminder system into your existing application with multi-pharmacy support.

---

## Prerequisites

- Existing database connection
- Python 3.11+
- Flask framework
- Database ORM (SQLAlchemy recommended)
- Authentication system integration

---

## Dependencies

```python
flask==3.1.1
flask-cors==6.0.1
pandas==2.3.1
pymupdf==1.26.3
python-dotenv==1.0.1
fpdf==1.7.2
sendgrid==6.11.0
requests==2.32.4
cryptography==41.0.0  # For encrypting API keys (only if using per-pharmacy credentials)
```

---

## Credentials Configuration

**Important:** You can use shared credentials for all pharmacies (recommended) or per-pharmacy credentials. See `CREDENTIALS_CONFIGURATION.md` for details.

**Shared Credentials (Recommended):**
- Store SendGrid and SMS Portal credentials as environment variables
- All pharmacies use the same account
- Simpler setup and management

**Environment Variables:**
```env
SENDGRID_API_KEY=your_sendgrid_api_key
SMSPORTAL_CLIENT_ID=your_client_id
SMSPORTAL_API_SECRET=your_api_secret
```

---

## Database Models

### SQLAlchemy Models

```python
from sqlalchemy import Column, Integer, String, Decimal, Boolean, DateTime, Enum, Text, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

Base = declarative_base()

class Pharmacy(Base):
    __tablename__ = 'pharmacies'
    
    id = Column(String(50), primary_key=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255))  # Used as "from" email address
    phone = Column(String(20))
    banking_account = Column(String(50))
    bank_name = Column(String(100))
    # Optional: Per-pharmacy credentials (if using Option B)
    # If NULL, system uses shared environment variables
    sendgrid_api_key = Column(String(255), nullable=True)  # Encrypted, optional
    smsportal_client_id = Column(String(255), nullable=True)  # Encrypted, optional
    smsportal_api_secret = Column(String(255), nullable=True)  # Encrypted, optional
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
    # Relationships
    reports = relationship("DebtorReport", back_populates="pharmacy")
    debtors = relationship("Debtor", back_populates="pharmacy")
    communications = relationship("CommunicationLog", back_populates="pharmacy")

class DebtorReport(Base):
    __tablename__ = 'debtor_reports'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    pharmacy_id = Column(String(50), ForeignKey('pharmacies.id'), nullable=False)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500))
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    uploaded_by = Column(String(100))
    total_accounts = Column(Integer, default=0)
    total_outstanding = Column(Decimal(15, 2), default=0.00)
    status = Column(Enum('processing', 'completed', 'failed'), default='processing')
    error_message = Column(Text)
    
    # Relationships
    pharmacy = relationship("Pharmacy", back_populates="reports")
    debtors = relationship("Debtor", back_populates="report")

class Debtor(Base):
    __tablename__ = 'debtors'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    pharmacy_id = Column(String(50), ForeignKey('pharmacies.id'), nullable=False)
    report_id = Column(Integer, ForeignKey('debtor_reports.id'), nullable=True)
    acc_no = Column(String(20), nullable=False)
    name = Column(String(255), nullable=False)
    current = Column(Decimal(15, 2), default=0.00)
    d30 = Column(Decimal(15, 2), default=0.00)
    d60 = Column(Decimal(15, 2), default=0.00)
    d90 = Column(Decimal(15, 2), default=0.00)
    d120 = Column(Decimal(15, 2), default=0.00)
    d150 = Column(Decimal(15, 2), default=0.00)
    d180 = Column(Decimal(15, 2), default=0.00)
    balance = Column(Decimal(15, 2), default=0.00)
    email = Column(String(255))
    phone = Column(String(20))
    is_medical_aid_control = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    pharmacy = relationship("Pharmacy", back_populates="debtors")
    report = relationship("DebtorReport", back_populates="debtors")
    communications = relationship("CommunicationLog", back_populates="debtor")

class CommunicationLog(Base):
    __tablename__ = 'communication_logs'
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    pharmacy_id = Column(String(50), ForeignKey('pharmacies.id'), nullable=False)
    debtor_id = Column(Integer, ForeignKey('debtors.id'), nullable=False)
    communication_type = Column(Enum('email', 'sms'), nullable=False)
    recipient = Column(String(255), nullable=False)
    subject = Column(String(255))
    message = Column(Text, nullable=False)
    status = Column(Enum('pending', 'sent', 'failed'), default='pending')
    external_id = Column(String(255))
    error_message = Column(Text)
    sent_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    pharmacy = relationship("Pharmacy", back_populates="communications")
    debtor = relationship("Debtor", back_populates="communications")
```

---

## API Endpoints

### Base URL Structure

All endpoints require `pharmacy_id` parameter (from authenticated user context or query parameter).

---

### 1. Upload PDF Report

**POST** `/api/pharmacies/{pharmacy_id}/debtors/upload`

**Request:**
- Content-Type: `multipart/form-data`
- Body: FormData with `file` field

**Response:**
```json
{
  "report_id": 123,
  "total_accounts": 150,
  "total_outstanding": 125000.50,
  "debtors": [
    {
      "id": 1,
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
      "phone": "0821234567",
      "is_medical_aid_control": false
    }
  ]
}
```

**Implementation:**
```python
@app.route('/api/pharmacies/<pharmacy_id>/debtors/upload', methods=['POST'])
@require_pharmacy_access(pharmacy_id)  # Your auth decorator
def upload_debtor_report(pharmacy_id):
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    # Verify pharmacy exists
    pharmacy = db.session.query(Pharmacy).filter_by(id=pharmacy_id).first()
    if not pharmacy:
        return jsonify({'error': 'Pharmacy not found'}), 404
    
    try:
        # Save file temporarily
        filename = secure_filename(file.filename)
        file_path = os.path.join(UPLOAD_FOLDER, f"{pharmacy_id}_{filename}")
        file.save(file_path)
        
        # Parse PDF
        df = extract_debtors_strictest_names(file_path)
        
        # Create report record
        report = DebtorReport(
            pharmacy_id=pharmacy_id,
            filename=filename,
            file_path=file_path,
            uploaded_by=current_user.id,  # From your auth system
            status='processing'
        )
        db.session.add(report)
        db.session.flush()
        
        # Process and save debtors
        total_outstanding = 0
        debtors_data = []
        
        for _, row in df.iterrows():
            # Check if medical aid account
            is_medical_aid = is_medical_aid_control_account(row['name'])
            
            # Check if debtor already exists (update or create)
            debtor = db.session.query(Debtor).filter_by(
                pharmacy_id=pharmacy_id,
                acc_no=str(row['acc_no'])
            ).first()
            
            if debtor:
                # Update existing debtor
                debtor.name = row['name']
                debtor.current = float(row['current'])
                debtor.d30 = float(row['d30'])
                debtor.d60 = float(row['d60'])
                debtor.d90 = float(row['d90'])
                debtor.d120 = float(row['d120'])
                debtor.d150 = float(row['d150'])
                debtor.d180 = float(row['d180'])
                debtor.balance = float(row['balance'])
                debtor.email = row.get('email', '')
                debtor.phone = row.get('phone', '')
                debtor.is_medical_aid_control = is_medical_aid
                debtor.report_id = report.id
            else:
                # Create new debtor
                debtor = Debtor(
                    pharmacy_id=pharmacy_id,
                    report_id=report.id,
                    acc_no=str(row['acc_no']),
                    name=row['name'],
                    current=float(row['current']),
                    d30=float(row['d30']),
                    d60=float(row['d60']),
                    d90=float(row['d90']),
                    d120=float(row['d120']),
                    d150=float(row['d150']),
                    d180=float(row['d180']),
                    balance=float(row['balance']),
                    email=row.get('email', ''),
                    phone=row.get('phone', ''),
                    is_medical_aid_control=is_medical_aid
                )
                db.session.add(debtor)
            
            if not is_medical_aid:
                total_outstanding += float(row['balance'])
            
            debtors_data.append({
                'id': debtor.id,
                'acc_no': debtor.acc_no,
                'name': debtor.name,
                'current': float(debtor.current),
                'd30': float(debtor.d30),
                'd60': float(debtor.d60),
                'd90': float(debtor.d90),
                'd120': float(debtor.d120),
                'd150': float(debtor.d150),
                'd180': float(debtor.d180),
                'balance': float(debtor.balance),
                'email': debtor.email or '',
                'phone': debtor.phone or '',
                'is_medical_aid_control': debtor.is_medical_aid_control
            })
        
        # Update report
        report.total_accounts = len([d for d in debtors_data if not d['is_medical_aid_control']])
        report.total_outstanding = total_outstanding
        report.status = 'completed'
        
        db.session.commit()
        
        # Clean up temp file
        os.remove(file_path)
        
        return jsonify({
            'report_id': report.id,
            'total_accounts': report.total_accounts,
            'total_outstanding': float(report.total_outstanding),
            'debtors': debtors_data
        }), 200
        
    except Exception as e:
        db.session.rollback()
        if 'report' in locals():
            report.status = 'failed'
            report.error_message = str(e)
            db.session.commit()
        return jsonify({'error': str(e)}), 500
```

---

### 2. Get Debtors List

**GET** `/api/pharmacies/{pharmacy_id}/debtors`

**Query Parameters:**
- `min_balance` (float): Minimum balance for 60+ day arrears
- `ageing_buckets` (string): Comma-separated list (e.g., "d60,d90,d120")
- `has_email` (boolean): Filter by email availability
- `has_phone` (boolean): Filter by phone availability
- `search` (string): Search term
- `exclude_medical_aid` (boolean): Default true
- `page` (int): Page number (default 1)
- `per_page` (int): Items per page (default 100)

**Response:**
```json
{
  "total": 150,
  "page": 1,
  "per_page": 100,
  "pages": 2,
  "debtors": [...]
}
```

**Implementation:**
```python
@app.route('/api/pharmacies/<pharmacy_id>/debtors', methods=['GET'])
@require_pharmacy_access(pharmacy_id)
def get_debtors(pharmacy_id):
    query = db.session.query(Debtor).filter_by(pharmacy_id=pharmacy_id)
    
    # Always exclude medical aid accounts by default
    exclude_medical_aid = request.args.get('exclude_medical_aid', 'true').lower() == 'true'
    if exclude_medical_aid:
        query = query.filter_by(is_medical_aid_control=False)
    
    # Balance filter
    min_balance = request.args.get('min_balance', type=float)
    if min_balance:
        query = query.filter(
            (Debtor.d60 + Debtor.d90 + Debtor.d120 + 
             Debtor.d150 + Debtor.d180) > min_balance
        )
    
    # Ageing bucket filter
    ageing_buckets = request.args.get('ageing_buckets', '').split(',')
    if ageing_buckets and ageing_buckets[0]:
        conditions = []
        for bucket in ageing_buckets:
            if hasattr(Debtor, bucket):
                conditions.append(getattr(Debtor, bucket) > 0)
        if conditions:
            from sqlalchemy import or_
            query = query.filter(or_(*conditions))
    
    # Contact filters
    if request.args.get('has_email') == 'true':
        query = query.filter(Debtor.email.isnot(None)).filter(Debtor.email != '')
    if request.args.get('has_phone') == 'true':
        query = query.filter(Debtor.phone.isnot(None)).filter(Debtor.phone != '')
    
    # Search
    search = request.args.get('search', '')
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                Debtor.acc_no.like(search_term),
                Debtor.name.like(search_term),
                Debtor.email.like(search_term),
                Debtor.phone.like(search_term)
            )
        )
    
    # Pagination
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 100, type=int)
    
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    
    debtors = [debtor_to_dict(d) for d in pagination.items]
    
    return jsonify({
        'total': pagination.total,
        'page': page,
        'per_page': per_page,
        'pages': pagination.pages,
        'debtors': debtors
    })
```

---

### 3. Get Statistics

**GET** `/api/pharmacies/{pharmacy_id}/debtors/statistics`

**Response:**
```json
{
  "total_accounts": 150,
  "total_outstanding": 125000.50,
  "current": 50000.00,
  "d30": 30000.00,
  "d60": 25000.00,
  "d90": 15000.00,
  "d120": 5000.00,
  "d150": 0.00,
  "d180": 0.00
}
```

**Implementation:**
```python
@app.route('/api/pharmacies/<pharmacy_id>/debtors/statistics', methods=['GET'])
@require_pharmacy_access(pharmacy_id)
def get_statistics(pharmacy_id):
    query = db.session.query(Debtor).filter_by(
        pharmacy_id=pharmacy_id,
        is_medical_aid_control=False
    )
    
    stats = {
        'total_accounts': query.count(),
        'total_outstanding': float(query.with_entities(func.sum(Debtor.balance)).scalar() or 0),
        'current': float(query.with_entities(func.sum(Debtor.current)).scalar() or 0),
        'd30': float(query.with_entities(func.sum(Debtor.d30)).scalar() or 0),
        'd60': float(query.with_entities(func.sum(Debtor.d60)).scalar() or 0),
        'd90': float(query.with_entities(func.sum(Debtor.d90)).scalar() or 0),
        'd120': float(query.with_entities(func.sum(Debtor.d120)).scalar() or 0),
        'd150': float(query.with_entities(func.sum(Debtor.d150)).scalar() or 0),
        'd180': float(query.with_entities(func.sum(Debtor.d180)).scalar() or 0)
    }
    
    return jsonify(stats)
```

---

### 4. Send Email

**POST** `/api/pharmacies/{pharmacy_id}/debtors/send-email`

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
  "sent": [
    {
      "debtor_id": 1,
      "email": "john@example.com",
      "status": "sent",
      "external_id": "sg_123"
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

**Implementation:**
```python
@app.route('/api/pharmacies/<pharmacy_id>/debtors/send-email', methods=['POST'])
@require_pharmacy_access(pharmacy_id)
def send_email(pharmacy_id):
    data = request.json
    debtor_ids = data.get('debtor_ids', [])
    ageing_buckets = data.get('ageing_buckets', ['d60', 'd90', 'd120', 'd150', 'd180'])
    
    pharmacy = db.session.query(Pharmacy).filter_by(id=pharmacy_id).first()
    if not pharmacy:
        return jsonify({'error': 'Pharmacy not found'}), 404
    
    # Get debtors
    debtors = db.session.query(Debtor).filter(
        Debtor.pharmacy_id == pharmacy_id,
        Debtor.id.in_(debtor_ids),
        Debtor.is_medical_aid_control == False
    ).all()
    
    sent = []
    errors = []
    
    # Get SendGrid API key (pharmacy-specific or shared)
    api_key = (
        decrypt_api_key(pharmacy.sendgrid_api_key) if pharmacy.sendgrid_api_key
        else os.environ.get('SENDGRID_API_KEY')
    )
    
    for debtor in debtors:
        if not debtor.email:
            errors.append({
                'debtor_id': debtor.id,
                'error': 'No email address'
            })
            continue
        
        # Calculate arrears for selected buckets
        arrears_60_plus = sum([
            float(getattr(debtor, bucket)) for bucket in ageing_buckets
        ])
        
        # Create email content
        subject = "Reminder: Account Overdue at " + pharmacy.name
        html_content = create_email_template(debtor, pharmacy, arrears_60_plus)
        
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
```

---

### 5. Send SMS

**POST** `/api/pharmacies/{pharmacy_id}/debtors/send-sms`

**Request:**
```json
{
  "debtor_ids": [1, 2, 3],
  "ageing_buckets": ["d60", "d90", "d120"],
  "sms_template": "Hi {name}, your {pharmacy_name} account {acc_no} is overdue: R{amount}",
  "template_variables": {
    "pharmacy_name": "Reitz Apteek",
    "bank_name": "ABSA",
    "account_number": "4090014954"
  }
}
```

**Response:**
```json
{
  "sent": [
    {
      "debtor_id": 1,
      "phone": "0821234567",
      "message": "Hi John Doe, your Reitz Apteek account...",
      "status": "sent"
    }
  ],
  "errors": []
}
```

**Implementation:**
```python
@app.route('/api/pharmacies/<pharmacy_id>/debtors/send-sms', methods=['POST'])
@require_pharmacy_access(pharmacy_id)
def send_sms(pharmacy_id):
    data = request.json
    debtor_ids = data.get('debtor_ids', [])
    ageing_buckets = data.get('ageing_buckets', ['d60', 'd90', 'd120', 'd150', 'd180'])
    
    # Get pharmacy info
    pharmacy = db.session.query(Pharmacy).filter_by(id=pharmacy_id).first()
    if not pharmacy:
        return jsonify({'error': 'Pharmacy not found'}), 404
    
    # Get SMS template
    sms_template = data.get('sms_template', None)
    template_vars = data.get('template_variables', {})
    template_vars.setdefault('pharmacy_name', pharmacy.name)
    template_vars.setdefault('bank_name', pharmacy.bank_name or 'ABSA')
    template_vars.setdefault('account_number', pharmacy.banking_account or '')
    
    # Get SMS Portal token (shared credentials from environment)
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
            errors.append({'debtor_id': debtor.id, 'error': 'No phone number'})
            continue
        
        # Calculate arrears
        arrears_60_plus = sum([
            float(getattr(debtor, bucket)) for bucket in ageing_buckets
        ])
        
        # Prepare variables
        debtor_vars = {
            **template_vars,
            'name': debtor.name,
            'acc_no': debtor.acc_no,
            'amount': f"{arrears_60_plus:,.2f}",
        }
        
        # Render message
        if sms_template:
            message = render_template_string(sms_template, **debtor_vars)
        else:
            message = f"Hi {debtor.name}, your {pharmacy.name} account is overdue (60+ days): R{arrears_60_plus:,.2f}. EFT {pharmacy.bank_name} {pharmacy.banking_account}. Ref {debtor.acc_no}. Thanks!"
        
        # Truncate if too long
        if len(message) > 160:
            message = message[:157] + "..."
        
        try:
            # Send SMS using shared credentials
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
            errors.append({'debtor_id': debtor.id, 'error': str(e)})
    
    db.session.commit()
    return jsonify({'sent': sent, 'errors': errors})
```

---

### 6. Download CSV

**POST** `/api/pharmacies/{pharmacy_id}/debtors/download-csv`

**Request:**
```json
{
  "debtor_ids": [1, 2, 3],
  "min_balance": 100
}
```

**Response:** CSV file download

---

### 7. Download PDF

**POST** `/api/pharmacies/{pharmacy_id}/debtors/download-pdf`

**Request:**
```json
{
  "debtor_ids": [1, 2, 3],
  "ageing_buckets": ["d60", "d90"],
  "col_names": {"d60": "60D", "d90": "90D"}
}
```

**Response:** PDF file download

---

## Helper Functions

### Medical Aid Detection

```python
def is_medical_aid_control_account(name):
    """Check if account name matches medical aid control patterns."""
    if not name:
        return False
    
    name_upper = name.upper().strip()
    patterns = [
        'MEDAID CONTROL ACC',
        'MEDICAL AID CONTROL',
        'MEDICAL AID CONTROL ACCOUNT',
        'MED AID CONTROL',
        'MEDAID CONTROL',
        'MEDICAL AID ACC'
    ]
    
    return any(pattern in name_upper for pattern in patterns)
```

### Debtor to Dict

```python
def debtor_to_dict(debtor):
    """Convert Debtor model to dictionary."""
    return {
        'id': debtor.id,
        'acc_no': debtor.acc_no,
        'name': debtor.name,
        'current': float(debtor.current),
        'd30': float(debtor.d30),
        'd60': float(debtor.d60),
        'd90': float(debtor.d90),
        'd120': float(debtor.d120),
        'd150': float(debtor.d150),
        'd180': float(debtor.d180),
        'balance': float(debtor.balance),
        'email': debtor.email or '',
        'phone': debtor.phone or '',
        'is_medical_aid_control': debtor.is_medical_aid_control
    }
```

### Shared Credentials Helper Functions

```python
import os
import sendgrid
from sendgrid.helpers.mail import Mail, Email, To, Content
import requests
import base64

# Shared credentials from environment variables
SENDGRID_API_KEY = os.environ.get('SENDGRID_API_KEY')
SMSPORTAL_CLIENT_ID = os.environ.get('SMSPORTAL_CLIENT_ID')
SMSPORTAL_API_SECRET = os.environ.get('SMSPORTAL_API_SECRET')

def get_smsportal_token():
    """Get OAuth2 token using shared SMS Portal credentials."""
    url = 'https://rest.smsportal.com/authentication'
    auth_str = f"{SMSPORTAL_CLIENT_ID}:{SMSPORTAL_API_SECRET}"
    b64_auth = base64.b64encode(auth_str.encode()).decode()
    
    headers = {
        'Authorization': f'Basic {b64_auth}',
        'Content-Type': 'application/x-www-form-urlencoded'
    }
    
    payload = {'grant_type': 'client_credentials'}
    response = requests.post(url, data=payload, headers=headers)
    response.raise_for_status()
    token_data = response.json()
    return token_data.get('access_token') or token_data.get('token')


def send_smsportal_sms(phone, message, token=None):
    """Send SMS using shared SMS Portal credentials."""
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


def send_email_via_sendgrid(to_email, subject, html_content, from_email=None, from_name=None):
    """
    Send email using shared SendGrid credentials.
    
    Args:
        to_email: Recipient email
        subject: Email subject
        html_content: HTML email content
        from_email: From email (uses pharmacy email if provided, else default)
        from_name: From name (uses pharmacy name if provided, else default)
    """
    sg = sendgrid.SendGridAPIClient(SENDGRID_API_KEY)
    
    # Use provided from_email or default
    from_addr = Email(
        from_email or 'no-reply@yourdomain.com',
        from_name or 'Debtor Reminder System'
    )
    
    to = To(to_email)
    mail = Mail(from_addr, to, subject, Content('text/html', html_content))
    response = sg.client.mail.send.post(request_body=mail.get())
    return response.status_code
```

### API Key Encryption (Only if using per-pharmacy credentials)

```python
from cryptography.fernet import Fernet

def encrypt_api_key(key, encryption_key):
    """Encrypt API key before storing."""
    f = Fernet(encryption_key)
    return f.encrypt(key.encode()).decode()

def decrypt_api_key(encrypted_key, encryption_key):
    """Decrypt API key when needed."""
    f = Fernet(encryption_key)
    return f.decrypt(encrypted_key.encode()).decode()
```

### Email Template

```python
def create_email_template(debtor, pharmacy, arrears_amount):
    """Create HTML email template."""
    return f"""
    <p>Dear {debtor.name},</p>
    <p>We hope you're well. This is a reminder that your account at <b>{pharmacy.name}</b> 
    shows an outstanding balance of <b>R{arrears_amount:,.2f}</b>, which has been overdue 
    for more than 60 days.</p>
    <p>We kindly request that payment be made at your earliest convenience using the EFT 
    details below:</p>
    <hr>
    <p>
    <b>Banking Details:</b><br>
    Bank: {pharmacy.bank_name}<br>
    Account Number: {pharmacy.banking_account}<br>
    Reference: {debtor.acc_no}
    </p>
    <hr>
    <p>If you've already made this payment or require a statement, please feel free to 
    contact us.</p>
    <p>Thank you for your continued support.</p>
    <p style='margin-top:24px;'>
    Warm regards,<br>
    <b>{pharmacy.name} Team</b><br>
    {pharmacy.email}<br>
    {pharmacy.phone}
    </p>
    """
```

---

## Authentication Integration

### Decorator Example

```python
from functools import wraps
from flask import request, jsonify

def require_pharmacy_access(pharmacy_id_param='pharmacy_id'):
    """Decorator to ensure user has access to pharmacy."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Get pharmacy_id from route or kwargs
            pharmacy_id = kwargs.get(pharmacy_id_param) or request.view_args.get(pharmacy_id_param)
            
            # Get current user from your auth system
            current_user = get_current_user()  # Your auth function
            
            # Check if user has access to this pharmacy
            if not has_pharmacy_access(current_user, pharmacy_id):  # Your permission check
                return jsonify({'error': 'Access denied'}), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator
```

---

## Error Handling

```python
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Resource not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    return jsonify({'error': 'Internal server error'}), 500

@app.errorhandler(Exception)
def handle_exception(e):
    return jsonify({'error': str(e)}), 500
```

---

## Testing

### Unit Test Example

```python
import unittest
from app import app, db
from models import Pharmacy, Debtor

class DebtorAPITestCase(unittest.TestCase):
    def setUp(self):
        self.app = app.test_client()
        self.pharmacy_id = 'test_pharmacy_123'
        # Set up test data
    
    def test_upload_debtor_report(self):
        with open('test_report.pdf', 'rb') as f:
            response = self.app.post(
                f'/api/pharmacies/{self.pharmacy_id}/debtors/upload',
                data={'file': f},
                content_type='multipart/form-data'
            )
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('debtors', data)
```

---

## Deployment Considerations

1. **Database Migrations**: Use Alembic or your migration tool
2. **Environment Variables**: Store sensitive config in environment
3. **File Storage**: Consider cloud storage (S3) for PDF files
4. **Rate Limiting**: Implement rate limiting on communication endpoints
5. **Caching**: Cache statistics for better performance
6. **Background Jobs**: Use Celery for async PDF processing

---

## Security Checklist

- [ ] Row-level security (always filter by pharmacy_id)
- [ ] API key encryption at rest
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (use ORM)
- [ ] File upload validation (type, size)
- [ ] Rate limiting on communication endpoints
- [ ] CORS configuration
- [ ] HTTPS in production
- [ ] Audit logging for sensitive operations

