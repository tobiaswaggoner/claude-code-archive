"use client";

import { useState } from "react";
import Link from "next/link";
import { useProjects } from "../hooks/use-projects";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SortableTableHead, useUrlSort } from "@/shared/data";
import {
  FolderOpen,
  GitBranch,
  MessageSquare,
  Search,
  ExternalLink,
  Archive,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { ProjectSortBy } from "../types/project";

export function ProjectList() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const { sortBy, sortOrder, currentSort, toggleSort } = useUrlSort<ProjectSortBy>({
    defaultColumn: "lastWorkedAt",
    defaultOrder: "desc",
  });

  // Simple debounce
  const handleSearchChange = (value: string) => {
    setSearch(value);
    const timeoutId = setTimeout(() => {
      setDebouncedSearch(value);
    }, 300);
    return () => clearTimeout(timeoutId);
  };

  const { data, isLoading, error } = useProjects({
    search: debouncedSearch || undefined,
    limit: 50,
    sortBy,
    sortOrder,
  });

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        Failed to load projects: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          {data ? `${data.total} projects` : "Loading..."}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableTableHead
                column="name"
                label="Project"
                currentSort={currentSort}
                onSort={toggleSort}
                className="w-[300px]"
              />
              <TableHead className="w-[100px] text-center">Sessions</TableHead>
              <TableHead className="w-[100px] text-center">Repos</TableHead>
              <TableHead className="w-[100px] text-center">Workspaces</TableHead>
              <SortableTableHead
                column="lastWorkedAt"
                label="Last worked"
                currentSort={currentSort}
                onSort={toggleSort}
                className="w-[150px]"
              />
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-8 w-8 rounded" />
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="h-4 w-8 mx-auto" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="h-4 w-8 mx-auto" />
                  </TableCell>
                  <TableCell className="text-center">
                    <Skeleton className="h-4 w-8 mx-auto" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>
              ))
            ) : data?.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <FolderOpen className="h-8 w-8" />
                    <p>No projects found</p>
                    {search && (
                      <p className="text-xs">
                        Try adjusting your search
                      </p>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data?.items.map((project) => (
                <TableRow key={project.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-muted">
                        {project.archived ? (
                          <Archive className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <FolderOpen className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <div>
                        <Link
                          href={`/projects/${project.id}`}
                          className="font-medium hover:underline hover:text-primary"
                        >
                          {project.name}
                        </Link>
                        {project.description && (
                          <div className="text-xs text-muted-foreground line-clamp-1">
                            {project.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Link
                      href={`/sessions?projectId=${project.id}`}
                      className="flex items-center justify-center gap-1 text-sm hover:text-primary hover:underline"
                    >
                      <MessageSquare className="h-3 w-3" />
                      {project.sessionCount}
                    </Link>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1 text-sm">
                      <GitBranch className="h-3 w-3" />
                      {project.gitRepoCount}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="text-sm">{project.workspaceCount}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground">
                      {project.lastWorkedAt
                        ? formatDistanceToNow(new Date(project.lastWorkedAt), {
                            addSuffix: true,
                          })
                        : "-"}
                    </div>
                  </TableCell>
                  <TableCell>
                    {project.upstreamUrl && (
                      <Button variant="ghost" size="icon" asChild>
                        <a
                          href={project.upstreamUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
