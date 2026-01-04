"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useCallback, useMemo } from "react";

interface SortState<T extends string> {
  column: T;
  order: "asc" | "desc";
}

interface UseUrlSortOptions<T extends string> {
  defaultColumn: T;
  defaultOrder?: "asc" | "desc";
  paramPrefix?: string;
}

export function useUrlSort<T extends string>({
  defaultColumn,
  defaultOrder = "desc",
  paramPrefix = "",
}: UseUrlSortOptions<T>) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const sortByParam = paramPrefix ? `${paramPrefix}SortBy` : "sortBy";
  const sortOrderParam = paramPrefix ? `${paramPrefix}SortOrder` : "sortOrder";

  const currentSort = useMemo<SortState<T>>(() => {
    const column = (searchParams.get(sortByParam) as T) || defaultColumn;
    const order =
      (searchParams.get(sortOrderParam) as "asc" | "desc") || defaultOrder;
    return { column, order };
  }, [searchParams, sortByParam, sortOrderParam, defaultColumn, defaultOrder]);

  const setSort = useCallback(
    (column: T, order: "asc" | "desc") => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(sortByParam, column);
      params.set(sortOrderParam, order);
      router.push(`${pathname}?${params.toString()}`);
    },
    [searchParams, router, pathname, sortByParam, sortOrderParam]
  );

  const toggleSort = useCallback(
    (column: T) => {
      if (currentSort.column === column) {
        // Toggle order if same column
        setSort(column, currentSort.order === "asc" ? "desc" : "asc");
      } else {
        // New column, default to desc
        setSort(column, "desc");
      }
    },
    [currentSort, setSort]
  );

  return {
    sortBy: currentSort.column,
    sortOrder: currentSort.order,
    currentSort,
    toggleSort,
    setSort,
  };
}
