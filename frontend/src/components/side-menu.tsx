import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Settings } from "lucide-react"
import { cn } from "@/lib/utils"
import { PersonaManager } from "./PersonaManager"
import OllamaManager from "./OllamaManager"
import { useChatStore } from "@/lib/store"

interface SideMenuProps {
  selectedModel: string
  setSelectedModel: (model: string) => void
  availableModels: string[]
}

export function SideMenu({
  selectedModel,
  setSelectedModel,
  availableModels,
}: SideMenuProps) {
  const { personas, activePersonaId, setActivePersonaId, fetchPersonas } = useChatStore();

  React.useEffect(() => {
    fetchPersonas();
  }, [fetchPersonas]);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
          <Settings className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      {/* Glassmorphism styles are applied here.
        - bg-background/80: Sets a semi-transparent background.
        - backdrop-blur-lg: Applies the blur effect to content behind the sheet.
        - The default border from the original Sheet component is maintained.
      */}
      <SheetContent className="bg-background/80 backdrop-blur-lg">
        <SheetHeader>
          <SheetTitle>Settings</SheetTitle>
        </SheetHeader>
        <div className="grid gap-6 py-6">
          <div className="grid grid-cols-3 items-center gap-4">
            <label htmlFor="model" className="text-sm text-muted-foreground">
              Model
            </label>
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="col-span-2">
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              {/* For full consistency, you could also apply glassmorphism
                to the SelectContent component in its own file (`select.tsx`).
              */}
              <SelectContent>
                {(availableModels || []).map((model) => (
                  <SelectItem key={model} value={model}>
                    {model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <label htmlFor="persona" className="text-sm text-muted-foreground">
              Persona
            </label>
            <Select value={activePersonaId || ""} onValueChange={setActivePersonaId}>
              <SelectTrigger className="col-span-2">
                <SelectValue placeholder="Select a persona" />
              </SelectTrigger>
              <SelectContent>
                {personas.map((persona) => (
                  <SelectItem key={persona.id} value={persona.id}>
                    {persona.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <PersonaManager />
          <OllamaManager />
        </div>
      </SheetContent>
    </Sheet>
  )
}
