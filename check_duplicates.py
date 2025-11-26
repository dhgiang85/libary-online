import asyncio
import sys
import os
from dotenv import load_dotenv

# Load env vars
load_dotenv(os.path.join(os.getcwd(), 'backend', '.env'))

# Add backend directory to python path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.database import AsyncSessionLocal
from app.models.book_copy import BorrowRecord
from sqlalchemy import select

async def check_duplicates():
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(BorrowRecord))
        records = result.scalars().all()
        
        print(f"Total records: {len(records)}")
        
        seen = set()
        duplicates = []
        
        for r in records:
            # Check for duplicates based on user_id and copy_id (and maybe created_at)
            # Actually, let's just print them to see
            print(f"ID: {r.id}, User: {r.user_id}, Copy: {r.copy_id}, Status: {r.status}, Created: {r.created_at}")
            
            key = (r.user_id, r.copy_id, r.status)
            if key in seen:
                duplicates.append(r)
            seen.add(key)
            
        if duplicates:
            print(f"\nFound {len(duplicates)} potential duplicates (same user, copy, status). Deleting...")
            for d in duplicates:
                print(f"Deleting duplicate ID: {d.id}")
                await session.delete(d)
            await session.commit()
            print("Deletion complete.")
        else:
            print("\nNo obvious duplicates found based on (user, copy, status).")

if __name__ == "__main__":
    asyncio.run(check_duplicates())
