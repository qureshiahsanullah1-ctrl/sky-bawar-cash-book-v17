from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from .. import schemas
from ..crud import settings as crud_settings
from ..auth_dependencies import require_authenticated_request
from ..database import get_db

router = APIRouter(
    prefix="/api/settings",
    tags=["settings"],
    dependencies=[Depends(require_authenticated_request)],
)

@router.get("", response_model=schemas.SettingRead)
@router.get("/", response_model=schemas.SettingRead, include_in_schema=False)
def read_settings(db: Session = Depends(get_db)):
    return crud_settings.get_settings(db)


@router.put("", response_model=schemas.SettingRead)
@router.put("/", response_model=schemas.SettingRead, include_in_schema=False)
@router.post("", response_model=schemas.SettingRead, include_in_schema=False)
@router.post("/", response_model=schemas.SettingRead, include_in_schema=False)
def update_settings(payload: schemas.SettingUpdate, db: Session = Depends(get_db)):
    return crud_settings.update_settings(db, payload)
