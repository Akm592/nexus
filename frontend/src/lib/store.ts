import { create } from 'zustand';
import { Persona } from './models';
import { fetchAvailableModels, getPersonas } from './api';

interface ChatState {
  conversations: any[]; // Replace with actual Conversation type
  activeConversationId: string | null;
  messages: any[]; // Replace with actual Message type
  availableModels: string[];
  personas: Persona[];
  activePersonaId: string | null;
  fetchConversations: () => void;
  setActiveConversationId: (id: string | null) => void;
  fetchMessages: (conversationId: string) => void;
  fetchModels: () => void;
  fetchPersonas: () => void;
  setActivePersonaId: (id: string | null) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messages: [],
  availableModels: [],
  personas: [],
  activePersonaId: null,

  fetchConversations: async () => {
    // Implement fetching conversations
  },
  setActiveConversationId: (id) => set({ activeConversationId: id }),
  fetchMessages: async (conversationId) => {
    // Implement fetching messages
  },
  fetchModels: async () => {
    try {
      const models = await fetchAvailableModels();
      set({ availableModels: models });
    } catch (error) {
      console.error("Failed to fetch models:", error);
    }
  },
  fetchPersonas: async () => {
    try {
      const personas = await getPersonas();
      set({ personas });
    } catch (error) {
      console.error("Failed to fetch personas:", error);
    }
  },
  setActivePersonaId: (id) => set({ activePersonaId: id }),
}));
