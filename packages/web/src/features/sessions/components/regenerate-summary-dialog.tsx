"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useGenerateSummary } from "../hooks/use-sessions";

interface RegenerateSummaryDialogProps {
  sessionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RegenerateSummaryDialog({
  sessionId,
  open,
  onOpenChange,
}: RegenerateSummaryDialogProps) {
  const [userInstructions, setUserInstructions] = useState("");
  const generateSummary = useGenerateSummary(sessionId);

  const handleSubmit = async () => {
    try {
      await generateSummary.mutateAsync(
        userInstructions.trim() ? { userInstructions: userInstructions.trim() } : undefined
      );
      setUserInstructions("");
      onOpenChange(false);
    } catch {
      // Error handling is done by the mutation
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setUserInstructions("");
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Regenerate Summary</DialogTitle>
          <DialogDescription>
            Generate a new AI summary for this session. You can optionally provide instructions to customize the summary.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-2">
            <Label htmlFor="instructions" className="text-sm">
              Custom Instructions (optional)
            </Label>
            <Textarea
              id="instructions"
              placeholder="e.g., Focus on the bug fixes, Summarize in German, Include code snippets..."
              value={userInstructions}
              onChange={(e) => setUserInstructions(e.target.value)}
              rows={3}
              disabled={generateSummary.isPending}
            />
          </div>
          {generateSummary.isError && (
            <p className="text-sm text-destructive">
              Failed to generate summary. Please try again.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={generateSummary.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={generateSummary.isPending}
          >
            {generateSummary.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Generating...
              </>
            ) : (
              "Generate"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
