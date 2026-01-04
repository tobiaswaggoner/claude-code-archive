"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useInject } from "@/core/di";
import { TOKENS } from "@/core/di/tokens";
import type { ConfigurationService } from "../services/configuration.service";
import type { ConfigurationUpdateInput } from "../types/configuration";

export function useConfigurationByCategory(category: string) {
  const configService = useInject<ConfigurationService>(TOKENS.ConfigurationService);

  return useQuery({
    queryKey: ["configuration", category],
    queryFn: () => configService.listByCategory(category),
    staleTime: 60_000, // 1 minute
  });
}

export function useUpdateConfiguration() {
  const queryClient = useQueryClient();
  const configService = useInject<ConfigurationService>(TOKENS.ConfigurationService);

  return useMutation({
    mutationFn: ({
      category,
      key,
      data,
    }: {
      category: string;
      key: string;
      data: ConfigurationUpdateInput;
    }) => configService.update(category, key, data),
    onSuccess: (_, { category }) => {
      // Invalidate the category query to refetch
      queryClient.invalidateQueries({ queryKey: ["configuration", category] });
    },
  });
}
