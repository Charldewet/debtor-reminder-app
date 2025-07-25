def filter_overdue_accounts(df, threshold=100.00):
    df_filtered = df[
        (
            (df["d60"] > 0) |
            (df["d90"] > 0) |
            (df["d120"] > 0) |
            (df["d150"] > 0) |
            (df["d180"] > 0)
        ) & (df["balance"] >= threshold)
    ].copy()
    return df_filtered