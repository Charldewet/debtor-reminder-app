# Debtor Reminder App - Technical Documentation

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Backend API Documentation](#backend-api-documentation)
3. [Frontend Implementation Guide](#frontend-implementation-guide)
4. [Data Flow](#data-flow)
5. [Key Features & Logic](#key-features--logic)
6. [Dependencies & Setup](#dependencies--setup)
7. [Integration Guide](#integration-guide)

---

## Architecture Overview

### System Components

The application consists of two main components:

1. **Backend API (Flask)**: RESTful API server handling PDF parsing, data processing, and communication services
2. **Frontend (React)**: Single-page application for user interaction, data visualization, and management

### Technology Stack

**Backend:**
- Python 3.11+
- Flask 3.1.1
- Flask-CORS 6.0.1
- PyMuPDF (fitz) 1.26.3 - PDF parsing
- pandas 2.3.1 - Data manipulation
- SendGrid 6.11.0 - Email service
- SMS Portal API - SMS service
- FPDF 1.7.2 - PDF generation

**Frontend:**
- React 19.1.0
- Vite 7.0.4 - Build tool
- Lucide React 0.525.0 - Icons

---

## Backend API Documentation

### Base URL
```
http://localhost:5001
```

### Endpoints

#### 1. Health Check
**GET** `/`

**Response:**
```json
{
  "status": "ok",
  "message": "Debtor Reminder API is running",
  "version": "1.0"
}
```

---

#### 2. Upload PDF Report
**POST** `/upload`

**Request:**
- Content-Type: `multipart/form-data`
- Body: FormData with `file` field containing PDF file

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
  },
  ...
]
```

**Data Structure:**
- `acc_no`: 6-digit account number (string)
- `name`: Customer name (string)
- `current`: Current balance (float)
- `d30`: 30 days overdue (float)
- `d60`: 60 days overdue (float)
- `d90`: 90 days overdue (float)
- `d120`: 120 days overdue (float)
- `d150`: 150 days overdue (float)
- `d180`: 180 days overdue (float)
- `balance`: Total outstanding balance (float)
- `email`: Email address (string, may be empty)
- `phone`: Phone number (string, may be empty)

**Error Handling:**
- 400: No file provided or invalid file
- 500: Server error during processing

**Backend Processing:**
1. Receives PDF file via multipart form data
2. Saves file temporarily to `backend_api/uploads/`
3. Calls `debtor_parser_final.extract_debtors_strictest_names()` to parse PDF
4. Returns JSON array of debtor records
5. Deletes temporary file

---

#### 3. Download Filtered CSV
**POST** `/download`

**Request:**
```json
{
  "rows": [
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
    },
    ...
  ],
  "min_balance": 100
}
```

**Response:**
- Content-Type: `text/csv`
- File download: `filtered_debtors.csv`
- Applies additional filtering: `d60 + d90 + d120 + d150 + d180 > min_balance`

---

#### 4. Download Missing Contacts PDF
**POST** `/download_missing_contacts_pdf`

**Request:**
```json
{
  "rows": [
    {
      "acc_no": "123456",
      "name": "John Doe",
      ...
    },
    ...
  ]
}
```

**Response:**
- Content-Type: `application/pdf`
- File download: `missing_contacts.pdf`
- Lists accounts missing email or phone information

**PDF Format:**
- Landscape orientation (A4)
- Table format with columns: Account, Name, Balance, Email Status, Phone Status

---

#### 5. Download Filtered Table PDF
**POST** `/download_filtered_table_pdf`

**Request:**
```json
{
  "rows": [
    {
      "acc_no": "123456",
      "name": "John Doe",
      ...
    },
    ...
  ],
  "ageing_buckets": ["current", "d30", "d60", "d90"],
  "col_names": {
    "current": "Current",
    "d30": "30D",
    "d60": "60D",
    "d90": "90D"
  }
}
```

**Response:**
- Content-Type: `application/pdf`
- File download: `filtered_debtor_table.pdf`
- Customizable columns based on selected ageing buckets

---

#### 6. Send Email
**POST** `/send_email`

**Request:**
```json
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
    },
    ...
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
      "message": "<html>...</html>",
      "status": 202
    }
  ],
  "errors": [
    {
      "acc_no": "789012",
      "error": "No email address"
    }
  ]
}
```

**Email Content:**
- Subject: "Reminder: Account Overdue at Reitz Apteek"
- HTML format with:
  - Personalized greeting
  - Outstanding balance (60+ days arrears)
  - Banking details (ABSA, Account: 409 0014 954)
  - Account reference number
  - Contact information

**Requirements:**
- Environment variable: `SENDGRID_API_KEY`
- From email: `no-reply@em8172.pharmasight.co.za`

---

#### 7. Send SMS
**POST** `/send_sms`

**Request:**
```json
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
    },
    ...
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
      "message": "Hi John Doe, your REITZ APTEEK account is overdue...",
      "smsportal_response": {...}
    }
  ],
  "errors": [
    {
      "acc_no": "789012",
      "error": "No phone number"
    }
  ]
}
```

**SMS Content:**
```
Hi {name}, your REITZ APTEEK account is overdue (60+ days): R{amount}. EFT ABSA 4090014954. Ref {acc_no}. Thanks!
```

**Requirements:**
- Environment variables:
  - `SMSPORTAL_CLIENT_ID`
  - `SMSPORTAL_API_SECRET`

**Authentication:**
- Uses OAuth2 client credentials flow
- Token obtained from `https://rest.smsportal.com/authentication`
- Token used for subsequent SMS API calls

---

### PDF Parsing Logic

**File:** `debtor_parser_final.py`

**Function:** `extract_debtors_strictest_names(pdf_path)`

**Process:**
1. Opens PDF using PyMuPDF
2. Extracts text line by line
3. Identifies account lines: Lines starting with 6 digits followed by space
4. Parses each account line:
   - Extracts 6-digit account number
   - Extracts name (removes titles: MR, MRS, MISS, MS, DR, PROF, MEV, MNR, ME)
   - Extracts 8 numeric values (current, d30, d60, d90, d120, d150, d180, balance)
   - Looks ahead 1-3 lines for email and phone
5. Filters out invalid entries:
   - Names without letters
   - Medical aid control accounts (`MEDAID CONTROL ACC`)
6. Returns pandas DataFrame

**Name Extraction:**
- Removes common titles
- Removes numeric patterns
- Cleans whitespace
- Case-insensitive matching

**Contact Extraction:**
- Email: Looks for `email` keyword and extracts email pattern
- Phone: Looks for `TEL:` or `TEL ` and extracts South African phone pattern (`+27` or `0` followed by 6-8 digits)

---

## Frontend Implementation Guide

### Component Structure

**Main Component:** `App.jsx`

### State Management

#### Core State Variables

```javascript
const [file, setFile] = useState(null);                    // Selected PDF file
const [data, setData] = useState([]);                      // Raw uploaded data
const [filtered, setFiltered] = useState([]);              // Filtered data after balance filter
const [minBalance, setMinBalance] = useState(100);          // Minimum balance threshold
const [loading, setLoading] = useState(false);              // Upload/processing state
const [error, setError] = useState('');                   // Error messages
const [selectedRows, setSelectedRows] = useState([]);       // Selected account numbers
const [selectAll, setSelectAll] = useState(false);         // Select all checkbox state
const [ageingBuckets, setAgeingBuckets] = useState([       // Selected ageing periods
  'current', 'd30', 'd60', 'd90', 'd120', 'd150', 'd180'
]);
const [sending, setSending] = useState(false);              // Communication sending state
const [sendResult, setSendResult] = useState(null);        // Communication result
const [filterMobile, setFilterMobile] = useState(false);    // Filter by mobile availability
const [filterEmail, setFilterEmail] = useState(false);     // Filter by email availability
const [searchTerm, setSearchTerm] = useState('');          // Search input value
const [sortColumn, setSortColumn] = useState(null);        // Current sort column
const [sortDirection, setSortDirection] = useState('asc');  // Sort direction: 'asc' or 'desc'
const [expandedSections, setExpandedSections] = useState({ // Collapsible sections state
  summary: true,
  filters: true,
  table: true
});
```

---

### Key Functions

#### 1. Medical Aid Account Filtering

```javascript
const isMedicalAidControlAccount = (row) => {
  const name = (row.name || '').toUpperCase().trim();
  
  const medicalAidPatterns = [
    'MEDAID CONTROL ACC',
    'MEDICAL AID CONTROL',
    'MEDICAL AID CONTROL ACCOUNT',
    'MED AID CONTROL',
    'MEDAID CONTROL',
    'MEDICAL AID ACC'
  ];
  
  return medicalAidPatterns.some(pattern => name.includes(pattern));
};

const filterMedicalAidAccounts = (dataArray) => {
  return dataArray.filter(row => !isMedicalAidControlAccount(row));
};
```

**Usage:** Applied immediately after upload and in all filter operations.

---

#### 2. File Upload Handler

```javascript
const handleUpload = async () => {
  if (!file) return;
  setLoading(true);
  setError('');
  
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    const res = await fetch(`${API_URL}/upload`, {
      method: 'POST',
      body: formData,
    });
    
    if (!res.ok) throw new Error('Failed to upload file. Please try again.');
    
    const json = await res.json();
    const filteredData = filterMedicalAidAccounts(json);
    setData(filteredData);
    setFiltered(filteredData);
  } catch (err) {
    setError(err.message);
  }
  
  setLoading(false);
};
```

**Key Points:**
- Creates FormData with file
- Filters medical aid accounts immediately
- Updates both `data` and `filtered` state
- Handles errors gracefully

---

#### 3. Balance Filter Handler

```javascript
const handleFilter = () => {
  const filteredRows = data.filter(row => {
    // Exclude medical aid control accounts
    if (isMedicalAidControlAccount(row)) return false;
    // Apply balance filter: sum of 60+ day buckets > minBalance
    return row.d60 + row.d90 + row.d120 + row.d150 + row.d180 > minBalance;
  });
  setFiltered(filteredRows);
};
```

**Filter Logic:**
- Sums: `d60 + d90 + d120 + d150 + d180`
- Compares to `minBalance` threshold
- Always excludes medical aid accounts

---

#### 4. Table Display Filtering

```javascript
const filteredForTable = filtered.filter(row => {
  // Always exclude medical aid control accounts
  if (isMedicalAidControlAccount(row)) return false;
  
  // Filter by contact info
  if (filterMobile && (!row.phone || row.phone.trim() === '')) return false;
  if (filterEmail && (!row.email || row.email.trim() === '')) return false;
  
  // Filter by search term
  if (searchTerm) {
    const searchLower = searchTerm.toLowerCase();
    return (
      row.acc_no?.toLowerCase().includes(searchLower) ||
      row.name?.toLowerCase().includes(searchLower) ||
      row.email?.toLowerCase().includes(searchLower) ||
      row.phone?.toLowerCase().includes(searchLower)
    );
  }
  
  // Filter by ageing buckets - only show rows with values in selected buckets
  const hasValueInSelectedBuckets = ageingBuckets.some(bucket => row[bucket] > 0);
  return hasValueInSelectedBuckets;
});
```

**Filter Chain:**
1. Medical aid exclusion
2. Contact availability filters
3. Search term matching
4. Ageing bucket selection

---

#### 5. Sorting Logic

```javascript
const handleSort = (column) => {
  if (sortColumn === column) {
    // Toggle direction if clicking the same column
    setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
  } else {
    // Set new column and default to ascending
    setSortColumn(column);
    setSortDirection('asc');
  }
};

const sortedTableData = [...filteredForTable].sort((a, b) => {
  if (!sortColumn) return 0;
  
  let aValue, bValue;
  
  // Handle different column types
  if (sortColumn === 'balance' || ageingBuckets.includes(sortColumn)) {
    // Numeric columns
    aValue = Number(a[sortColumn]) || 0;
    bValue = Number(b[sortColumn]) || 0;
  } else if (sortColumn === 'acc_no') {
    // Account number - try numeric first, then string
    aValue = Number(a.acc_no) || a.acc_no || '';
    bValue = Number(b.acc_no) || b.acc_no || '';
  } else {
    // String columns (name, email, phone)
    aValue = (a[sortColumn] || '').toString().toLowerCase();
    bValue = (b[sortColumn] || '').toString().toLowerCase();
  }
  
  // Compare values
  if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
  if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
  return 0;
});
```

**Sorting Behavior:**
- Numeric columns: Sorts by numeric value
- Account numbers: Tries numeric, falls back to string
- Text columns: Case-insensitive alphabetical
- Toggle: Click same column to reverse direction

---

#### 6. Selection Management

```javascript
// Selectable rows: accounts with values in selected ageing buckets (excluding medical aid)
const selectableRows = filtered.filter(row => 
  !isMedicalAidControlAccount(row) && 
  ageingBuckets.some(b => row[b] > 0)
);

const handleSelectAll = (e) => {
  if (e.target.checked) {
    setSelectedRows(selectableRows.map(row => row.acc_no));
    setSelectAll(true);
  } else {
    setSelectedRows([]);
    setSelectAll(false);
  }
};

const handleSelectRow = (acc_no) => {
  if (selectedRows.includes(acc_no)) {
    setSelectedRows(selectedRows.filter(id => id !== acc_no));
    setSelectAll(false);
  } else {
    const newSelected = [...selectedRows, acc_no];
    setSelectedRows(newSelected);
    if (newSelected.length === selectableRows.length) setSelectAll(true);
  }
};
```

**Selection Logic:**
- Only accounts with values in selected ageing buckets are selectable
- Medical aid accounts are never selectable
- Select all updates when individual selections change

---

#### 7. Communication Handlers

```javascript
const handleSendEmail = async () => {
  const selectedAccounts = selectableRows.filter(row => 
    selectedRows.includes(row.acc_no)
  );
  
  setSending(true);
  setSendResult(null);
  
  try {
    const res = await fetch(`${API_URL}/send_email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accounts: selectedAccounts })
    });
    
    const data = await res.json();
    setSendResult({ 
      type: 'email', 
      count: data.sent.length, 
      status: 'success' 
    });
  } catch (err) {
    setSendResult({ 
      type: 'email', 
      status: 'error', 
      error: err.message 
    });
  }
  
  setSending(false);
};

const handleSendSMS = async () => {
  // Similar structure to handleSendEmail
  // Uses /send_sms endpoint
};
```

**Key Points:**
- Sends only selected accounts
- Shows loading state during sending
- Displays success/error results
- Handles partial success (some sent, some errors)

---

#### 8. Download Handlers

```javascript
const handleDownload = async () => {
  try {
    const res = await fetch(`${API_URL}/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        rows: filtered, 
        min_balance: minBalance 
      })
    });
    
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'filtered_debtors.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  } catch (err) {
    setError('Failed to download file. Please try again.');
  }
};
```

**Download Pattern:**
1. POST request with data
2. Receive blob response
3. Create temporary URL
4. Trigger download via anchor element
5. Clean up URL

---

### Data Calculations

#### Summary Statistics

```javascript
// Calculate sum for each ageing bucket
ageingBuckets.map((col) => {
  const sum = filtered.reduce((sum, row) => sum + row[col], 0);
  return { bucket: col, total: sum };
});

// Total outstanding
const totalOutstanding = filtered.reduce((sum, row) => sum + row.balance, 0);

// Total accounts
const totalAccounts = filtered.length;
```

**Important:** All calculations use `filtered` array, which already excludes medical aid accounts.

---

### UI Components Structure

#### 1. File Upload Section
- File input (hidden, triggered by label)
- Upload button (disabled when no file or loading)
- Loading state indicator

#### 2. Summary Statistics Section
- Collapsible header
- Grid of stat cards (one per ageing bucket)
- Overview cards (Total Outstanding, Total Accounts)

#### 3. Filter & Settings Section
- Collapsible header
- Balance filter:
  - Range slider (0-2000, step 10)
  - Display current value
  - Apply button
- Ageing bucket selection:
  - Checkboxes for each bucket (current, d30, d60, d90, d120, d150, d180)
- Contact filters:
  - Checkboxes for mobile/email availability
  - Download missing contacts PDF button

#### 4. Data Table Section
- Collapsible header with account count badge
- Table controls:
  - Search input (filters by acc_no, name, email, phone)
  - Selection counter
  - Action buttons (Email, SMS, Export CSV, Export PDF)
- Data table:
  - Sortable columns (click header to sort)
  - Checkbox column (select all/individual)
  - All data columns
  - Empty state message

---

### Environment Configuration

**Frontend Environment Variables:**

```env
VITE_API_URL=http://localhost:5001
```

**Backend Environment Variables:**

```env
PORT=5001
SENDGRID_API_KEY=your_sendgrid_api_key
SMSPORTAL_CLIENT_ID=your_smsportal_client_id
SMSPORTAL_API_SECRET=your_smsportal_api_secret
```

---

## Data Flow

### Upload Flow

```
User selects PDF
    ↓
handleFileChange() - stores file in state
    ↓
User clicks "Upload & Analyze"
    ↓
handleUpload()
    ↓
POST /upload with FormData
    ↓
Backend parses PDF → returns JSON array
    ↓
filterMedicalAidAccounts() - removes medical aid accounts
    ↓
setData() - stores raw data
setFiltered() - stores filtered data
    ↓
UI updates with statistics and table
```

### Filter Flow

```
User adjusts minBalance slider
    ↓
User clicks "Apply Filter"
    ↓
handleFilter()
    ↓
Filters data: d60+d90+d120+d150+d180 > minBalance
    ↓
Excludes medical aid accounts
    ↓
setFiltered() - updates filtered state
    ↓
Statistics recalculate
Table updates
```

### Communication Flow

```
User selects accounts (checkboxes)
    ↓
User clicks "Send Email" or "Send SMS"
    ↓
handleSendEmail() or handleSendSMS()
    ↓
Filters selectableRows by selected account numbers
    ↓
POST /send_email or /send_sms with accounts array
    ↓
Backend processes each account
    ↓
Returns { sent: [...], errors: [...] }
    ↓
setSendResult() - displays success/error message
```

---

## Key Features & Logic

### 1. Medical Aid Account Exclusion

**Always Applied:**
- On upload
- In balance filter
- In table display
- In selection logic
- In statistics calculations

**Pattern Matching:**
- Case-insensitive
- Partial match (includes check)
- Multiple pattern variations

### 2. Ageing Bucket Selection

**Purpose:** Control which debt periods are included in:
- Statistics display
- Table columns
- Communication selection
- Export files

**Default:** All buckets selected

**Logic:** Only accounts with values > 0 in selected buckets are:
- Shown in table
- Available for selection
- Included in communications

### 3. Multi-Level Filtering

**Filter Chain:**
1. Medical aid exclusion (always)
2. Balance filter (60+ day arrears > minBalance)
3. Ageing bucket selection
4. Contact availability (mobile/email)
5. Search term matching

**Order Matters:** Each filter narrows the dataset further.

### 4. Selection Management

**Selectable Criteria:**
- Must have value > 0 in at least one selected ageing bucket
- Cannot be medical aid account

**Selection State:**
- `selectedRows`: Array of account numbers
- `selectAll`: Boolean for header checkbox
- Auto-updates when filters change

### 5. Sorting

**Sortable Columns:**
- Account (numeric/string)
- Name (alphabetical)
- All ageing buckets (numeric)
- Balance (numeric)
- Email (alphabetical)
- Phone (alphabetical)

**Sort Behavior:**
- Click column header to sort
- Click again to reverse
- Visual indicators (arrows) show current sort

---

## Dependencies & Setup

### Backend Dependencies

**requirements.txt:**
```
flask==3.1.1
flask-cors==6.0.1
pandas==2.3.1
werkzeug==3.1.3
pymupdf==1.26.3
requests==2.32.4
python-dotenv==1.0.1
fpdf==1.7.2
sendgrid==6.11.0
gunicorn==21.2.0
```

**Installation:**
```bash
cd backend_api
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

**Run Server:**
```bash
python app.py
# Runs on http://localhost:5001
```

### Frontend Dependencies

**package.json:**
```json
{
  "dependencies": {
    "lucide-react": "^0.525.0",
    "react": "^19.1.0",
    "react-dom": "^19.1.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.6.0",
    "vite": "^7.0.4"
  }
}
```

**Installation:**
```bash
cd frontend
npm install
```

**Run Development Server:**
```bash
npm run dev
# Runs on http://localhost:5173
```

---

## Integration Guide

### API Integration Points

#### 1. Upload Endpoint
```javascript
const formData = new FormData();
formData.append('file', fileObject);

const response = await fetch(`${API_URL}/upload`, {
  method: 'POST',
  body: formData
});

const data = await response.json();
// Returns array of debtor objects
```

#### 2. Communication Endpoints
```javascript
// Email
const emailResponse = await fetch(`${API_URL}/send_email`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ accounts: selectedAccounts })
});

// SMS
const smsResponse = await fetch(`${API_URL}/send_sms`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ accounts: selectedAccounts })
});
```

#### 3. Download Endpoints
```javascript
// CSV Download
const csvResponse = await fetch(`${API_URL}/download`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ rows: filteredData, min_balance: minBalance })
});

const blob = await csvResponse.blob();
// Handle blob download

// PDF Downloads
const pdfResponse = await fetch(`${API_URL}/download_filtered_table_pdf`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    rows: tableData,
    ageing_buckets: selectedBuckets,
    col_names: columnNames
  })
});
```

### State Management Integration

**Recommended Approach:**
- Use your existing state management solution (Redux, Zustand, Context API, etc.)
- Map the state variables listed above to your store structure
- Keep the same function logic but adapt to your state management patterns

### Component Integration

**Key Components to Create:**

1. **FileUpload Component**
   - File input handling
   - Upload progress/loading state
   - Error display

2. **StatisticsDashboard Component**
   - Summary cards
   - Ageing bucket totals
   - Overview metrics

3. **FilterPanel Component**
   - Balance slider
   - Ageing bucket checkboxes
   - Contact filters

4. **DataTable Component**
   - Sortable columns
   - Selection checkboxes
   - Search functionality
   - Action buttons

5. **CommunicationPanel Component**
   - Email/SMS buttons
   - Selection counter
   - Result display

### Data Structure

**Standard Debtor Object:**
```typescript
interface Debtor {
  acc_no: string;        // 6-digit account number
  name: string;         // Customer name
  current: number;      // Current balance
  d30: number;          // 30 days overdue
  d60: number;          // 60 days overdue
  d90: number;          // 90 days overdue
  d120: number;         // 120 days overdue
  d150: number;         // 150 days overdue
  d180: number;         // 180 days overdue
  balance: number;       // Total outstanding
  email: string;         // Email (may be empty)
  phone: string;         // Phone (may be empty)
}
```

### Error Handling

**API Errors:**
- Network errors: Display user-friendly message
- 400 errors: Invalid request (show specific error)
- 500 errors: Server error (log and display generic message)

**Frontend Errors:**
- File validation before upload
- Empty data handling
- Invalid filter values

### Performance Considerations

**Optimizations:**
- Debounce search input (300ms delay)
- Memoize filtered/sorted data calculations
- Virtual scrolling for large tables (1000+ rows)
- Lazy load PDF generation

**Data Limits:**
- No hard limit on rows, but consider pagination for 1000+ accounts
- PDF generation may be slow for 500+ rows

---

## Testing Checklist

### Backend API Tests
- [ ] Upload valid PDF returns correct data structure
- [ ] Upload invalid file returns error
- [ ] Filter endpoint applies min_balance correctly
- [ ] Email endpoint sends emails and returns status
- [ ] SMS endpoint sends SMS and returns status
- [ ] PDF downloads generate correct files
- [ ] Medical aid accounts excluded from all endpoints

### Frontend Tests
- [ ] File upload updates state correctly
- [ ] Medical aid accounts filtered on upload
- [ ] Balance filter applies correctly
- [ ] Ageing bucket selection updates table
- [ ] Search filters table correctly
- [ ] Sorting works for all columns
- [ ] Selection (all/individual) works correctly
- [ ] Communication buttons disabled when no selection
- [ ] Download functions trigger correctly
- [ ] Error states display properly

---

## Security Considerations

1. **File Upload:**
   - Validate file type (PDF only)
   - Limit file size (recommend 10MB max)
   - Sanitize file names

2. **API Security:**
   - CORS configuration (restrict origins in production)
   - Rate limiting on communication endpoints
   - Input validation on all endpoints

3. **Data Privacy:**
   - Don't log sensitive customer data
   - Secure storage of API keys
   - HTTPS in production

---

## Deployment Notes

### Backend Deployment
- Use Gunicorn or similar WSGI server
- Set environment variables securely
- Configure CORS for production domain
- Set up proper logging

### Frontend Deployment
- Build: `npm run build`
- Serve static files from build directory
- Configure API URL for production
- Set up proper error tracking

---

## Support & Maintenance

### Common Issues

1. **PDF Parsing Fails:**
   - Check PDF format matches expected structure
   - Verify account number pattern (6 digits)
   - Check for encoding issues

2. **Communication Fails:**
   - Verify API keys are set correctly
   - Check email/SMS service status
   - Review error responses for details

3. **Filtering Issues:**
   - Verify medical aid patterns match your data
   - Check filter logic order
   - Debug with console logs

### Future Enhancements

- Bulk operations (select by criteria)
- Export templates customization
- Communication history tracking
- Advanced filtering options
- Dashboard analytics

---

## Contact & Support

For technical questions or issues, refer to:
- Backend API documentation
- Frontend component source code
- Error logs and debugging output

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-16  
**Maintained By:** Development Team

