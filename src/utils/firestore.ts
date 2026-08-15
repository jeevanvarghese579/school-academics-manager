/** Returns a copy with undefined object properties removed (including nested objects). */
export function removeUndefinedValues<T>(value: T): T {
  if (Array.isArray(value)) return value.map(removeUndefinedValues) as T;
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .map(([key, item]) => [key, removeUndefinedValues(item)])) as T;
  }
  return value;
}
