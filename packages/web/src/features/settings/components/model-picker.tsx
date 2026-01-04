"use client";

import { useState, useMemo } from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useModels } from "../hooks/use-models";

interface ModelPickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

function formatPrice(price: string): string {
  const num = parseFloat(price);
  if (isNaN(num) || num === 0) return "Free";
  // Price is per token, convert to per 1M tokens for readability
  const perMillion = num * 1_000_000;
  if (perMillion < 0.01) return `$${perMillion.toFixed(4)}/M`;
  if (perMillion < 1) return `$${perMillion.toFixed(3)}/M`;
  return `$${perMillion.toFixed(2)}/M`;
}

export function ModelPicker({ value, onChange, disabled }: ModelPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data, isLoading, error } = useModels();

  // Memoize models array to prevent unstable dependencies in subsequent hooks
  const models = useMemo(() => data?.data ?? [], [data]);

  // Filter models based on search
  const filteredModels = useMemo(() => {
    if (!search) return models.slice(0, 50); // Show first 50 when no search
    const lowerSearch = search.toLowerCase();
    return models
      .filter(
        (m) =>
          m.id.toLowerCase().includes(lowerSearch) ||
          m.name.toLowerCase().includes(lowerSearch)
      )
      .slice(0, 50); // Limit results
  }, [models, search]);

  // Find selected model
  const selectedModel = useMemo(
    () => models.find((m) => m.id === value),
    [models, value]
  );

  const handleSelect = (modelId: string) => {
    onChange(modelId);
    setOpen(false);
    setSearch("");
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled || isLoading}
            className="w-full justify-between font-normal"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading models...
              </span>
            ) : selectedModel ? (
              <span className="truncate">{selectedModel.name}</span>
            ) : value ? (
              <span className="truncate text-muted-foreground">{value}</span>
            ) : (
              <span className="text-muted-foreground">Select a model...</span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search models..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              {error ? (
                <div className="p-4 text-sm text-destructive">
                  Failed to load models
                </div>
              ) : filteredModels.length === 0 ? (
                <CommandEmpty>No models found.</CommandEmpty>
              ) : (
                <CommandGroup>
                  {filteredModels.map((model) => (
                    <CommandItem
                      key={model.id}
                      value={model.id}
                      onSelect={() => handleSelect(model.id)}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <Check
                          className={cn(
                            "h-4 w-4 shrink-0",
                            value === model.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <span className="truncate">{model.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0 ml-2">
                        {formatPrice(model.pricing.prompt)}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {!error && filteredModels.length > 0 && search === "" && (
                <div className="p-2 text-xs text-muted-foreground text-center border-t">
                  Type to search {models.length} models
                </div>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Pricing display for selected model */}
      {selectedModel && (
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span>
            Prompt: <span className="font-medium">{formatPrice(selectedModel.pricing.prompt)}</span>
          </span>
          <span>
            Completion: <span className="font-medium">{formatPrice(selectedModel.pricing.completion)}</span>
          </span>
          {selectedModel.context_length && (
            <span>
              Context: <span className="font-medium">{(selectedModel.context_length / 1000).toFixed(0)}k</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
