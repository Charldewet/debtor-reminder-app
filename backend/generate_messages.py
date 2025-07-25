def generate_sms_messages(df):
    messages = []
    for _, row in df.iterrows():
        message = f"Hi {row['name'].strip()}, this is a reminder from Reitz Apteek. Your account shows an overdue balance of R{row['balance']:.2f} aged over 60 days. Kindly settle or contact us. Thank you!"
        messages.append(message)
    return messages