/**
 * Shallow copy of `value` without `keys`. Keeps the omission intent explicit
 * without binding throwaway destructuring variables.
 */
export const omitKeys = <T extends object, K extends keyof T>(value: T, keys: readonly K[]): Omit<T, K> => {
    const copy = { ...value };
    for (const key of keys) Reflect.deleteProperty(copy, key);
    return copy;
};
