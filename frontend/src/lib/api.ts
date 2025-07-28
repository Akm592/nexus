import { Conversation, Message, ConversationSummary, Persona, CreatePersonaData } from './models';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

export const fetchConversations = async (): Promise<ConversationSummary[]> => {
  const response = await fetch(`${API_BASE_URL}/conversations`);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
};

export const fetchMessagesByConversationId = async (conversationId: string): Promise<Message[]> => {
  const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}/messages`);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
};

export const createConversation = async (title: string): Promise<Conversation> => {
  const response = await fetch(`${API_BASE_URL}/conversations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title }),
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
};

export const deleteConversation = async (conversationId: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
};

export const updateMessage = async (messageId: string, newContent: string): Promise<Message> => {
  const response = await fetch(`${API_BASE_URL}/messages/${messageId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content: newContent }),
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
};

export const fetchAvailableModels = async (): Promise<string[]> => {
  const response = await fetch(`${API_BASE_URL}/models`);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const data = await response.json();
  return data.models;
};

export const getOllamaModels = async (): Promise<any[]> => {
  const response = await fetch(`${API_BASE_URL}/api/ollama/models`);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const data = await response.json();
  return data.models;
};

export const pullOllamaModel = async (modelName: string): Promise<Response> => {
  const response = await fetch(`${API_BASE_URL}/api/ollama/pull`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: modelName }),
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response;
};

export const deleteOllamaModel = async (modelName: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/ollama/models/${modelName}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
};

export const getPersonas = async (): Promise<Persona[]> => {
  const response = await fetch(`${API_BASE_URL}/personas`);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
};

export const createPersona = async (personaData: CreatePersonaData): Promise<Persona> => {
  const response = await fetch(`${API_BASE_URL}/personas`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(personaData),
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
};

export const updatePersona = async (personaId: string, personaData: CreatePersonaData): Promise<Persona> => {
  const response = await fetch(`${API_BASE_URL}/personas/${personaId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(personaData),
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
};

export const deletePersona = async (personaId: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/personas/${personaId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
};
