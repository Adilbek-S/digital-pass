from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from jose import JWTError

from app.core.security import decode_signed_file_token

router = APIRouter(prefix="/files", tags=["files"])


@router.get("/download")
def download_file(token: str):
    try:
        file_path = decode_signed_file_token(token)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired download link")

    path = Path(file_path)
    if not path.exists() or not path.is_file():
        raise HTTPException(status_code=404, detail="File not found or already deleted")

    # Guard against path traversal
    try:
        path.resolve().relative_to(Path("uploads").resolve())
    except ValueError:
        raise HTTPException(status_code=403, detail="Forbidden")

    return FileResponse(path, filename=path.name)
