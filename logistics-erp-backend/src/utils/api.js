const toPositiveInt = (value, fallback, maximum) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, maximum);
};

const getPagination = (query) => {
  const page = toPositiveInt(query.page, 1, Number.MAX_SAFE_INTEGER);
  const limit = toPositiveInt(query.limit, 20, 100);
  return { page, limit, skip: (page - 1) * limit };
};

const paginationMeta = (total, page, limit) => {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
};

const endOfDay = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return date;
  date.setHours(23, 59, 59, 999);
  return date;
};

module.exports = { getPagination, paginationMeta, endOfDay };
