"use client";

import { TableHead } from "@/components/ui/table";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SortableTableHeadProps<T extends string = string> {
  column: T;
  label: string;
  currentSort: { column: T; order: "asc" | "desc" } | null;
  onSort: (column: T) => void;
  className?: string;
}

export function SortableTableHead<T extends string = string>({
  column,
  label,
  currentSort,
  onSort,
  className,
}: SortableTableHeadProps<T>) {
  const isActive = currentSort?.column === column;
  const order = isActive ? currentSort.order : null;

  return (
    <TableHead
      className={cn("cursor-pointer select-none hover:bg-muted/50", className)}
      onClick={() => onSort(column)}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        <span className="ml-auto">
          {order === "asc" ? (
            <ChevronUp className="h-4 w-4" />
          ) : order === "desc" ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
          )}
        </span>
      </div>
    </TableHead>
  );
}
