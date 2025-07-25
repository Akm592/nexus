from sqlalchemy.orm import Session
from sqlalchemy import and_
from . import models, schemas
from datetime import datetime
import uuid
import ulid

def create_conversation(db: Session, title: str):
    db_conversation = models.Conversation(id=str(uuid.uuid4()), title=title, created_at=datetime.utcnow())
    db.add(db_conversation)
    db.commit()
    db.refresh(db_conversation)
    return db_conversation

def get_conversations(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Conversation).offset(skip).limit(limit).all()

def get_conversation(db: Session, conversation_id: str):
    return db.query(models.Conversation).filter(models.Conversation.id == conversation_id).first()

def add_message(db: Session, conversation_id: str, role: str, content: str):
    db_message = models.Message(id=str(ulid.new()), conversation_id=conversation_id, role=role, content=content, timestamp=datetime.utcnow())
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    return db_message

def get_messages_by_conversation(db: Session, conversation_id: str, skip: int = 0, limit: int = 100):
    return db.query(models.Message).filter(models.Message.conversation_id == conversation_id).order_by(models.Message.timestamp).offset(skip).limit(limit).all()

def get_message_count_by_conversation(db: Session, conversation_id: str) -> int:
    return db.query(models.Message).filter(models.Message.conversation_id == conversation_id).count()

def update_conversation_title(db: Session, conversation_id: str, new_title: str):
    db_conversation = db.query(models.Conversation).filter(models.Conversation.id == conversation_id).first()
    if db_conversation:
        db_conversation.title = new_title
        db.commit()
        db.refresh(db_conversation)
    return db_conversation

def update_message_and_truncate_history(db: Session, message_id: str, new_content: str):
    # Step 1: Find the message to edit
    db_message = db.query(models.Message).filter(models.Message.id == message_id).first()
    if not db_message:
        return None # Message not found

    conversation_id = db_message.conversation_id
    edit_timestamp = db_message.timestamp

    # Step 2: Delete all messages in the same conversation that occurred AFTER the message being edited
    db.query(models.Message).filter(
        and_(
            models.Message.conversation_id == conversation_id,
            models.Message.timestamp > edit_timestamp
        )
    ).delete(synchronize_session=False)

    # Step 3: Update the content of the target message
    db_message.content = new_content
    db_message.timestamp = datetime.utcnow() # Optionally update timestamp to signify it's the latest
    
    db.commit()
    db.refresh(db_message)
    return db_message

def delete_conversation(db: Session, conversation_id: str):
    db_conversation = db.query(models.Conversation).filter(models.Conversation.id == conversation_id).first()
    if db_conversation:
        db.delete(db_conversation)
        db.commit()
        return True
    return False