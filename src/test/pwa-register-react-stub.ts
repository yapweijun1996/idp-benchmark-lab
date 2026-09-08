export function useRegisterSW(): {
  needRefresh: [boolean, boolean];
  updateServiceWorker: (reload?: boolean) => Promise<void>;
} {
  return {
    needRefresh: [false, false],
    updateServiceWorker: async () => undefined,
  };
}
