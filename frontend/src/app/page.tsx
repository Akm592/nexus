"use client";

import { useState, FormEvent, useRef, useEffect, ChangeEvent } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Bot, User, Settings, MessageSquarePlus, Copy, Upload, Pencil } from "lucide-react";
import { v4 as uuidv4 } from 'uuid';
import { ThemeToggle } from "@/components/theme-toggle";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { SettingsPanel } from "@/components/settings-panel";
import { ConversationHistory } from "@/components/conversation-history";
import { toast } from "sonner";

interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  sources?: { source: string; [key: string]: any }[];
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState("qwen/qwen2-7b-instruct:free");
  const [currentSessionId, setCurrentSessionId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editedMessageContent, setEditedMessageContent] = useState<string>("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const [conversations, setConversations] = useState<any[]>([]);
  const [isConversationsLoading, setIsConversationsLoading] = useState(true);

  const fetchConversations = async () => {
    try {
      setIsConversationsLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/conversations`);
      if (!response.ok) {
        throw new Error("Failed to fetch conversations");
      }
      const data = await response.json();
      setConversations(data);
      if (data.length > 0) {
        setCurrentSessionId(data[0].id);
        fetchMessages(data[0].id);
      } else {
        await handleNewChat();
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
      setError("Failed to load conversations.");
      toast.error("Failed to load conversations.");
    } finally {
      setIsConversationsLoading(false);
    }
  };

  const fetchMessages = async (sessionId: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/conversations/${sessionId}/messages`);
      if (!response.ok) {
        throw new Error("Failed to fetch messages");
      }
      const data = await response.json();
      setMessages(data.map((msg: any) => ({ id: msg.id, text: msg.content, sender: msg.role })));
    } catch (error) {
      console.error("Error fetching messages:", error);
      setError(`Failed to load messages for session ${sessionId}.`);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  const handleNewChat = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/conversations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: `New Chat ${new Date().toLocaleString()}` }),
      });
      if (!response.ok) {
        throw new Error("Failed to create new conversation");
      }
      const newConversation = await response.json();
      setConversations((prev) => [newConversation, ...prev]);
      setCurrentSessionId(newConversation.id);
      setMessages([]);
    } catch (error) {
      console.error("Error creating new chat:", error);
      setError("Failed to create a new chat session.");
      toast.error("Failed to create a new chat session.");
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/conversations/${sessionId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete conversation");
      }

      

      const updatedConversations = conversations.filter((session) => session.id !== sessionId);
      setConversations(updatedConversations);
      toast.success("Conversation deleted successfully.");

      // If the deleted session was the current one, switch to the first available session or create a new one
      if (currentSessionId === sessionId) {
        if (updatedConversations.length > 0) {
          setCurrentSessionId(updatedConversations[0].id);
          fetchMessages(updatedConversations[0].id);
        } else {
          await handleNewChat();
        }
      }
    } catch (error) {
      console.error("Error deleting conversation:", error);
      setError("Failed to delete conversation.");
      toast.error("Failed to delete conversation.");
    }
  };

  const handleSelectSession = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    setMessages([]); // Clear messages immediately for better UX
    fetchMessages(sessionId);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const file = event.target.files[0];
      setSelectedFile(file);
      handleUpload(file);
      // Reset the input value to allow re-uploading the same file
      event.target.value = '';
    }
  };

  const handleUpload = async (file: File) => {
    if (!file) return;

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/rag_service/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to upload document");
      }

      const result = await response.json();
      console.log("Upload successful:", result);
    } catch (error: any) {
      console.error("Error uploading file:", error);
      setError(error.message || "An error occurred during file upload.");
    } finally {
      setIsUploading(false);
      setSelectedFile(null);
    }
  };

  const handleSaveEdit = async (messageId: string) => {
    try {
      // Optimistically update the UI
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === messageId ? { ...msg, text: editedMessageContent } : msg
        )
      );

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/messages/${messageId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editedMessageContent }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to update message");
      }

      toast.success("Message updated successfully.");
    } catch (error: any) {
      console.error("Error updating message:", error);
      setError(error.message || "Failed to update message.");
      toast.error("Failed to update message.");
      // Revert optimistic update if API call fails
      fetchMessages(currentSessionId); // Re-fetch messages to ensure consistency
    } finally {
      setEditingMessageId(null);
      setEditedMessageContent("");
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !currentSessionId) return;

    const userMessage: Message = { id: uuidv4(), text: input, sender: "user" };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input, model_name: selectedModel, session_id: currentSessionId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Network response was not ok");
      }

      const data = await response.json();
      const botMessage: Message = { id: uuidv4(), text: data.reply, sender: "bot", sources: data.sources };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error: any) {
      console.error("Failed to fetch chat response:", error);
      const errorMessage: Message = { id: uuidv4(), text: `Sorry, something went wrong: ${error.message}`, sender: "bot" };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar */}
      <div className="w-1/4 border-r flex flex-col p-4">
        <CardHeader className="border-b pb-4 mb-4 flex-row items-center justify-between">
          <CardTitle className="text-2xl font-bold text-primary">Nexus AI</CardTitle>
          <Button variant="ghost" size="icon" aria-label="New Chat" onClick={handleNewChat} className="text-primary hover:bg-primary/10">
            <MessageSquarePlus className="h-6 w-6" />
          </Button>
        </CardHeader>
        <ConversationHistory sessions={conversations} onSelectSession={handleSelectSession} onDeleteSession={handleDeleteSession} currentSessionId={currentSessionId} isLoading={isConversationsLoading} />
      </div>

      {/* Main Chat Panel */}
      <div className="flex flex-col flex-1 bg-card rounded-lg shadow-lg m-4 overflow-hidden">
        <Card className="w-full h-full flex flex-col shadow-none rounded-none border-none bg-transparent">
          <CardHeader className="border-b p-4 flex-row items-center justify-between bg-background/50 backdrop-blur-sm z-10">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src="/nexus-logo.png" alt="Nexus AI" />
                <AvatarFallback className="bg-primary text-primary-foreground"><Bot size={24} /></AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-xl font-semibold">Chat</CardTitle>
                <p className="text-sm text-muted-foreground">Your conversational AI assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Settings" className="text-muted-foreground hover:bg-muted/50">
                    <Settings className="h-5 w-5" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <SettingsPanel selectedModel={selectedModel} setSelectedModel={setSelectedModel} />
                </DialogContent>
              </Dialog>
              <ThemeToggle />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Button variant="ghost" size="icon" aria-label="Upload Document" asChild>
                  <span><Upload className="h-5 w-5" /></span>
                </Button>
              </label>
              <input
                id="file-upload"
                type="file"
                className="hidden"
                onChange={handleFileChange}
                accept=".pdf,.txt,.md"
              />
              {isUploading && <span className="text-sm text-muted-foreground ml-2">Uploading...</span>}
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-6 overflow-y-auto" ref={scrollAreaRef}>
            {error && (
              <div className="bg-destructive/20 text-destructive-foreground p-3 rounded-md text-center text-sm mb-4 border border-destructive">
                Error: {error}
              </div>
            )}
            <ScrollArea className="h-full pr-4">
              <div className="space-y-6">
                {messages.length === 0 && !isConversationsLoading && (
                  <div className="text-center text-muted-foreground mt-8">
                    <p>Start a conversation by typing a message below.</p>
                  </div>
                )}
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`flex items-start gap-3 ${msg.sender === "user" ? "justify-end" : ""}`}>
                    {msg.sender === 'bot' && (
                      <Avatar className="w-9 h-9 border bg-muted">
                        <AvatarFallback className="bg-primary text-primary-foreground"><Bot size={20} /></AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={`p-4 rounded-xl max-w-xl shadow-sm ${msg.sender === "user"
                          ? "bg-primary text-primary-foreground self-end rounded-br-none"
                          : "bg-muted rounded-tl-none border border-border"
                      }`}>
                      {editingMessageId === msg.id ? (
                        <Input
                          value={editedMessageContent}
                          onChange={(e) => setEditedMessageContent(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSaveEdit(msg.id);
                            }
                            if (e.key === 'Escape') {
                              setEditingMessageId(null);
                              setEditedMessageContent('');
                            }
                          }}
                          className="flex-grow rounded-md py-2 px-3 text-base"
                        />
                      ) : (
                        <p className="text-base whitespace-pre-wrap">{msg.text}</p>
                      )}
                      {msg.sender === 'bot' && (
                        <div className="flex items-center justify-between mt-2">
                           {msg.sources && msg.sources.length > 0 && (
                            <div className="text-xs text-muted-foreground">
                              <h4 className="font-semibold mb-1">Sources:</h4>
                              <div className="flex flex-wrap gap-2">
                                {msg.sources.map((source, index) => (
                                  <span key={index} className="bg-secondary px-2 py-1 rounded-full text-secondary-foreground text-xs font-medium" title={source.source}>
                                    {source.source.split('/').pop()}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:bg-muted/50 ml-auto"
                            onClick={() => navigator.clipboard.writeText(msg.text)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      {msg.sender === 'user' && editingMessageId !== msg.id && (
                        <div className="flex justify-end mt-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:bg-muted/50"
                            onClick={() => {
                              setEditingMessageId(msg.id);
                              setEditedMessageContent(msg.text);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      {msg.sender === 'user' && editingMessageId === msg.id && (
                        <div className="flex justify-end mt-2 space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingMessageId(null);
                              setEditedMessageContent('');
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleSaveEdit(msg.id)}
                          >
                            Save
                          </Button>
                        </div>
                      )}
                    </div>
                    {msg.sender === 'user' && (
                       <Avatar className="w-9 h-9 border bg-muted">
                        <AvatarFallback className="bg-accent text-accent-foreground"><User size={20} /></AvatarFallback>
                      </Avatar>
                    )}
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
          <div className="p-4 border-t bg-background/50 backdrop-blur-sm">
            <form onSubmit={handleSubmit} className="flex items-center gap-3">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-grow rounded-full py-3 px-5 text-base bg-input border-border focus:ring-2 focus:ring-primary focus:border-transparent"
                disabled={isLoading}
              />
              <Button type="submit" className="rounded-full w-12 h-12 bg-primary text-primary-foreground hover:bg-primary/90" disabled={isLoading || isUploading || !input.trim()}>
                {isLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground"></div>
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
}