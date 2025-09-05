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
        from_attributes = True

class ConversationSummary(ConversationBase):
    id: str
    created_at: datetime

    class Config:
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

class ModelName(BaseModel):
    name: str

class ChatRequest(BaseModel):
    message: str
    conversation_id: str
    persona_id: Optional[str] = None
    use_rag: bool = True