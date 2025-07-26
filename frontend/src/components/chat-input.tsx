import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Paperclip, Send } from "lucide-react";
import { ChangeEvent, FormEvent } from "react";

interface ChatInputProps {
  input: string;
  setInput: (input: string) => void;
  handleFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (event: FormEvent) => void;
  isLoading: boolean;
  isUploading: boolean;
}

export function ChatInput({ input, setInput, handleFileChange, handleSubmit, isLoading, isUploading }: ChatInputProps) {
  return (
    <form onSubmit={handleSubmit} className="relative">
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type your message..."
        className="flex-grow rounded-full py-3 px-5 text-base bg-input border-border focus:ring-2 focus:ring-primary focus:border-transparent pr-24"
        disabled={isLoading || isUploading}
      />
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-2">
        <label htmlFor="file-upload" className="cursor-pointer">
          <Button variant="ghost" size="icon" asChild>
            <span><Paperclip className="h-4 w-4" /></span>
          </Button>
        </label>
        <input
          id="file-upload"
          type="file"
          className="hidden"
          onChange={handleFileChange}
          accept=".pdf"
        />
        <Button type="submit" size="icon" disabled={isLoading || isUploading || !input.trim()}>
          {isLoading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground"></div>
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </form>
  );
}