// Same clamping rules used everywhere: page >= 1, 1 <= limit <= 100.
export function normalizePagination(page = 1, limit = 10) {
  const safePage = Math.max(1, Math.trunc(Number(page)) || 1);
  const safeLimit = Math.min(100, Math.max(1, Math.trunc(Number(limit)) || 10));
  return { page: safePage, limit: safeLimit, skip: (safePage - 1) * safeLimit };
}

export function buildPagination(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}
