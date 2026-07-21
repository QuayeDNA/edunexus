"use client";

import { useState, useMemo } from "react";

interface UsePaginationProps {
  initialPage?: number;
  initialPageSize?: number;
  total?: number;
}

export function usePagination({
  initialPage = 1,
  initialPageSize = 10,
  total = 0,
}: UsePaginationProps = {}) {
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / pageSize)),
    [total, pageSize],
  );

  return {
    page,
    pageSize,
    total,
    totalPages,
    setPage,
    setPageSize,
    nextPage: () => setPage((p) => Math.min(p + 1, totalPages)),
    prevPage: () => setPage((p) => Math.max(p - 1, 1)),
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}
