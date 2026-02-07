"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getOllamaModels, pullOllamaModel, deleteOllamaModel } from "@/lib/api";
import { toast } from "sonner";

interface OllamaManagerProps {
  onModelChange: () => void;
}

export function OllamaManager({ onModelChange }: OllamaManagerProps) {
  const [modelName, setModelName] = useState("");
  const [localModels, setLocalModels] = useState<any[]>([]);
  const [pulling, setPulling] = useState(false);
  const [pullProgress, setPullProgress] = useState("");

  const fetchLocalModels = async () => {
    try {
      const models = await getOllamaModels();
      setLocalModels(models);
    } catch (error) {
      toast.error("Failed to fetch local models.");
      console.error("Failed to fetch local models:", error);
    }
  };

  useEffect(() => {
    fetchLocalModels();
  }, []);

  const handlePullModel = async () => {
    if (!modelName) {
      toast.warning("Please enter a model name to pull.");
      return;
    }

    setPulling(true);
    setPullProgress("");

    try {
      const response = await pullOllamaModel(modelName);
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Failed to get reader for pull stream.");
      }

      const decoder = new TextDecoder();
      let result;
      while (!(result = await reader.read()).done) {
        const chunk = decoder.decode(result.value, { stream: true });
        chunk.split('\n').forEach(line => {
          if (line.trim()) {
            try {
              const data = JSON.parse(line);
              if (data.status) {
                setPullProgress(data.status);
              }
              if (data.error) {
                throw new Error(data.error);
              }
            } catch (e) {
              console.error("Error parsing pull stream chunk:", e);
            }
          }
        });
      }
      toast.success(`${modelName} pulled successfully!`);
      setModelName("");
      fetchLocalModels();
      onModelChange(); // Notify parent to refresh models
    } catch (error: any) {
      toast.error(`Failed to pull model: ${error.message || "Unknown error"}`);
      console.error("Failed to pull model:", error);
    } finally {
      setPulling(false);
    }
  };

  const handleDeleteModel = async (model: string) => {
    if (!confirm(`Are you sure you want to delete ${model}?`)) {
      return;
    }
    try {
      await deleteOllamaModel(model);
      toast.success(`${model} deleted successfully!`);
      fetchLocalModels();
      onModelChange(); // Notify parent to refresh models
    } catch (error) {
      toast.error("Failed to delete model.");
      console.error("Failed to delete model:", error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Pull Model Section */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Pull Model</h3>
        <div className="flex space-x-2">
          <Input
            placeholder="e.g., llama3:latest"
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
            disabled={pulling}
          />
          <Button onClick={handlePullModel} disabled={pulling}>
            {pulling ? "Pulling..." : "Pull"}
          </Button>
        </div>
        {pullProgress && <p className="text-sm text-muted-foreground">{pullProgress}</p>}
      </div>

      {/* Local Models List Section */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Local Models</h3>
        {localModels.length === 0 ? (
          <p className="text-muted-foreground">No local models found. Pull one to get started!</p>
        ) : (
          <ScrollArea className="h-[200px] w-full rounded-md border p-4">
            <ul className="space-y-2">
              {localModels.map((model) => (
                <li key={model.name} className="flex items-center justify-between">
                  <span>{model.name}</span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteModel(model.name)}
                  >
                    Delete
                  </Button>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}