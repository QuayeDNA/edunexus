'use client';

import { useState, useCallback, useMemo } from 'react';

type FilterValue = string | number | boolean | undefined | null;
interface FilterState {
  [key: string]: FilterValue;
}

export function useFilters(initialFilters: FilterState = {}) {
  const [filters, setFilters] = useState<FilterState>(initialFilters);

  const setFilter = useCallback((key: string, value: FilterValue) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  const activeFilterCount = useMemo(
    () => Object.values(filters).filter((v) => v !== undefined && v !== null && v !== '').length,
    [filters]
  );

  return { filters, setFilter, resetFilters, activeFilterCount };
}
