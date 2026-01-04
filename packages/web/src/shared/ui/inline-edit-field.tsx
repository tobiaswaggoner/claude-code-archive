"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Pencil, Check, X, Loader2 } from "lucide-react";

export type InlineEditFieldType = "text" | "url" | "checkbox";

interface InlineEditFieldBaseProps {
  label: string;
  onSave: (value: string | boolean) => Promise<void> | void;
  className?: string;
  error?: string;
  disabled?: boolean;
}

interface TextFieldProps extends InlineEditFieldBaseProps {
  type?: "text" | "url";
  value: string;
  placeholder?: string;
  emptyText?: string;
}

interface CheckboxFieldProps extends InlineEditFieldBaseProps {
  type: "checkbox";
  value: boolean;
  checkedLabel?: string;
  uncheckedLabel?: string;
}

type InlineEditFieldProps = TextFieldProps | CheckboxFieldProps;

export function InlineEditField(props: InlineEditFieldProps) {
  const { label, onSave, className, error, disabled } = props;
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [localValue, setLocalValue] = useState<string | boolean>(props.value);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset local value when props.value changes
  useEffect(() => {
    setLocalValue(props.value);
  }, [props.value]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current && props.type !== "checkbox") {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing, props.type]);

  const handleSave = async () => {
    if (localValue === props.value) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(localValue);
      setIsEditing(false);
    } catch {
      // Keep editing on error
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setLocalValue(props.value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleCheckboxChange = async (checked: boolean) => {
    setIsSaving(true);
    try {
      await onSave(checked);
    } finally {
      setIsSaving(false);
    }
  };

  // Checkbox field
  if (props.type === "checkbox") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Checkbox
          id={`inline-${label}`}
          checked={props.value}
          onCheckedChange={handleCheckboxChange}
          disabled={disabled || isSaving}
        />
        <label
          htmlFor={`inline-${label}`}
          className={cn(
            "text-sm cursor-pointer select-none",
            disabled && "cursor-not-allowed opacity-50"
          )}
        >
          {props.value
            ? props.checkedLabel ?? label
            : props.uncheckedLabel ?? label}
        </label>
        {isSaving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
      </div>
    );
  }

  // Text/URL field - display mode
  if (!isEditing) {
    const displayValue = props.value || props.emptyText || "-";
    const isEmpty = !props.value;

    return (
      <div className={cn("group", className)}>
        <div className="text-xs text-muted-foreground mb-0.5">{label}</div>
        <button
          type="button"
          onClick={() => !disabled && setIsEditing(true)}
          className={cn(
            "flex items-center gap-1.5 text-sm hover:bg-muted/50 rounded px-1 -mx-1 py-0.5 transition-colors text-left w-full",
            isEmpty && "text-muted-foreground italic",
            disabled && "cursor-not-allowed opacity-50"
          )}
          disabled={disabled}
        >
          <span className="flex-1 truncate">{displayValue}</span>
          {!disabled && (
            <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          )}
        </button>
        {error && <p className="text-xs text-destructive mt-0.5">{error}</p>}
      </div>
    );
  }

  // Text/URL field - edit mode
  return (
    <div className={className}>
      <div className="text-xs text-muted-foreground mb-0.5">{label}</div>
      <div className="flex items-center gap-1">
        <Input
          ref={inputRef}
          type={props.type === "url" ? "url" : "text"}
          value={localValue as string}
          onChange={(e) => setLocalValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            // Small delay to allow button clicks to register
            setTimeout(() => {
              if (!isSaving) handleCancel();
            }, 150);
          }}
          placeholder={props.placeholder}
          disabled={isSaving}
          className="h-7 text-sm"
          aria-invalid={!!error}
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="p-1 rounded hover:bg-primary/10 text-primary disabled:opacity-50"
          title="Save (Enter)"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          disabled={isSaving}
          className="p-1 rounded hover:bg-muted text-muted-foreground disabled:opacity-50"
          title="Cancel (Esc)"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {error && <p className="text-xs text-destructive mt-0.5">{error}</p>}
    </div>
  );
}
