import os
import uuid
import aiofiles
from pathlib import Path
from typing import Optional
from fastapi import UploadFile, HTTPException, status

from app.config import settings


async def save_upload_file(upload_file: UploadFile, subdirectory: str = "covers") -> str:
    """
    Save uploaded file to disk
    
    Args:
        upload_file: FastAPI UploadFile object
        subdirectory: Subdirectory within UPLOAD_DIR (e.g., 'covers', 'news')
    
    Returns:
        Relative path to saved file
    
    Raises:
        HTTPException: If file is invalid or save fails
    """
    # Validate file
    if not upload_file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No file provided"
        )
    
    # Check file extension
    file_ext = upload_file.filename.split('.')[-1].lower()
    if file_ext not in settings.allowed_extensions_list:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Allowed types: {', '.join(settings.allowed_extensions_list)}"
        )
    
    # Check file size
    contents = await upload_file.read()
    if len(contents) > settings.MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Max size: {settings.MAX_UPLOAD_SIZE / 1024 / 1024}MB"
        )
    
    # Reset file pointer
    await upload_file.seek(0)
    
    # Generate unique filename
    unique_filename = f"{uuid.uuid4()}.{file_ext}"
    
    # Create directory if not exists
    upload_dir = Path(settings.UPLOAD_DIR) / subdirectory
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # Save file
    file_path = upload_dir / unique_filename
    
    try:
        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(contents)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save file: {str(e)}"
        )
    
    # Return relative path
    return f"/{settings.UPLOAD_DIR}/{subdirectory}/{unique_filename}"


async def delete_upload_file(file_path: str) -> bool:
    """
    Delete uploaded file from disk
    
    Args:
        file_path: Relative path to file (e.g., '/uploads/covers/abc.jpg')
    
    Returns:
        True if deleted successfully, False otherwise
    """
    try:
        # Remove leading slash if present
        if file_path.startswith('/'):
            file_path = file_path[1:]
        
        full_path = Path(file_path)
        
        if full_path.exists() and full_path.is_file():
            full_path.unlink()
            return True
        return False
    except Exception:
        return False


def validate_image_file(upload_file: UploadFile) -> None:
    """
    Validate that uploaded file is an image
    
    Args:
        upload_file: FastAPI UploadFile object
    
    Raises:
        HTTPException: If file is not a valid image
    """
    if not upload_file.content_type or not upload_file.content_type.startswith('image/'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be an image"
        )
