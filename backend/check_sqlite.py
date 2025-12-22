import sqlite3
import os

db_file = "portfolio_optimizer.db"

if not os.path.exists(db_file):
    print("Database file not found.")
else:
    try:
        conn = sqlite3.connect(db_file)
        cursor = conn.cursor()
        
        # Get all table names
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        
        if not tables:
            print("Database is empty (no tables found).")
        else:
            print(f"Found {len(tables)} tables:")
            for table in tables:
                table_name = table[0]
                try:
                    cursor.execute(f"SELECT count(*) FROM {table_name}")
                    count = cursor.fetchone()[0]
                    print(f" - {table_name}: {count} rows")
                except Exception as e:
                    print(f" - {table_name}: Error ({e})")
                    
        conn.close()
    except Exception as e:
        print(f"Error: {e}")
