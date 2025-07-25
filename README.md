# Debtor Reminder App

A modern web application for managing debtor reports, built with React frontend and Flask backend. The app allows users to upload PDF debtor reports, filter and analyze data, and automatically send email/SMS reminders to outstanding account holders.

## Features

- **PDF Upload & Parsing**: Upload and parse PDF debtor reports
- **Dynamic Filtering**: Filter accounts by ageing buckets (Current, 30D, 60D, 90D, 120D, 150D, 180D)
- **Contact Management**: Filter accounts with/without email addresses or phone numbers
- **Communication**: Send automated email and SMS reminders to debtors
- **Export Options**: Download filtered data as CSV or PDF reports
- **Modern UI**: Clean, responsive interface with SaaS-inspired design

## Tech Stack

### Frontend
- React 18
- Vite
- Lucide React (icons)
- Modern CSS with responsive design

### Backend
- Flask (Python)
- PyMuPDF (PDF parsing)
- Pandas (data manipulation)
- SendGrid (email sending)
- SMSPortal (SMS sending)
- FPDF (PDF generation)

## Installation

### Prerequisites
- Python 3.8+
- Node.js 16+
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend_api
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install Python dependencies:
```bash
pip install -r requirements.txt
```

4. Set up environment variables:
Create a `.env` file in the `backend_api` directory:
```env
SMSPORTAL_CLIENT_ID=your_smsportal_client_id
SMSPORTAL_API_SECRET=your_smsportal_api_secret
SENDGRID_API_KEY=your_sendgrid_api_key
```

5. Start the backend server:
```bash
python app.py
```

The backend will run on `http://localhost:5001`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:5173`

## Usage

1. **Upload PDF**: Click "Choose PDF File" to upload a debtor report
2. **Filter Data**: Use the ageing bucket checkboxes to filter accounts
3. **Contact Filters**: Optionally filter for accounts with email/phone
4. **Send Communications**: Select accounts and send email/SMS reminders
5. **Export Data**: Download filtered data as CSV or PDF

## API Endpoints

- `POST /upload` - Upload and parse PDF
- `POST /download` - Download filtered data as CSV
- `POST /download_filtered_table_pdf` - Download filtered data as PDF
- `POST /download_missing_contacts_pdf` - Download accounts missing contact info
- `POST /send_email` - Send email reminders
- `POST /send_sms` - Send SMS reminders

## Configuration

### Email Setup (SendGrid)
1. Create a SendGrid account
2. Generate an API key
3. Verify your sender domain
4. Add the API key to your `.env` file

### SMS Setup (SMSPortal)
1. Create an SMSPortal account
2. Generate Client ID and API Secret
3. Add credentials to your `.env` file

## Project Structure

```
debtor_reminder_app/
├── backend_api/
│   ├── app.py                 # Flask backend
│   ├── requirements.txt       # Python dependencies
│   ├── .env                   # Environment variables
│   └── uploads/              # Temporary file storage
├── frontend/
│   ├── src/
│   │   └── App.jsx           # Main React component
│   ├── package.json          # Node.js dependencies
│   └── README.md
├── debtor_parser_final.py    # PDF parsing logic
├── app.py                    # Original Streamlit app
└── README.md
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support or questions, please open an issue on GitHub. 