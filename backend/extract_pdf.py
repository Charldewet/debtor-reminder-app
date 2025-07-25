import fitz  # PyMuPDF
import re
import pandas as pd

def extract_debtors_from_pdf(file_path):
    doc = fitz.open(file_path)
    text = ""
    for page in doc:
        text += page.get_text()

    pattern = re.compile(
        r"(?P<acc_no>\d{6})\s+(?P<name>[A-Z0-9\s\.']{1,30})\s+"
        r"(?P<current>-?\d+\.\d{2}|\.\d{2}-?)\s+"
        r"(?P<d30>-?\d+\.\d{2}|\.\d{2}-?)\s+"
        r"(?P<d60>-?\d+\.\d{2}|\.\d{2}-?)\s+"
        r"(?P<d90>-?\d+\.\d{2}|\.\d{2}-?)\s+"
        r"(?P<d120>-?\d+\.\d{2}|\.\d{2}-?)\s+"
        r"(?P<d150>-?\d+\.\d{2}|\.\d{2}-?)\s+"
        r"(?P<d180>-?\d+\.\d{2}|\.\d{2}-?)\s+"
        r"(?P<balance>-?\d+\.\d{2}|\.\d{2}-?)"
    )

    matches = pattern.finditer(text)
    rows = []
    for match in matches:
        data = match.groupdict()
        for key in data:
            data[key] = data[key].replace("-", "") if data[key] else "0.00"
        rows.append(data)

    df = pd.DataFrame(rows)
    for col in df.columns:
        if col not in ["acc_no", "name"]:
            df[col] = df[col].astype(float)
    return df