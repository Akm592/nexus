import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Bot, User, Copy } from "lucide-react";

interface MessageProps {
  message: {
    id: string;
    text: string;
    sender: "user" | "bot";
    sources?: { source: string; [key: string]: any }[];
  };
}

export function ChatMessage({ message }: MessageProps) {
  return (
    <motion.div
      key={message.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex items-start gap-3 ${message.sender === "user" ? "justify-end" : ""}`}>
      {message.sender === 'bot' && (
        <Avatar className="w-9 h-9 border bg-muted">
          <AvatarFallback className="bg-primary text-primary-foreground"><Bot size={20} /></AvatarFallback>
        </Avatar>
      )}
      <div
        className={`p-4 rounded-xl max-w-md shadow-sm ${ 
          message.sender === "user"
            ? "bg-primary text-primary-foreground self-end rounded-br-none" 
            : "bg-muted rounded-tl-none border border-border"
        }`}>
        <p className="text-base whitespace-pre-wrap">{message.text}</p>
        {message.sender === 'bot' && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 mt-2 text-muted-foreground hover:bg-muted/50"
            onClick={() => navigator.clipboard.writeText(message.text)}
          >
            <Copy className="h-4 w-4" />
          </Button>
        )}
        {message.sender === 'bot' && message.sources && message.sources.length > 0 && (
          <div className="mt-3 text-xs text-muted-foreground">
            <h4 className="font-semibold mb-1">Sources:</h4>
            <div className="flex flex-wrap gap-2">
              {message.sources.map((source, index) => (
                <span key={index} className="bg-secondary px-2 py-1 rounded-full text-secondary-foreground text-xs font-medium">
                  {source.source.split('/').pop()} 
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      {message.sender === 'user' && (
         <Avatar className="w-9 h-9 border bg-muted">
          <AvatarFallback className="bg-accent text-accent-foreground"><User size={20} /></AvatarFallback>
        </Avatar>
      )}
    </motion.div>
  );
}