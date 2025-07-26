import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Trash2, MessageSquare, Bot } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface ConversationHistoryProps {
  sessions: { id: string; title: string }[]; // Using a more specific type for clarity
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  currentSessionId: string | null; // Allow null for when no session is selected
  isLoading: boolean;
}

export function ConversationHistory({ 
  sessions, 
  onSelectSession, 
  onDeleteSession, 
  currentSessionId, 
  isLoading 
}: ConversationHistoryProps) {
  return (
    // Main container with Glassmorphism effect
    // - backdrop-blur-lg: Applies the blur to content behind this element
    // - bg-background/60: A semi-transparent background. Adapts to light/dark mode.
    // - border: A subtle border to define the "glass" edge.
    <ScrollArea className="h-full flex-1 rounded-lg border bg-background/60 p-2 backdrop-blur-lg">
      <div className="space-y-1 p-1">
        {isLoading ? (
          // Polished skeleton loaders
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-10 w-full rounded-md bg-primary/5 animate-pulse"></div>
          ))
        ) : (
          <>
            {(sessions || []).length === 0 ? (
              // Enhanced empty state
              <div className="flex flex-col items-center justify-center h-full text-center p-8 text-muted-foreground">
                <Bot className="h-10 w-10 mb-4 opacity-50" />
                <h3 className="text-base font-medium">No History</h3>
                <p className="text-xs text-muted-foreground/80 mt-1">
                  Start a new conversation to see it here.
                </p>
              </div>
            ) : (
              (sessions || []).map((session) => (
                <div key={session.id} className="flex items-center group relative">
                  <Button
                    variant="ghost"
                    className={cn(
                      "flex w-full items-center justify-start text-left px-3 py-2 rounded-md transition-all duration-200",
                      "hover:bg-primary/10 hover:text-primary",
                      currentSessionId === session.id 
                        ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:text-primary-foreground" 
                        : "text-muted-foreground"
                    )}
                    onClick={() => onSelectSession(session.id)}
                  >
                    <MessageSquare className="h-4 w-4 mr-3 flex-shrink-0" />
                    <span className="truncate flex-1">{session.title || "New Conversation"}</span>
                  </Button>
                  
                  {/* The delete button is now positioned absolutely within the group */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity duration-200",
                          "text-muted-foreground hover:bg-destructive/10 hover:text-destructive",
                           // Hide delete button on the active chat to prevent accidental deletion
                          currentSessionId === session.id && "hidden"
                        )}
                        aria-label="Delete conversation"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete your conversation.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => onDeleteSession(session.id)}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </ScrollArea>
  )
}