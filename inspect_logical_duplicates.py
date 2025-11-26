import asyncio
import sys
import os
from dotenv import load_dotenv
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload

# Load env vars
load_dotenv(os.path.join(os.getcwd(), 'backend', '.env'))

# Add backend directory to python path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.database import AsyncSessionLocal
from app.models.book_copy import BorrowRecord, BookCopy, BorrowStatus
from app.models.book import Book

async def inspect_logical_duplicates():
    async with AsyncSessionLocal() as session:
        # Find users who have multiple ACTIVE or PENDING borrows for the SAME BOOK
        # We need to join BorrowRecord -> BookCopy
        
        print("Checking for logical duplicates (same user, same book, multiple active/pending records)...")
        
        # Get all active/pending records with their book info
        result = await session.execute(
            select(BorrowRecord)
            .join(BookCopy)
            .options(selectinload(BorrowRecord.copy).selectinload(BookCopy.book))
            .where(
                and_(
                    BorrowRecord.status.in_([BorrowStatus.ACTIVE, BorrowStatus.PENDING])
                )
            )
            .order_by(BorrowRecord.user_id)
        )
        records = result.scalars().all()
        
        # Group by (user_id, book_id)
        user_book_map = {}
        for r in records:
            key = (r.user_id, r.copy.book_id)
            if key not in user_book_map:
                user_book_map[key] = []
            user_book_map[key].append(r)
            
        duplicates_found = False
        for (user_id, book_id), recs in user_book_map.items():
            if len(recs) > 1:
                duplicates_found = True

        if duplicates_found:
            print(f"\nFound logical duplicates. Cleaning up...")
            for (user_id, book_id), recs in user_book_map.items():
                if len(recs) > 1:
                    # Keep the first one, delete the rest
                    keep = recs[0]
                    to_delete = recs[1:]
                    print(f"Keeping Record {keep.id} for Book {book_id}")
                    
                    for d in to_delete:
                        print(f"  - Deleting Record {d.id} and freeing Copy {d.copy_id}")
                        # Update copy status to AVAILABLE
                        # We need to fetch the copy again to be attached to session if not already? 
                        # They are attached because we queried them.
                        d.copy.status = 'AVAILABLE' # Use string or enum
                        await session.delete(d)
            
            await session.commit()
            print("Cleanup complete.")
        else:
            print("\nNo logical duplicates found.")

if __name__ == "__main__":
    asyncio.run(inspect_logical_duplicates())
