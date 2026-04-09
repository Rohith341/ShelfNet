from pydantic import BaseModel
from typing import Optional

class UserCreate(BaseModel):
    name: str
    email: str
    role: str
    password: str
    warehouse_id: Optional[str] = None
