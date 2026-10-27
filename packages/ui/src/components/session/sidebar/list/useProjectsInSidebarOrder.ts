export const useProjectsInSidebarOrder = <T extends { id: string }>(
  items: readonly T[],
  _enabled = true,
): readonly T[] => items;
