import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Trash2 } from "lucide-react"
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
  sessions: any[];
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  currentSessionId: string;
  isLoading: boolean;
}

export function ConversationHistory({ sessions, onSelectSession, onDeleteSession, currentSessionId, isLoading }: ConversationHistoryProps) {
  return (
    <ScrollArea className="flex-1 p-4">
      <div className="space-y-2">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 w-full bg-muted rounded-md animate-pulse"></div>
          ))
        ) : (
          <>
            {(sessions || []).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No conversations yet. Start a new chat!</p>
            )}
            {(sessions || []).map((session) => (
              <div key={session.id} className="flex items-center group">
                <Button
                  variant="ghost"
                  className={cn(
                    "flex-1 justify-start text-left px-3 py-2 rounded-lg transition-colors duration-200",
                    "hover:bg-primary/10 hover:text-primary",
                    currentSessionId === session.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"
                  )}
                  onClick={() => onSelectSession(session.id)}
                >
                  <span className="truncate">{session.title}</span>
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-muted-foreground hover:text-destructive"
                      aria-label="Delete conversation"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your conversation and remove its data from our servers.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onDeleteSession(session.id)}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </>
        )}
      </div>
    </ScrollArea>
  )
}