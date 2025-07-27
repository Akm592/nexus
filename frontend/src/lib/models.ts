export const availableModels = [
  { id: 'qwen/qwen2-7b-instruct:free', name: 'Qwen2-7B-Instruct' },
  { id: 'qwen/qwen2-72b-instruct:free', name: 'Qwen2-72B-Instruct' },
  { id: 'mistralai/mistral-7b-instruct:free', name: 'Mistral-7B-Instruct' },
  { id: 'google/gemma-2-9b-it:free', name: 'Gemma-2-9B-IT' },
  { id: 'meta-llama/llama-3.1-8b-instruct:free', name: 'Llama-3.1-8B-Instruct' },
  { id: 'deepseek/deepseek-chat:free', name: 'Deepseek-Chat' },
];

export interface Message {
  id: string;
  conversation_id: string;
  role: string;
  content: string;
  timestamp: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  messages: Message[];
}

export interface Persona {
  id: string;
  name: string;
  model_name: string;
  system_prompt: string;
  temperature: number;
  created_at: string;
}

export interface CreatePersonaData {
  name: string;
  model_name: string;
  system_prompt: string;
  temperature: number;
}
