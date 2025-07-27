from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional

class MessageBase(BaseModel):
    role: str
    content: str

class MessageCreate(MessageBase):
    pass

class MessageUpdate(BaseModel):
    content: str

class Message(MessageBase):
    id: str
    conversation_id: str
    timestamp: datetime

    class Config:
        # Pydantic's `from_attributes = True` enables the ORM mode.
        # This tells Pydantic to read data from attributes rather than dictionary keys,
        # which is necessary when mapping Pydantic models to SQLAlchemy ORM models.
        from_attributes = True

class ConversationBase(BaseModel):
    title: str

class ConversationCreate(ConversationBase):
    pass

class Conversation(ConversationBase):
    id: str
    created_at: datetime
    messages: List[Message] = []

    class Config:
        # Pydantic's `from_attributes = True` enables the ORM mode.
        # This tells Pydantic to read data from attributes rather than dictionary keys,
        # which is necessary when mapping Pydantic models to SQLAlchemy ORM models.
        from_attributes = True

class ConversationSummary(ConversationBase):
    id: str
    created_at: datetime

    class Config:
        # Pydantic's `from_attributes = True` enables the ORM mode.
        # This tells Pydantic to read data from attributes rather than dictionary keys,
        # which is necessary when mapping Pydantic models to SQLAlchemy ORM models.
        from_attributes = True

class PersonaBase(BaseModel):
    name: str
    model_name: str
    system_prompt: str
    temperature: float

class PersonaCreate(PersonaBase):
    pass

class Persona(PersonaBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True