"use client";

import { useState, useCallback } from "react";
import { useConfigurationByCategory, useUpdateConfiguration } from "../hooks/use-configuration";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Save, RotateCcw, Loader2 } from "lucide-react";
import { ModelPicker } from "./model-picker";
import type { Configuration, SummarySettings } from "../types/configuration";

interface FormErrors {
  model?: string;
  max_tokens?: string;
  history_count?: string;
  temperature?: string;
}

const SUMMARY_KEYS = [
  "prompt_template",
  "model",
  "max_tokens",
  "history_count",
  "temperature",
] as const;

function configsToFormState(configs: Configuration[]): SummarySettings {
  const state: SummarySettings = {
    prompt_template: "",
    model: "",
    max_tokens: "",
    history_count: "",
    temperature: "",
  };

  for (const config of configs) {
    if (SUMMARY_KEYS.includes(config.key as (typeof SUMMARY_KEYS)[number])) {
      state[config.key as keyof SummarySettings] = config.value;
    }
  }

  return state;
}

function hasChanges(form: SummarySettings, original: SummarySettings): boolean {
  return SUMMARY_KEYS.some((key) => form[key] !== original[key]);
}

export function SummarySettingsForm() {
  const { data: configs, isLoading, error } = useConfigurationByCategory("summary");

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-9 w-full" />
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-9" />
            <Skeleton className="h-9" />
            <Skeleton className="h-9" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm font-medium">Failed to load settings</span>
        </div>
        <p className="mt-1 text-sm text-destructive/80">{error.message}</p>
      </div>
    );
  }

  // Render form only when configs are available
  if (!configs) {
    return null;
  }

  return <SummarySettingsFormInner initialConfigs={configs} />;
}

interface SummarySettingsFormInnerProps {
  initialConfigs: Configuration[];
}

function SummarySettingsFormInner({ initialConfigs }: SummarySettingsFormInnerProps) {
  const updateMutation = useUpdateConfiguration();

  // Initialize form state from props - no useEffect needed
  const [form, setForm] = useState<SummarySettings>(() => configsToFormState(initialConfigs));
  const [originalForm, setOriginalForm] = useState<SummarySettings>(() => configsToFormState(initialConfigs));
  const [errors, setErrors] = useState<FormErrors>({});
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const validate = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!form.model.trim()) {
      newErrors.model = "Model is required";
    }

    const maxTokens = parseInt(form.max_tokens, 10);
    if (isNaN(maxTokens) || maxTokens < 1) {
      newErrors.max_tokens = "Must be a positive integer";
    }

    const historyCount = parseInt(form.history_count, 10);
    if (isNaN(historyCount) || historyCount < 0) {
      newErrors.history_count = "Must be a non-negative integer";
    }

    const temp = parseFloat(form.temperature);
    if (isNaN(temp) || temp < 0 || temp > 2) {
      newErrors.temperature = "Must be a number between 0 and 2";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [form.model, form.max_tokens, form.history_count, form.temperature]);

  const handleSave = async () => {
    if (!validate()) return;

    setSaveStatus("saving");

    try {
      // Save each changed field
      const changedKeys = SUMMARY_KEYS.filter((key) => form[key] !== originalForm[key]);

      for (const key of changedKeys) {
        await updateMutation.mutateAsync({
          category: "summary",
          key,
          data: { value: form[key] },
        });
      }

      setOriginalForm(form);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("error");
    }
  };

  const handleReset = () => {
    setForm(originalForm);
    setErrors({});
  };

  const handleFieldChange = <K extends keyof SummarySettings>(
    field: K,
    value: string
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const isDirty = hasChanges(form, originalForm);
  const canSave = isDirty && saveStatus !== "saving";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">AI Summary Settings</CardTitle>
        <CardDescription>Configure how session summaries are generated</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Prompt Template */}
        <div className="space-y-2">
          <Label htmlFor="prompt_template">Prompt Template (Handlebars)</Label>
          <Textarea
            id="prompt_template"
            value={form.prompt_template}
            onChange={(e) => handleFieldChange("prompt_template", e.target.value)}
            placeholder="Enter Handlebars template..."
            className="min-h-[200px] font-mono text-xs"
          />
          <p className="text-xs text-muted-foreground">
            Variables: {"{{conversation}}"}, {"{{project.name}}"}, {"{{project.description}}"},{" "}
            {"{{session.startedAt}}"}, {"{{session.branch}}"}, {"{{history}}"}
          </p>
        </div>

        {/* Model */}
        <div className="space-y-2">
          <Label>Model</Label>
          <ModelPicker
            value={form.model}
            onChange={(value) => handleFieldChange("model", value)}
            disabled={saveStatus === "saving"}
          />
          {errors.model && (
            <p className="text-xs text-destructive">{errors.model}</p>
          )}
        </div>

        {/* Max Tokens, History Count, Temperature - side by side */}
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="max_tokens">Max Tokens</Label>
            <Input
              id="max_tokens"
              type="number"
              min="1"
              value={form.max_tokens}
              onChange={(e) => handleFieldChange("max_tokens", e.target.value)}
              placeholder="1000"
              aria-invalid={!!errors.max_tokens}
              aria-describedby={errors.max_tokens ? "max-tokens-error" : undefined}
            />
            {errors.max_tokens && (
              <p id="max-tokens-error" className="text-xs text-destructive">
                {errors.max_tokens}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="history_count">History Count</Label>
            <Input
              id="history_count"
              type="number"
              min="0"
              value={form.history_count}
              onChange={(e) => handleFieldChange("history_count", e.target.value)}
              placeholder="3"
              aria-invalid={!!errors.history_count}
              aria-describedby={errors.history_count ? "history-count-error" : undefined}
            />
            {errors.history_count && (
              <p id="history-count-error" className="text-xs text-destructive">
                {errors.history_count}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="temperature">Temperature</Label>
            <Input
              id="temperature"
              type="number"
              step="0.1"
              min="0"
              max="2"
              value={form.temperature}
              onChange={(e) => handleFieldChange("temperature", e.target.value)}
              placeholder="0.3"
              aria-invalid={!!errors.temperature}
              aria-describedby={errors.temperature ? "temperature-error" : undefined}
            />
            {errors.temperature && (
              <p id="temperature-error" className="text-xs text-destructive">
                {errors.temperature}
              </p>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button onClick={handleSave} disabled={!canSave} size="sm">
          {saveStatus === "saving" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save
        </Button>
        <Button
          variant="outline"
          onClick={handleReset}
          disabled={!isDirty || saveStatus === "saving"}
          size="sm"
        >
          <RotateCcw className="h-4 w-4" />
          Reset
        </Button>
        {saveStatus === "saved" && (
          <span className="text-xs text-muted-foreground">Saved</span>
        )}
        {saveStatus === "error" && (
          <span className="text-xs text-destructive">Save failed</span>
        )}
      </CardFooter>
    </Card>
  );
}
