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
import { useState } from "react"
import { availableModels } from "@/lib/models"

export function SettingsPanel({ selectedModel, setSelectedModel }: { selectedModel: string; setSelectedModel: (model: string) => void }) {

  const models = availableModels

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Settings</h2>
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <span className="text-lg font-medium text-muted-foreground">Theme</span>
        <ThemeToggle />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-lg font-medium text-muted-foreground">Model</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="min-w-[150px] justify-between px-4 py-2 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground">
              {models.find(m => m.id === selectedModel)?.name}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 p-2 rounded-md shadow-lg bg-popover border border-border">
            <DropdownMenuLabel className="text-sm font-semibold text-muted-foreground px-2 py-1">Select Model</DropdownMenuLabel>
            <DropdownMenuSeparator className="my-1 border-t border-border" />
            <DropdownMenuRadioGroup value={selectedModel} onValueChange={setSelectedModel}>
              {models.map((model) => (
                <DropdownMenuRadioItem key={model.id} value={model.id} className="px-2 py-1 rounded-sm cursor-pointer hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground">
                  {model.name}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
