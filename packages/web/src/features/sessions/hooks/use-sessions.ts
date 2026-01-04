"use client";

import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useInject } from "@/core/di";
import { TOKENS } from "@/core/di/tokens";
import type { SessionsService } from "../services/sessions.service";
import type { SessionListParams, EntryListParams, GenerateSummaryRequest } from "../types/session";

export function useSessions(params?: SessionListParams) {
  const sessionsService = useInject<SessionsService>(TOKENS.SessionsService);

  return useQuery({
    queryKey: ["sessions", params],
    queryFn: () => sessionsService.list(params),
    staleTime: 30_000,
  });
}

export function useSession(id: string) {
  const sessionsService = useInject<SessionsService>(TOKENS.SessionsService);

  return useQuery({
    queryKey: ["session", id],
    queryFn: () => sessionsService.get(id),
    enabled: !!id,
  });
}

export function useSessionEntries(sessionId: string, params?: EntryListParams) {
  const sessionsService = useInject<SessionsService>(TOKENS.SessionsService);

  return useQuery({
    queryKey: ["session", sessionId, "entries", params],
    queryFn: () => sessionsService.getEntries(sessionId, params),
    enabled: !!sessionId,
    staleTime: 60_000, // Entries don't change often
  });
}

export function useSessionEntriesInfinite(
  sessionId: string,
  params?: Omit<EntryListParams, "offset">
) {
  const sessionsService = useInject<SessionsService>(TOKENS.SessionsService);
  const limit = params?.limit ?? 50;

  return useInfiniteQuery({
    queryKey: ["session", sessionId, "entries", "infinite", params],
    queryFn: ({ pageParam = 0 }) =>
      sessionsService.getEntries(sessionId, {
        ...params,
        limit,
        offset: pageParam,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loadedCount = allPages.reduce(
        (acc, page) => acc + page.items.length,
        0
      );
      if (loadedCount >= lastPage.total) {
        return undefined;
      }
      return loadedCount;
    },
    enabled: !!sessionId,
    staleTime: 60_000,
  });
}

export function useSessionFirstEntry(sessionId: string) {
  const sessionsService = useInject<SessionsService>(TOKENS.SessionsService);

  return useQuery({
    queryKey: ["session", sessionId, "first-entry"],
    queryFn: () => sessionsService.getFirstEntry(sessionId),
    enabled: !!sessionId,
    staleTime: 60_000,
  });
}

export function useSessionAdjacent(sessionId: string) {
  const sessionsService = useInject<SessionsService>(TOKENS.SessionsService);

  return useQuery({
    queryKey: ["session", sessionId, "adjacent"],
    queryFn: () => sessionsService.getAdjacent(sessionId),
    enabled: !!sessionId,
    staleTime: 30_000,
  });
}

export function useGenerateSummary(sessionId: string) {
  const sessionsService = useInject<SessionsService>(TOKENS.SessionsService);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request?: GenerateSummaryRequest) =>
      sessionsService.generateSummary(sessionId, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session", sessionId] });
    },
  });
}
