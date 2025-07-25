
import streamlit as st
import pandas as pd
from debtor_parser_final import extract_debtors_strictest_names

st.set_page_config(page_title="Debtor Reminder App", layout="wide")
st.title("📂 Debtor Reminder Dashboard")

uploaded_file = st.file_uploader("📤 Upload Debtor Report (PDF)", type=["pdf"])
if uploaded_file:
    with open("uploaded_report.pdf", "wb") as f:
        f.write(uploaded_file.getbuffer())

    df_raw = extract_debtors_strictest_names("uploaded_report.pdf")

    if df_raw.empty:
        st.warning("No debtor data could be extracted. Please check the file formatting.")
    else:
        st.success("✅ Report uploaded and parsed successfully!")

        st.header("📊 Summary Statistics")

        age_cols = ["current", "d30", "d60", "d90", "d120", "d150", "d180"]
        col_names = {
            "current": "Current",
            "d30": "30 Days",
            "d60": "60 Days",
            "d90": "90 Days",
            "d120": "120 Days",
            "d150": "150 Days",
            "d180": "180 Days"
        }

        age_cols_sorted = [col_names[col] for col in age_cols]
        age_sums = df_raw[age_cols].sum()

        cols = st.columns(len(age_cols_sorted))
        for col, label, value in zip(cols, age_cols_sorted, age_sums):
            col.metric(label, f"R {value:,.2f}")

        st.subheader("📌 Totals")
        st.metric("Total Outstanding", f"R {df_raw['balance'].sum():,.2f}")
        st.metric("Total Accounts", f"{len(df_raw)}")

        st.header("⚙️ Filter Settings")
        min_balance = st.slider(
            "Minimum Balance for 60+ Day Arrears",
            min_value=0,
            max_value=2000,
            value=100,
            step=10,
            format="R %d"
        )

        df_filtered = df_raw[df_raw["d60"] + df_raw["d90"] + df_raw["d120"] + df_raw["d150"] + df_raw["d180"] > min_balance]

        st.header("🧾 Accounts in Arrears (Filtered)")
        st.dataframe(df_filtered)

        st.download_button("⬇️ Download Filtered Data", df_filtered.to_csv(index=False), file_name="filtered_debtors.csv", mime="text/csv")
