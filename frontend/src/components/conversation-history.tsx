import React from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Trash2, MessageSquare, Bot } from "lucide-react";
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
} from "@/components/ui/alert-dialog";

// Props definition for the component
interface ConversationHistoryProps {
  sessions: { id:string; title: string }[];
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  currentSessionId: string | null;
  isLoading: boolean;
}

/**
 * A minimalist component to display conversation history.
 * It features a clean layout, subtle hover effects, and a clear empty state.
 */
export function ConversationHistory({ 
  sessions, 
  onSelectSession, 
  onDeleteSession, 
  currentSessionId, 
  isLoading 
}: ConversationHistoryProps) {
  return (
    // The main container uses a simple, clean background without the glassmorphism effect for a more minimal look.
    <ScrollArea className="h-full flex-1 dark:bg-transparent rounded-lg p-2">
      <div className="p-1">
        {isLoading ? (
          // Skeleton loaders for a better loading experience.
          // They mimic the layout of the actual content.
          Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-10 w-full rounded-md bg-gray-200 dark:bg-gray-800 animate-pulse my-1.5"></div>
          ))
        ) : (
          <>
            {sessions && sessions.length === 0 ? (
              // A clean and simple empty state message.
              <div className="flex flex-col items-center justify-center h-full text-center p-8 text-gray-500 dark:text-gray-400">
                <Bot className="h-9 w-9 mb-3 opacity-60" />
                <h3 className="text-sm font-medium">No History Yet</h3>
                <p className="text-xs text-gray-500/80 dark:text-gray-400/80 mt-1">
                  Your new conversations will appear here.
                </p>
              </div>
            ) : (
              // Mapping over sessions to display them.
              (sessions || []).map((session) => (
                <div key={session.id} className="group relative flex items-center">
                  <Button
                    variant="ghost"
                    className={cn(
                      "flex w-full items-center justify-start text-left px-3 py-2 rounded-md transition-colors duration-150",
                      "text-gray-600 dark:text-gray-300",
                      "hover:bg-gray-200/50 dark:hover:bg-gray-800/50",
                      currentSessionId === session.id 
                        ? "bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-50 font-medium" 
                        : ""
                    )}
                    onClick={() => onSelectSession(session.id)}
                  >
                    <MessageSquare className="h-4 w-4 mr-3 flex-shrink-0 opacity-70" />
                    <span className="truncate flex-1 text-sm">{session.title || "New Conversation"}</span>
                  </Button>
                  
                  {/* Delete button appears on hover for a cleaner look */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity duration-200",
                          "text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-500",
                          "hover:bg-red-100/50 dark:hover:bg-red-900/20",
                          currentSessionId === session.id && "opacity-0" // Ensure it's hidden on active chat
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
                          This will permanently delete this conversation. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          className="bg-red-600 text-white hover:bg-red-700"
                          onClick={(e) => {
                              e.stopPropagation(); // Prevent the session from being selected
                              onDeleteSession(session.id);
                          }}
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

export default ConversationHistory;
