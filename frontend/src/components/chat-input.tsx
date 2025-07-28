import { Button } from "@/components/ui/button";
import TextareaAutosize from "react-textarea-autosize";
import { Paperclip, Send, X } from "lucide-react";
import { ChangeEvent, FormEvent } from "react";

interface ChatInputProps {
  input: string;
  setInput: (input: string) => void;
  handleSubmit: (event: FormEvent) => void;
  isLoading: boolean;
  isUploading: boolean;
  fileName: string | null;
  handleFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  handleClearFile: () => void;
}

export function ChatInput({
  input,
  setInput,
  handleSubmit,
  isLoading,
  isUploading,
  fileName,
  handleFileChange,
  handleClearFile,
}: ChatInputProps) {
  const showSendButton = input.trim().length > 0 || !!fileName;
  const isDisabled = isLoading || isUploading;

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  return (
    <div className="flex w-full flex-col gap-2">
      {fileName && !isUploading && (
        <div className="flex animate-in fade-in-0 slide-in-from-bottom-2 duration-300 items-center justify-between rounded-lg border bg-muted/50 p-2 pl-3 text-sm">
          <div className="flex items-center gap-2">
            <Paperclip className="h-4 w-4" />
            <span className="truncate">{fileName}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleClearFile}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="relative w-full">
        <TextareaAutosize
          value={input}
          onChange={handleInputChange}
          placeholder="Type your message..."
          maxRows={8}
          className="scrollbar-hide flex min-h-[48px] w-full resize-none rounded-2xl border border-input bg-background px-5 py-3 pr-12 text-base ring-offset-background transition-all duration-200 ease-in-out placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          disabled={isDisabled}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e as unknown as FormEvent);
            }
          }}
        />

        {/* Better aligned icon container */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center">
          {showSendButton ? (
            <Button type="submit" size="icon" className="h-8 w-8" disabled={isDisabled}>
              {isLoading || isUploading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-primary-foreground"></div>
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          ) : (
            <label htmlFor="file-upload">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                asChild
                type="button"
                disabled={isDisabled}
              >
                <span>
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                </span>
              </Button>
              <input
                id="file-upload"
                type="file"
                className="hidden"
                onChange={handleFileChange}
                accept=".pdf"
                disabled={isDisabled}
              />
            </label>
          )}
        </div>
      </form>
    </div>
  );
}
