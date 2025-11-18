from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import pandas as pd
from werkzeug.utils import secure_filename
from debtor_parser_final import extract_debtors_strictest_names
import requests
from dotenv import load_dotenv
import base64
from fpdf import FPDF
import sendgrid
from sendgrid.helpers.mail import Mail, Email, To, Content

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))

app = Flask(__name__)
CORS(app, supports_credentials=True)
UPLOAD_FOLDER = 'backend_api/uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def get_smsportal_token():
    url = 'https://rest.smsportal.com/authentication'
    client_id = os.environ.get('SMSPORTAL_CLIENT_ID')
    client_secret = os.environ.get('SMSPORTAL_API_SECRET')
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

def render_template_string(template, **kwargs):
    """Simple template rendering using string format. Supports {variable} placeholders."""
    if not template:
        return ""
    try:
        return template.format(**kwargs)
    except KeyError as e:
        # If variable not found, leave placeholder as-is
        import re
        return re.sub(r'\{' + str(e.args[0]) + r'\}', f'{{{e.args[0]}}}', template)

def send_email_via_sendgrid(to_email, subject, html_content, from_email, from_name):
    """
    Send email using shared SendGrid credentials.
    
    Args:
        to_email: Recipient email
        subject: Email subject
        html_content: HTML email content
        from_email: From email (required)
        from_name: From name (required)
    """
    api_key = os.environ.get('SENDGRID_API_KEY')
    if not api_key:
        raise ValueError("SENDGRID_API_KEY not set in environment variables")
    
    if not from_email or not from_name:
        raise ValueError("from_email and from_name are required")
    
    sg = sendgrid.SendGridAPIClient(api_key)
    from_addr = Email(from_email, from_name)
    to = To(to_email)
    mail = Mail(from_addr, to, subject, Content('text/html', html_content))
    response = sg.client.mail.send.post(request_body=mail.get())
    return response.status_code

@app.route('/', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok', 'message': 'Debtor Reminder API is running', 'version': '1.0'}), 200

@app.route('/upload', methods=['POST'])
def upload_pdf():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    filename = secure_filename(file.filename)
    file_path = os.path.join(UPLOAD_FOLDER, filename)
    file.save(file_path)
    df = extract_debtors_strictest_names(file_path)
    os.remove(file_path)
    return df.to_json(orient='records')

@app.route('/download', methods=['POST'])
def download_csv():
    data = request.json
    df = pd.DataFrame(data['rows'])
    min_balance = data.get('min_balance', 100)
    filtered = df[(df['d60'] + df['d90'] + df['d120'] + df['d150'] + df['d180']) > min_balance]
    csv_path = os.path.join(UPLOAD_FOLDER, 'filtered_debtors.csv')
    filtered.to_csv(csv_path, index=False)
    return send_file(csv_path, as_attachment=True, download_name='filtered_debtors.csv')

@app.route('/download_filtered_table_pdf', methods=['POST'])
def download_filtered_table_pdf():
    data = request.json
    rows = data.get('rows', [])
    ageing_buckets = data.get('ageing_buckets', [])
    col_names = data.get('col_names', {})
    
    pdf = FPDF(orientation='L', unit='mm', format='A4')
    pdf.add_page()
    pdf.set_font('Arial', 'B', 12)
    pdf.cell(0, 6, 'Filtered Debtor Report', ln=True, align='C')
    pdf.ln(2)
    
    # Calculate column widths
    page_width = 297  # A4 landscape width in mm
    margin = 10
    available_width = page_width - (2 * margin)
    
    # Fixed widths for account, name, balance, email, phone
    account_width = 20  # mm for account number
    name_width = 30     # mm for name
    balance_width = 25  # mm for balance
    email_width = 50    # mm for email (even wider)
    phone_width = 25    # mm for phone
    
    # Calculate ageing bucket width (much narrower)
    ageing_width = 15  # mm per ageing bucket column (fixed narrow width)
    
    # Calculate total width used
    total_used_width = account_width + name_width + (len(ageing_buckets) * ageing_width) + balance_width + email_width + phone_width
    
    # Adjust if needed to fit page
    if total_used_width > available_width:
        # Reduce ageing width if too wide
        ageing_width = max(12, (available_width - (account_width + name_width + balance_width + email_width + phone_width)) / len(ageing_buckets))
    
    # Header row
    pdf.set_font('Arial', 'B', 7)
    col_x = margin
    
    # Account column
    pdf.set_xy(col_x, pdf.get_y())
    pdf.cell(account_width, 6, 'Account', border=1, align='C')
    col_x += account_width
    
    # Name column
    pdf.set_xy(col_x, pdf.get_y())
    pdf.cell(name_width, 6, 'Name', border=1, align='C')
    col_x += name_width
    
    # Ageing bucket columns
    for bucket in ageing_buckets:
        pdf.set_xy(col_x, pdf.get_y())
        pdf.cell(ageing_width, 6, col_names.get(bucket, bucket), border=1, align='C')
        col_x += ageing_width
    
    # Balance column
    pdf.set_xy(col_x, pdf.get_y())
    pdf.cell(balance_width, 6, 'Balance', border=1, align='C')
    col_x += balance_width
    
    # Email column
    pdf.set_xy(col_x, pdf.get_y())
    pdf.cell(email_width, 6, 'Email', border=1, align='C')
    col_x += email_width
    
    # Phone column
    pdf.set_xy(col_x, pdf.get_y())
    pdf.cell(phone_width, 6, 'Phone', border=1, align='C')
    
    # Data rows
    pdf.set_font('Arial', '', 6)
    for row in rows:
        pdf.ln()
        col_x = margin
        
        # Account
        pdf.set_xy(col_x, pdf.get_y())
        pdf.cell(account_width, 5, str(row.get('acc_no', '')), border=1, align='L')
        col_x += account_width
        
        # Name
        pdf.set_xy(col_x, pdf.get_y())
        name = str(row.get('name', ''))
        if len(name) > 25:
            name = name[:22] + '...'
        pdf.cell(name_width, 5, name, border=1, align='L')
        col_x += name_width
        
        # Ageing bucket values
        for bucket in ageing_buckets:
            pdf.set_xy(col_x, pdf.get_y())
            value = row.get(bucket, 0)
            pdf.cell(ageing_width, 5, f"R {value:,.2f}", border=1, align='R')
            col_x += ageing_width
        
        # Balance
        pdf.set_xy(col_x, pdf.get_y())
        balance = row.get('balance', 0)
        pdf.cell(balance_width, 5, f"R {balance:,.2f}", border=1, align='R')
        col_x += balance_width
        
        # Email
        pdf.set_xy(col_x, pdf.get_y())
        email = str(row.get('email', ''))
        if len(email) > 45:
            email = email[:42] + '...'
        pdf.cell(email_width, 5, email, border=1, align='L')
        col_x += email_width
        
        # Phone
        pdf.set_xy(col_x, pdf.get_y())
        phone = str(row.get('phone', ''))
        if len(phone) > 20:
            phone = phone[:17] + '...'
        pdf.cell(phone_width, 5, phone, border=1, align='L')
    
    pdf_output = os.path.join(UPLOAD_FOLDER, 'filtered_table.pdf')
    pdf.output(pdf_output)
    return send_file(pdf_output, as_attachment=True, download_name='filtered_debtor_table.pdf')

@app.route('/download_missing_contacts_pdf', methods=['POST'])
def download_missing_contacts_pdf():
    data = request.json
    rows = data.get('rows', [])
    # Filter for accounts missing either or both contact methods
    missing = [row for row in rows if not row.get('email') or not row.get('phone')]
    pdf = FPDF(orientation='L', unit='mm', format='A4')
    pdf.add_page()
    pdf.set_font('Arial', 'B', 14)
    pdf.cell(0, 10, 'Accounts Missing Contact Info', ln=True, align='C')
    pdf.set_font('Arial', '', 10)
    pdf.ln(4)
    col_widths = [30, 60, 90, 50]  # Adjusted widths for Account No, Name, Email, Phone
    headers = ['Account No', 'Name', 'Email', 'Phone']
    for i, header in enumerate(headers):
        pdf.cell(col_widths[i], 8, header, border=1, align='C')
    pdf.ln()
    for row in missing:
        pdf.cell(col_widths[0], 8, str(row.get('acc_no', '')), border=1)
        pdf.cell(col_widths[1], 8, str(row.get('name', '')), border=1)
        # Use multi_cell for email and phone to wrap text if needed
        x = pdf.get_x(); y = pdf.get_y()
        pdf.multi_cell(col_widths[2], 8, str(row.get('email', '')), border=1, align='L')
        pdf.set_xy(x + col_widths[2], y)
        pdf.multi_cell(col_widths[3], 8, str(row.get('phone', '')), border=1, align='L')
        # Move to next line for next row
        pdf.set_xy(10, y + 8)
    pdf_output = os.path.join(UPLOAD_FOLDER, 'missing_contacts.pdf')
    pdf.output(pdf_output)
    return send_file(pdf_output, as_attachment=True, download_name='missing_contacts.pdf')

@app.route('/send_email', methods=['POST'])
def send_email():
    """
    Send emails to selected debtors.
    
    Request body:
    {
        "accounts": [...],  // Array of debtor account objects
        "email_template": {  // Optional: Custom template
            "subject": "Reminder: Account Overdue at {pharmacy_name}",
            "html_body": "<p>Dear {name},...</p>"
        },
        "template_variables": {  // REQUIRED: Template variables (no hardcoded defaults)
            "pharmacy_name": "Your Pharmacy Name",        // Required
            "bank_name": "ABSA",                          // Required
            "account_number": "123 456 7890",            // Required
            "pharmacy_email": "info@pharmacy.com",       // Required
            "pharmacy_phone": "012 345 6789"             // Required
        }
    }
    """
    accounts = request.json.get('accounts', [])
    email_template = request.json.get('email_template', {})
    template_vars = request.json.get('template_variables', {})
    
    # Validate required template variables
    required_vars = ['pharmacy_name', 'bank_name', 'account_number', 'pharmacy_email', 'pharmacy_phone']
    missing_vars = [var for var in required_vars if not template_vars.get(var)]
    
    if missing_vars:
        return jsonify({
            'status': 'error',
            'error': f'Missing required template variables: {", ".join(missing_vars)}',
            'required_variables': required_vars
        }), 400
    
    sent = []
    errors = []
    
    for acc in accounts:
        email_addr = acc.get('email', '') or acc.get('Email', '')
        email_addr = email_addr.strip()
        
        if not email_addr:
            errors.append({'acc_no': acc.get('acc_no'), 'error': 'No email address'})
            continue
        
        # Calculate arrears (60+ days)
        arrears_60_plus = sum([acc.get(k, 0) for k in ['d60', 'd90', 'd120', 'd150', 'd180']])
        
        # Calculate total outstanding balance (all ageing buckets)
        total_balance = (
            acc.get('balance', 0) or 
            sum([acc.get(k, 0) for k in ['current', 'd30', 'd60', 'd90', 'd120', 'd150', 'd180']])
        )
        
        # Prepare debtor-specific variables
        debtor_vars = {
            **template_vars,
            'name': acc.get('name', 'Customer'),
            'acc_no': acc.get('acc_no', ''),
            'amount': f"{arrears_60_plus:,.2f}",
            'arrears_amount': f"{arrears_60_plus:,.2f}",
            'total_balance': f"{total_balance:,.2f}",
        }
        
        # Render subject and body (use custom template or default)
        if email_template.get('subject'):
            subject = render_template_string(email_template['subject'], **debtor_vars)
        else:
            # Default subject using pharmacy name from template_vars
            subject = f"Reminder: Account Overdue at {template_vars['pharmacy_name']}"
        
        if email_template.get('html_body'):
            html_msg = render_template_string(email_template['html_body'], **debtor_vars)
        else:
            # Default template
            html_msg = f"""
            <p>Dear {debtor_vars['name']},</p>
            <p>We hope you're well. This is a reminder that your account at <b>{template_vars['pharmacy_name']}</b> shows an outstanding balance of <b>R{arrears_60_plus:,.2f}</b>, which has been overdue for more than 60 days.</p>
            <p><b>Total balance (Total outstanding amount): R{debtor_vars['total_balance']}</b></p>
            <p>We kindly request that payment be made at your earliest convenience using the EFT details below:</p>
            <hr>
            <p>
            <b>Banking Details:</b><br>
            Bank: {template_vars['bank_name']}<br>
            Account Number: {template_vars['account_number']}<br>
            Reference: {debtor_vars['acc_no']}
            </p>
            <hr>
            <p>If you've already made this payment or require a statement, please feel free to contact us.</p>
            <p>Thank you for your continued support.</p>
            <p style='margin-top:24px;'>
            Warm regards,<br>
            <b>{template_vars['pharmacy_name']} Team</b><br>
            <a href='mailto:{template_vars['pharmacy_email']}'>{template_vars['pharmacy_email']}</a><br>
            {template_vars['pharmacy_phone']}
            </p>
            """
        
        try:
            # Use pharmacy email as "from" if available
            from_email = template_vars.get('pharmacy_email')
            from_name = template_vars.get('pharmacy_name')
            
            status = send_email_via_sendgrid(email_addr, subject, html_msg, from_email, from_name)
            sent.append({
                'acc_no': acc.get('acc_no'),
                'email': email_addr,
                'subject': subject,
                'status': status
            })
        except Exception as e:
            errors.append({
                'acc_no': acc.get('acc_no'),
                'email': email_addr,
                'error': str(e)
            })
    
    return jsonify({'status': 'ok', 'sent': sent, 'errors': errors})

@app.route('/send_sms', methods=['POST'])
def send_sms():
    """
    Send SMS to selected debtors.
    
    Request body:
    {
        "accounts": [...],  // Array of debtor account objects
        "sms_template": "Hi {name}, your {pharmacy_name} account {acc_no} is overdue: R{amount}",  // Optional
        "template_variables": {  // REQUIRED: Template variables (no hardcoded defaults)
            "pharmacy_name": "Your Pharmacy Name",  // Required
            "bank_name": "ABSA",                    // Required
            "account_number": "1234567890"          // Required
        }
    }
    """
    accounts = request.json.get('accounts', [])
    sms_template = request.json.get('sms_template', None)
    template_vars = request.json.get('template_variables', {})
    
    # Validate required template variables
    required_vars = ['pharmacy_name', 'bank_name', 'account_number']
    missing_vars = [var for var in required_vars if not template_vars.get(var)]
    
    if missing_vars:
        return jsonify({
            'status': 'error',
            'error': f'Missing required template variables: {", ".join(missing_vars)}',
            'required_variables': required_vars
        }), 400
    
    sent = []
    errors = []
    
    # Get SMS Portal token (shared credentials from environment)
    token = None
    try:
        token = get_smsportal_token()
    except Exception as e:
        print("Token error:", e)
        return jsonify({'status': 'error', 'error': f'Failed to get SMSPortal token: {str(e)}'}), 500
    
    for acc in accounts:
        phone = acc.get('phone', None)
        if not phone:
            errors.append({'acc_no': acc.get('acc_no'), 'error': 'No phone number'})
            continue
        
        # Calculate arrears (60+ days)
        arrears_60_plus = sum([acc.get(k, 0) for k in ['d60', 'd90', 'd120', 'd150', 'd180']])
        
        # Calculate total outstanding balance (all ageing buckets)
        total_balance = (
            acc.get('balance', 0) or 
            sum([acc.get(k, 0) for k in ['current', 'd30', 'd60', 'd90', 'd120', 'd150', 'd180']])
        )
        
        # Prepare debtor-specific variables
        debtor_vars = {
            **template_vars,
            'name': acc.get('name', 'Customer'),
            'acc_no': acc.get('acc_no', ''),
            'amount': f"{arrears_60_plus:,.2f}",
            'total_balance': f"{total_balance:,.2f}",
        }
        
        # Render message (use custom template or default)
        if sms_template:
            msg = render_template_string(sms_template, **debtor_vars)
        else:
            # Default template
            msg = f"Hi {debtor_vars['name']}, your {template_vars['pharmacy_name']} account is overdue (60+ days): R{arrears_60_plus:,.2f}. Total balance (Total outstanding amount): R{debtor_vars['total_balance']}. EFT {template_vars['bank_name']} {template_vars['account_number']}. Ref {debtor_vars['acc_no']}. Thanks!"
        
        # Truncate if too long (SMS limit is 160 characters)
        if len(msg) > 160:
            msg = msg[:157] + "..."
        
        try:
            resp = send_smsportal_sms(phone, msg, token)
            sent.append({
                'acc_no': acc.get('acc_no'),
                'phone': phone,
                'message': msg,
                'status': 'sent'
            })
        except Exception as e:
            print("SMS error:", e)
            errors.append({
                'acc_no': acc.get('acc_no'),
                'phone': phone,
                'error': str(e)
            })
    
    return jsonify({'status': 'ok', 'sent': sent, 'errors': errors})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(debug=False, host='0.0.0.0', port=port)
