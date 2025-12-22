from sqlalchemy import create_engine, inspect
from config import settings

print(f"Connecting to: {settings.database_url}")
engine = create_engine(settings.database_url)
inspector = inspect(engine)
tables = inspector.get_table_names()

if not tables:
    print("No tables found in public schema.")
else:
    print(f"Found {len(tables)} tables:")
    for table in tables:
        print(f" - {table}")
