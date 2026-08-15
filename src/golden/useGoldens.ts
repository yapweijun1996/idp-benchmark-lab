import { useCallback, useEffect, useRef, useState } from "react";
import type { GoldenAnswer } from "../storage/types";
import { GoldenService, type GoldenInput } from "./service";

export interface UseGoldensResult {
  goldens: GoldenAnswer[];
  activeId: string | undefined;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  create: (input: GoldenInput) => Promise<GoldenAnswer>;
  update: (id: string, json: unknown) => Promise<GoldenAnswer>;
  remove: (id: string) => Promise<void>;
  select: (id: string | undefined) => void;
}

/** React state wrapper around GoldenService. */
export function useGoldens(service?: GoldenService): UseGoldensResult {
  const serviceRef = useRef<GoldenService | null>(null);
  if (serviceRef.current == null) {
    serviceRef.current = service ?? new GoldenService();
  }
  const svc = serviceRef.current;

  const [goldens, setGoldens] = useState<GoldenAnswer[]>([]);
  const [activeId, setActiveId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const list = await svc.list();
      setGoldens(list);
      setActiveId((prev) => (prev && list.some((g) => g.id === prev) ? prev : list[0]?.id));
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

  const create = useCallback(
    async (input: GoldenInput) => {
      const created = await svc.create(input);
      await refresh();
      return created;
    },
    [svc, refresh],
  );

  const update = useCallback(
    async (id: string, json: unknown) => {
      const updated = await svc.update(id, json);
      await refresh();
      return updated;
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

  const select = useCallback((id: string | undefined) => setActiveId(id), []);

  return { goldens, activeId, loading, error, refresh, create, update, remove, select };
}
