# PDF Parser Usage Guide

## Overview

The PDF parser (`PDF_PARSER_COMPLETE.py`) extracts debtor account information from PDF reports. It handles account numbers, customer names, ageing buckets, balances, and contact information.

---

## Installation

### Required Dependencies

```bash
pip install pymupdf pandas
```

Or add to `requirements.txt`:
```
pymupdf==1.26.3
pandas==2.3.1
```

---

## Basic Usage

### Simple Example

```python
from PDF_PARSER_COMPLETE import extract_debtors_strictest_names
import pandas as pd

# Parse PDF file
df = extract_debtors_strictest_names('path/to/debtor_report.pdf')

# View results
print(df.head())
print(f"Total accounts: {len(df)}")
print(f"Total outstanding: R {df['balance'].sum():,.2f}")
```

### With Medical Aid Flag

```python
from PDF_PARSER_COMPLETE import extract_debtors_with_medical_aid_flag

# Parse PDF with medical aid flag
df = extract_debtors_with_medical_aid_flag('path/to/debtor_report.pdf')

# Filter out medical aid accounts
debtors_only = df[df['is_medical_aid_control'] == False]

# View medical aid accounts separately
medical_aid = df[df['is_medical_aid_control'] == True]
```

---

## Function Reference

### `extract_debtors_strictest_names(pdf_path: str) -> pd.DataFrame`

Main parsing function that extracts debtor information from PDF.

**Parameters:**
- `pdf_path` (str): Path to PDF file

**Returns:**
- `pd.DataFrame`: DataFrame with columns:
  - `acc_no`: Account number (6 digits)
  - `name`: Customer name
  - `current`: Current balance
  - `d30`: 30 days overdue
  - `d60`: 60 days overdue
  - `d90`: 90 days overdue
  - `d120`: 120 days overdue
  - `d150`: 150 days overdue
  - `d180`: 180 days overdue
  - `balance`: Total outstanding balance
  - `email`: Email address (may be empty)
  - `phone`: Phone number (may be empty)

**Raises:**
- `FileNotFoundError`: If PDF file doesn't exist
- `Exception`: For parsing errors

**Example:**
```python
df = extract_debtors_strictest_names('report.pdf')
```

---

### `is_medical_aid_control_account(name: str) -> bool`

Check if an account name matches medical aid control patterns.

**Parameters:**
- `name` (str): Account name to check

**Returns:**
- `bool`: True if medical aid account, False otherwise

**Example:**
```python
if is_medical_aid_control_account("MEDAID CONTROL ACC"):
    print("This is a medical aid account")
```

---

### `extract_debtors_with_medical_aid_flag(pdf_path: str) -> pd.DataFrame`

Enhanced version that includes medical aid flag instead of filtering.

**Returns:**
- Same as `extract_debtors_strictest_names()` plus:
  - `is_medical_aid_control`: Boolean flag

---

## PDF Format Requirements

### Expected Format

The parser expects PDFs with the following structure:

```
123456 CUSTOMER NAME                   100.00  200.00  150.00  75.00  50.00  25.00  10.00  610.50
       Email: customer@example.com
       TEL: 0821234567
```

### Line Structure

1. **Account Line**: Must start with exactly 6 digits followed by space
   - Format: `{6-digit-acc-no} {name} {current} {d30} {d60} {d90} {d120} {d150} {d180} {balance}`

2. **Contact Lines**: Optional lines following account line
   - Email: Line containing "email" keyword
   - Phone: Line starting with "TEL" or "TEL:" (case-insensitive)

---

## Parsing Logic

### Account Identification

- Lines starting with exactly 6 digits followed by space are treated as account lines
- Pattern: `^\d{6}\s`

### Name Extraction

1. Extract text between account number and first numeric value
2. Remove common titles (MR, MRS, MISS, MS, DR, PROF, etc.)
3. Remove numeric patterns
4. Clean whitespace
5. Validate: name must contain at least one letter

### Ageing Buckets

- Expects 8 numeric values after the name
- Values are parsed as floats
- Commas are removed
- Missing values default to 0.0

### Contact Information

- Looks ahead 1-4 lines from account line
- Email: Searches for email pattern `[\w\.-]+@[\w\.-]+\.\w+`
- Phone: Searches for South African phone patterns:
  - `+27[6-8]\d{8}` (international format)
  - `0[6-8]\d{8}` (local format)

### Medical Aid Filtering

Automatically filters out accounts matching these patterns:
- "MEDAID CONTROL ACC"
- "MEDICAL AID CONTROL"
- "MEDICAL AID CONTROL ACCOUNT"
- "MED AID CONTROL"
- "MEDAID CONTROL"
- "MEDICAL AID ACC"
- "MEDICAL AID"
- "MEDAID"

---

## Error Handling

### Common Errors

1. **FileNotFoundError**
   ```python
   try:
       df = extract_debtors_strictest_names('nonexistent.pdf')
   except FileNotFoundError as e:
       print(f"File not found: {e}")
   ```

2. **Parsing Errors**
   ```python
   try:
       df = extract_debtors_strictest_names('corrupted.pdf')
   except Exception as e:
       print(f"Parsing error: {e}")
   ```

3. **Empty Results**
   ```python
   df = extract_debtors_strictest_names('report.pdf')
   if df.empty:
       print("No accounts found in PDF")
   ```

---

## Integration Examples

### Flask API Integration

```python
from flask import Flask, request, jsonify
from PDF_PARSER_COMPLETE import extract_debtors_strictest_names
import os

app = Flask(__name__)

@app.route('/api/parse-pdf', methods=['POST'])
def parse_pdf():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    # Save temporarily
    file_path = os.path.join('/tmp', file.filename)
    file.save(file_path)
    
    try:
        # Parse PDF
        df = extract_debtors_strictest_names(file_path)
        
        # Convert to JSON
        result = df.to_dict('records')
        
        # Clean up
        os.remove(file_path)
        
        return jsonify({
            'success': True,
            'count': len(result),
            'debtors': result
        })
    except Exception as e:
        os.remove(file_path)
        return jsonify({'error': str(e)}), 500
```

### Database Integration

```python
from PDF_PARSER_COMPLETE import extract_debtors_strictest_names
from sqlalchemy import create_engine
import pandas as pd

def import_debtors_to_database(pdf_path, pharmacy_id, db_connection_string):
    # Parse PDF
    df = extract_debtors_strictest_names(pdf_path)
    
    # Add pharmacy_id
    df['pharmacy_id'] = pharmacy_id
    
    # Connect to database
    engine = create_engine(db_connection_string)
    
    # Insert into database (handle duplicates)
    df.to_sql('debtors', engine, if_exists='append', index=False)
    
    return len(df)
```

### Batch Processing

```python
import os
from PDF_PARSER_COMPLETE import extract_debtors_strictest_names
import pandas as pd

def process_multiple_pdfs(directory_path):
    all_debtors = []
    
    for filename in os.listdir(directory_path):
        if filename.endswith('.pdf'):
            file_path = os.path.join(directory_path, filename)
            try:
                df = extract_debtors_strictest_names(file_path)
                df['source_file'] = filename
                all_debtors.append(df)
            except Exception as e:
                print(f"Error processing {filename}: {e}")
    
    # Combine all results
    if all_debtors:
        combined_df = pd.concat(all_debtors, ignore_index=True)
        return combined_df
    else:
        return pd.DataFrame()
```

---

## Performance Considerations

### Large PDFs

- The parser processes PDFs line by line
- Memory usage is proportional to number of accounts
- For very large PDFs (1000+ accounts), consider:
  - Processing in batches
  - Streaming results to database
  - Using chunked processing

### Optimization Tips

1. **Pre-filter PDFs**: Only process relevant pages if possible
2. **Caching**: Cache parsed results if PDFs don't change frequently
3. **Parallel Processing**: Process multiple PDFs in parallel
4. **Database Indexing**: Index account numbers for faster lookups

---

## Testing

### Unit Test Example

```python
import unittest
from PDF_PARSER_COMPLETE import extract_debtors_strictest_names, is_medical_aid_control_account

class TestPDFParser(unittest.TestCase):
    def test_medical_aid_detection(self):
        self.assertTrue(is_medical_aid_control_account("MEDAID CONTROL ACC"))
        self.assertTrue(is_medical_aid_control_account("Medical Aid Control"))
        self.assertFalse(is_medical_aid_control_account("John Doe"))
    
    def test_parse_pdf(self):
        # Use a test PDF file
        df = extract_debtors_strictest_names('test_report.pdf')
        self.assertGreater(len(df), 0)
        self.assertIn('acc_no', df.columns)
        self.assertIn('name', df.columns)
        self.assertIn('balance', df.columns)

if __name__ == '__main__':
    unittest.main()
```

---

## Troubleshooting

### No Accounts Found

**Possible causes:**
- PDF format doesn't match expected structure
- Account numbers aren't exactly 6 digits
- Text extraction issues (scanned PDFs)

**Solutions:**
- Verify PDF format matches expected structure
- Check if PDF is text-based (not scanned image)
- Use OCR if PDF is scanned

### Incorrect Name Extraction

**Possible causes:**
- Unusual name formats
- Special characters
- Multiple titles

**Solutions:**
- Review `clean_name()` function
- Add custom title patterns if needed
- Check for encoding issues

### Missing Contact Information

**Possible causes:**
- Contact info not in expected format
- Contact info on different pages
- Different phone/email formats

**Solutions:**
- Verify contact format in PDF
- Extend look-ahead range if needed
- Add custom extraction patterns

---

## Advanced Usage

### Custom Medical Aid Patterns

```python
from PDF_PARSER_COMPLETE import is_medical_aid_control_account

# Add custom pattern
def custom_medical_aid_check(name):
    patterns = ['CUSTOM PATTERN', 'ANOTHER PATTERN']
    return any(p in name.upper() for p in patterns) or is_medical_aid_control_account(name)
```

### Custom Contact Extraction

```python
import re

def extract_custom_phone(line):
    # Custom phone extraction logic
    pattern = r'your_custom_pattern'
    match = re.search(pattern, line)
    return match.group() if match else None
```

---

## Support

For issues or questions:
1. Check PDF format matches expected structure
2. Review error messages for specific issues
3. Test with sample PDF to isolate problems
4. Verify dependencies are installed correctly

---

**Last Updated**: 2025-01-16

