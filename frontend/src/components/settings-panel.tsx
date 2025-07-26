"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"

export function SettingsPanel({ selectedModel, setSelectedModel, availableModels }: { selectedModel: string; setSelectedModel: (model: string) => void; availableModels: string[] }) {
  const [customModelInput, setCustomModelInput] = useState("");
  const [isCustomModelSelected, setIsCustomModelSelected] = useState(false);

  useEffect(() => {
    // Check if the currently selected model is not in the available models list
    // This implies it's a custom model
    if (selectedModel && !availableModels.includes(selectedModel)) {
      setIsCustomModelSelected(true);
      setCustomModelInput(selectedModel);
    } else {
      setIsCustomModelSelected(false);
      setCustomModelInput("");
    }
  }, [selectedModel, availableModels]);

  const models = availableModels.map(id => ({ id, name: id }));

  const handleModelChange = (value: string) => {
    if (value === "custom") {
      setIsCustomModelSelected(true);
      setSelectedModel(customModelInput || ""); // Set to current custom input or empty
    } else {
      setIsCustomModelSelected(false);
      setSelectedModel(value);
    }
  };

  const handleCustomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomModelInput(e.target.value);
    setSelectedModel(e.target.value);
  };

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Settings</h2>
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <span className="text-lg font-medium text-muted-foreground">Theme</span>
        <ThemeToggle />
      </div>
      <div className="flex items-center justify-between flex-wrap">
        <span className="text-lg font-medium text-muted-foreground">Model</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="min-w-[150px] justify-between px-4 py-2 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground">
              {isCustomModelSelected ? (customModelInput || "Custom Model") : (models.find(m => m.id === selectedModel)?.name || "Select Model")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 p-2 rounded-md shadow-lg bg-popover border border-border">
            <DropdownMenuLabel className="text-sm font-semibold text-muted-foreground px-2 py-1">Select Model</DropdownMenuLabel>
            <DropdownMenuSeparator className="my-1 border-t border-border" />
            <DropdownMenuRadioGroup value={isCustomModelSelected ? "custom" : selectedModel} onValueChange={handleModelChange}>
              {models.map((model) => (
                <DropdownMenuRadioItem key={model.id} value={model.id} className="px-2 py-1 rounded-sm cursor-pointer hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
                  {model.name}
                </DropdownMenuRadioItem>
              ))}
              <DropdownMenuRadioItem value="custom" className="px-2 py-1 rounded-sm cursor-pointer hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
                Other/Custom
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        {isCustomModelSelected && (
          <Input
            type="text"
            value={customModelInput}
            onChange={handleCustomInputChange}
            placeholder="Enter custom model name"
            className="mt-2 w-full rounded-md py-2 px-3 text-base bg-input border-border focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        )}
      </div>
    </div>
  )
}
