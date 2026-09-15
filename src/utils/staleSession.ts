export const isStaleSession = (startedAt: string, now = Date.now()): boolean => {
  const start = new Date(startedAt).getTime();
  return !Number.isNaN(start) && now - start >= 2 * 60 * 60 * 1000;
};
