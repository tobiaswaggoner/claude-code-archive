"use client";

import { useState, useEffect, useCallback } from "react";
import { useProject, useUpdateProject } from "../hooks/use-projects";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertCircle,
  Save,
  RotateCcw,
  GitBranch,
  MessageSquare,
  FolderOpen,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import type { Project } from "../types/project";

interface ProjectDetailProps {
  projectId: string;
}

interface FormState {
  name: string;
  description: string;
  upstreamUrl: string;
  archived: boolean;
}

interface FormErrors {
  name?: string;
  upstreamUrl?: string;
}

function isValidUrl(url: string): boolean {
  if (!url) return true; // empty is valid (optional field)
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function getInitialFormState(project: Project | undefined): FormState {
  return {
    name: project?.name ?? "",
    description: project?.description ?? "",
    upstreamUrl: project?.upstreamUrl ?? "",
    archived: project?.archived ?? false,
  };
}

function hasChanges(form: FormState, project: Project | undefined): boolean {
  if (!project) return false;
  return (
    form.name !== project.name ||
    form.description !== (project.description ?? "") ||
    form.upstreamUrl !== (project.upstreamUrl ?? "") ||
    form.archived !== project.archived
  );
}

export function ProjectDetail({ projectId }: ProjectDetailProps) {
  const { data: project, isLoading, error } = useProject(projectId);
  const updateMutation = useUpdateProject();

  const [form, setForm] = useState<FormState>(getInitialFormState(undefined));
  const [errors, setErrors] = useState<FormErrors>({});

  // Initialize form when project loads
  useEffect(() => {
    if (project) {
      setForm(getInitialFormState(project));
      setErrors({});
    }
  }, [project]);

  const validate = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!form.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (form.upstreamUrl && !isValidUrl(form.upstreamUrl)) {
      newErrors.upstreamUrl = "Must be a valid URL (http:// or https://)";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [form.name, form.upstreamUrl]);

  const handleSave = async () => {
    if (!validate()) return;

    updateMutation.mutate({
      id: projectId,
      data: {
        name: form.name.trim(),
        description: form.description.trim() || null,
        upstreamUrl: form.upstreamUrl.trim() || null,
        archived: form.archived,
      },
    });
  };

  const handleReset = () => {
    setForm(getInitialFormState(project));
    setErrors({});
  };

  const handleFieldChange = <K extends keyof FormState>(
    field: K,
    value: FormState[K]
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm font-medium">Failed to load project</span>
        </div>
        <p className="mt-1 text-sm text-destructive/80">{error.message}</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="rounded-lg border border-muted bg-muted/50 p-4 text-center text-sm text-muted-foreground">
        Project not found
      </div>
    );
  }

  const isDirty = hasChanges(form, project);
  const canSave = isDirty && !updateMutation.isPending;

  return (
    <div className="space-y-4">
      {/* Editable Project Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Project Details</CardTitle>
          <CardDescription>Edit project information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => handleFieldChange("name", e.target.value)}
              placeholder="Project name"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "name-error" : undefined}
            />
            {errors.name && (
              <p id="name-error" className="text-xs text-destructive">
                {errors.name}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={form.description}
              onChange={(e) => handleFieldChange("description", e.target.value)}
              placeholder="Optional description"
            />
          </div>

          {/* Upstream URL */}
          <div className="space-y-2">
            <Label htmlFor="upstreamUrl">Upstream URL</Label>
            <Input
              id="upstreamUrl"
              type="url"
              value={form.upstreamUrl}
              onChange={(e) => handleFieldChange("upstreamUrl", e.target.value)}
              placeholder="https://github.com/..."
              aria-invalid={!!errors.upstreamUrl}
              aria-describedby={errors.upstreamUrl ? "url-error" : undefined}
            />
            {errors.upstreamUrl && (
              <p id="url-error" className="text-xs text-destructive">
                {errors.upstreamUrl}
              </p>
            )}
          </div>

          {/* Archived */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="archived"
              checked={form.archived}
              onCheckedChange={(checked) =>
                handleFieldChange("archived", checked === true)
              }
            />
            <Label htmlFor="archived" className="cursor-pointer">
              Archived
            </Label>
          </div>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button
            onClick={handleSave}
            disabled={!canSave}
            size="sm"
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save
          </Button>
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={!isDirty || updateMutation.isPending}
            size="sm"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
          {updateMutation.isSuccess && (
            <span className="text-xs text-muted-foreground">Saved</span>
          )}
          {updateMutation.isError && (
            <span className="text-xs text-destructive">
              {updateMutation.error?.message ?? "Save failed"}
            </span>
          )}
        </CardFooter>
      </Card>

      {/* Read-only Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">{project.sessionCount}</div>
                <div className="text-xs text-muted-foreground">Sessions</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">{project.gitRepoCount}</div>
                <div className="text-xs text-muted-foreground">Repositories</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">{project.workspaceCount}</div>
                <div className="text-xs text-muted-foreground">Workspaces</div>
              </div>
            </div>
            <div>
              <div className="font-medium">
                {project.lastWorkedAt
                  ? formatDistanceToNow(new Date(project.lastWorkedAt), {
                      addSuffix: true,
                    })
                  : "-"}
              </div>
              <div className="text-xs text-muted-foreground">Last worked</div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 border-t pt-4 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Created</div>
              <div>{format(new Date(project.createdAt), "PP")}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Updated</div>
              <div>{format(new Date(project.updatedAt), "PP")}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
