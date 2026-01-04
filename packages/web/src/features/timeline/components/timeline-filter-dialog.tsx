"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Filter, Eye, EyeOff } from "lucide-react";
import type { TimelineProject } from "../types/timeline";

interface TimelineFilterDialogProps {
  projects: TimelineProject[];
  hiddenProjectIds: string[];
  onToggle: (projectId: string) => void;
  onClear: () => void;
}

export function TimelineFilterDialog({
  projects,
  hiddenProjectIds,
  onToggle,
  onClear,
}: TimelineFilterDialogProps) {
  const [open, setOpen] = useState(false);
  const hiddenCount = hiddenProjectIds.length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="h-4 w-4" />
          Filter
          {hiddenCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-muted text-xs">
              {hiddenCount} hidden
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Filter Projects</DialogTitle>
          <DialogDescription>
            Select which projects to show in the timeline. Hidden projects are
            saved in your browser.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between py-2 border-b">
          <span className="text-sm text-muted-foreground">
            {projects.length - hiddenCount} of {projects.length} visible
          </span>
          {hiddenCount > 0 && (
            <Button variant="ghost" size="sm" onClick={onClear}>
              Show all
            </Button>
          )}
        </div>

        <div className="overflow-y-auto max-h-[50vh] space-y-2 py-2">
          {projects.map((project) => {
            const isHidden = hiddenProjectIds.includes(project.id);
            return (
              <div
                key={project.id}
                className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-muted/50"
              >
                <Checkbox
                  id={`filter-${project.id}`}
                  checked={!isHidden}
                  onCheckedChange={() => onToggle(project.id)}
                />
                <Label
                  htmlFor={`filter-${project.id}`}
                  className="flex-1 cursor-pointer text-sm"
                >
                  {project.name}
                </Label>
                <span className="text-xs text-muted-foreground">
                  {project.sessionCount} sessions
                </span>
                {isHidden ? (
                  <EyeOff className="h-3 w-3 text-muted-foreground" />
                ) : (
                  <Eye className="h-3 w-3 text-muted-foreground" />
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
