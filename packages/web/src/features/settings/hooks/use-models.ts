"use client";

import { useQuery } from "@tanstack/react-query";
import { useInject } from "@/core/di";
import { TOKENS } from "@/core/di/tokens";
import type { ModelsService } from "../services/models.service";

export function useModels() {
  const modelsService = useInject<ModelsService>(TOKENS.ModelsService);

  return useQuery({
    queryKey: ["models"],
    queryFn: () => modelsService.list(),
    staleTime: 5 * 60 * 1000, // 5 minutes - models don't change often
  });
}
