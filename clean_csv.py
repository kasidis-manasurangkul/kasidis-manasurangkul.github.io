import pandas as pd

# Load your CSV file
df = pd.read_csv('data/animals.csv')

# Drop duplicates based on the 'Animal' column, keeping the first occurrence
df_unique = df.drop_duplicates(subset='Animal', keep='first')

# (Optional) Save the cleaned DataFrame back to a CSV
df_unique.to_csv('data/clean.csv', index=False)

print(f"Original rows: {len(df)}")
print(f"Rows after removing duplicates: {len(df_unique)}")
