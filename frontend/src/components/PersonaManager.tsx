'use client';

import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ScrollArea } from './ui/scroll-area';
import { createPersona, getPersonas, updatePersona, deletePersona } from '@/lib/api';
import { Persona, CreatePersonaData } from '@/lib/models';
import { useChatStore } from '@/lib/store';

export function PersonaManager() {
  const { personas, fetchPersonas, availableModels } = useChatStore();
  const [selectedPersona, setSelectedPersona] = useState<Persona | null>(null);
  const [isNewPersona, setIsNewPersona] = useState(false);
  const [formState, setFormState] = useState<CreatePersonaData>({
    name: '',
    model_name: '',
    system_prompt: '',
    temperature: 0.7,
  });
  

  useEffect(() => {
    fetchPersonas();
  }, [fetchPersonas]);

  useEffect(() => {
    if (selectedPersona) {
      setFormState({
        name: selectedPersona.name,
        model_name: selectedPersona.model_name,
        system_prompt: selectedPersona.system_prompt,
        temperature: selectedPersona.temperature,
      });
      setIsNewPersona(false);
    } else {
      handleCreateNew(); // Set to new persona state
    }
  }, [selectedPersona]);

  const handleSelectPersona = (persona: Persona) => {
    setSelectedPersona(persona);
  };

  const handleCreateNew = () => {
    setSelectedPersona(null);
    setIsNewPersona(true);
    setFormState({
      name: '',
      model_name: availableModels.length > 0 ? availableModels[0] : '', // Default to first available model
      system_prompt: '',
      temperature: 0.7,
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSliderChange = (value: number[]) => {
    setFormState((prev) => ({ ...prev, temperature: value[0] }));
  };

  const handleModelChange = (value: string) => {
    setFormState((prev) => ({ ...prev, model_name: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isNewPersona) {
        await createPersona(formState);
      } else if (selectedPersona) {
        await updatePersona(selectedPersona.id, formState);
      }
      await fetchPersonas();
      // Optionally close dialog on save, or just clear selection
      // For this example, we clear selection and reset to the "Create New" state
      handleCreateNew();
    } catch (error) {
      console.error("Failed to save persona:", error);
      alert("Failed to save persona. Please check the console for details.");
    }
  };

  const handleDelete = async () => {
    if (selectedPersona && !isNewPersona) {
      if (confirm(`Are you sure you want to delete the persona "${selectedPersona.name}"?`)) {
        try {
          await deletePersona(selectedPersona.id);
          await fetchPersonas();
          setSelectedPersona(null); // Clear selection after delete
        } catch (error) {
          console.error("Failed to delete persona:", error);
          alert("Failed to delete persona. Please check the console for details.");
        }
      }
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full rounded-lg">Manage Personas</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl h-[70vh] min-h-[600px] flex flex-col bg-background/80 backdrop-blur-md border rounded-2xl shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">Manage Personas</DialogTitle>
        </DialogHeader>
        <div className="flex flex-grow overflow-hidden gap-6 pt-2">
          {/* Left Pane: Persona List */}
          <div className="w-1/3 border-r border-border/30 pr-6 flex flex-col gap-4">
            <Button onClick={handleCreateNew} className="w-full rounded-lg">
              + Create New Persona
            </Button>
            <ScrollArea className="flex-grow">
              <div className="flex flex-col gap-1 pr-1">
                {personas.map((persona) => (
                  <Button
                    key={persona.id}
                    variant={selectedPersona?.id === persona.id ? "secondary" : "ghost"}
                    className="w-full justify-start mb-1 rounded-lg transition-all duration-200"
                    onClick={() => handleSelectPersona(persona)}
                  >
                    {persona.name}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Right Pane: Persona Form */}
          <div className="w-2/3 flex flex-col">
            <ScrollArea className="h-full pr-2">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-foreground/80 mb-1.5">Persona Name</label>
                  <Input
                    id="name"
                    name="name"
                    value={formState.name}
                    onChange={handleChange}
                    required
                    className="bg-transparent rounded-lg border-border/50"
                    placeholder="e.g., Sarcastic Assistant"
                  />
                </div>
                <div>
                  <label htmlFor="model_name" className="block text-sm font-medium text-foreground/80 mb-1.5">Model</label>
                  <Select onValueChange={handleModelChange} value={formState.model_name}>
                    <SelectTrigger className="w-full bg-transparent rounded-lg border-border/50">
                      <SelectValue placeholder="Select a model" />
                    </SelectTrigger>
                    <SelectContent className="bg-background/90 backdrop-blur-md border-border/50 rounded-xl">
                      {availableModels.map((model) => (
                        <SelectItem key={model} value={model} className="rounded-md">
                          {model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label htmlFor="system_prompt" className="block text-sm font-medium text-foreground/80 mb-1.5">System Prompt</label>
                  <Textarea
                    id="system_prompt"
                    name="system_prompt"
                    value={formState.system_prompt}
                    onChange={handleChange}
                    rows={8}
                    required
                    className="bg-transparent rounded-lg border-border/50 min-h-[150px]"
                    placeholder="You are a helpful assistant that always responds with a touch of sarcasm."
                  />
                </div>
                <div className="pt-2">
                  <label htmlFor="temperature" className="block text-sm font-medium text-foreground/80 mb-2">
                    Temperature: {formState.temperature.toFixed(2)}
                  </label>
                  <Slider
                    id="temperature"
                    name="temperature"
                    min={0}
                    max={1}
                    step={0.01}
                    value={[formState.temperature]}
                    onValueChange={handleSliderChange}
                  />
                </div>
                <div className="flex justify-end space-x-3 pt-4">
                  {!isNewPersona && selectedPersona && (
                    <Button type="button" variant="destructive" onClick={handleDelete} className="rounded-lg">
                      Delete
                    </Button>
                  )}
                  <Button type="submit" className="rounded-lg">{isNewPersona ? "Create Persona" : "Save Changes"}</Button>
                </div>
              </form>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}