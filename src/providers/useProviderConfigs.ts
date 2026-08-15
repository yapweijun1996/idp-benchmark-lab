import { useCallback, useEffect, useRef, useState } from "react";
import type { ProviderConfig } from "../storage/types";
import { ProviderConfigService } from "./configService";

export interface UseProviderConfigsResult {
  configs: ProviderConfig[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  save: (input: Omit<ProviderConfig, "id"> & { id?: string }) => Promise<ProviderConfig>;
  remove: (id: string) => Promise<void>;
}

/** React state wrapper around ProviderConfigService. */
export function useProviderConfigs(service?: ProviderConfigService): UseProviderConfigsResult {
  const serviceRef = useRef<ProviderConfigService | null>(null);
  if (serviceRef.current == null) {
    serviceRef.current = service ?? new ProviderConfigService();
  }
  const svc = serviceRef.current;

  const [configs, setConfigs] = useState<ProviderConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setConfigs(await svc.list());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [svc]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const save = useCallback(
    async (input: Omit<ProviderConfig, "id"> & { id?: string }) => {
      const saved = await svc.save(input);
      await refresh();
      return saved;
    },
    [svc, refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      await svc.remove(id);
      await refresh();
    },
    [svc, refresh],
  );

  return { configs, loading, error, refresh, save, remove };
}
