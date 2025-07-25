import re
import fitz  # PyMuPDF
import pandas as pd

def extract_debtors_strictest_names(pdf_path):
    doc = fitz.open(pdf_path)
    lines = []
    for page in doc:
        lines.extend(page.get_text().splitlines())

    title_prefixes = {"MR", "MRS", "MISS", "MS", "DR", "PROF", "MEV", "MNR", "ME"}

    data = []
    for i, line in enumerate(lines):
        if re.match(r"^\d{6} ", line):
            acc_no = line[:6].strip()
            rest = line[6:].strip()

            # Find start of first number to isolate name section
            first_number_match = re.search(r"-?\d+\.\d{2}|\.00", rest)
            name_section = rest[:first_number_match.start()].strip() if first_number_match else ""
            raw_name_parts = re.sub(r"\s{2,}", " ", name_section).split()

            # Remove title and numeric or ".00" patterns from name
            clean_name_parts = []
            for part in raw_name_parts:
                upper_part = part.upper()
                if upper_part in title_prefixes:
                    continue
                if re.match(r"^-?\d+\.?\d*$", part):  # Numbers
                    continue
                if part == ".00" or part.startswith("."):
                    continue
                clean_name_parts.append(part)

            name = " ".join(clean_name_parts)

            # Skip if name is invalid or specifically "MEDAID CONTROL ACC"
            if not re.search(r"[a-zA-Z]", name) or name.upper() == 'MEDAID CONTROL ACC':
                continue

            # After the name, split the rest of the line by whitespace
            after_name = rest[first_number_match.start():].strip() if first_number_match else ""
            fields = after_name.split()
            # Take the next 8 fields as the buckets (current, d30, d60, d90, d120, d150, d180, balance)
            buckets = []
            for idx in range(8):
                if idx < len(fields):
                    val = fields[idx].replace(",", "")
                    try:
                        buckets.append(float(val))
                    except ValueError:
                        buckets.append(0.0)
                else:
                    buckets.append(0.0)
            current, d30, d60, d90, d120, d150, d180, balance = buckets

            email = ""
            phone = ""

            for j in range(1, 4):
                if i + j < len(lines):
                    next_line = lines[i + j].strip()
                    if "email" in next_line.lower():
                        email_match = re.search(r"[\w\.-]+@[\w\.-]+", next_line)
                        if email_match:
                            email = email_match.group()
                    # Improved phone extraction: match lines starting with 'TEL' (case-insensitive, with colon or space)
                    if re.match(r'^tel[ :]', next_line, re.IGNORECASE):
                        # Remove all spaces for matching
                        digits_line = re.sub(r'\s+', '', next_line)
                        phone_match = re.search(r'(\+27|0)[6-8][0-9]{8}', digits_line)
                        if phone_match:
                            phone = phone_match.group()

            data.append({
                "acc_no": acc_no,
                "name": name,
                "current": current,
                "d30": d30,
                "d60": d60,
                "d90": d90,
                "d120": d120,
                "d150": d150,
                "d180": d180,
                "balance": balance,
                "email": email,
                "phone": phone
            })

    return pd.DataFrame(data)
