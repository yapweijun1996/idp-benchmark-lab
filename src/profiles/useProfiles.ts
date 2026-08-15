import { useCallback, useEffect, useRef, useState } from "react";
import type { ExtractionProfile } from "../storage/types";
import { ProfileService, type ProfileInput } from "./service";

export interface UseProfilesResult {
  profiles: ExtractionProfile[];
  activeId: string | undefined;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  create: (input: ProfileInput) => Promise<ExtractionProfile>;
  update: (id: string, input: ProfileInput) => Promise<ExtractionProfile>;
  remove: (id: string) => Promise<void>;
  select: (id: string | undefined) => void;
}

/** React state wrapper around ProfileService. */
export function useProfiles(service?: ProfileService): UseProfilesResult {
  const serviceRef = useRef<ProfileService | null>(null);
  if (serviceRef.current == null) {
    serviceRef.current = service ?? new ProfileService();
  }
  const svc = serviceRef.current;

  const [profiles, setProfiles] = useState<ExtractionProfile[]>([]);
  const [activeId, setActiveId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const list = await svc.list();
      setProfiles(list);
      setActiveId((prev) => (prev && list.some((p) => p.id === prev) ? prev : list[0]?.id));
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
    async (input: ProfileInput) => {
      const created = await svc.create(input);
      await refresh();
      return created;
    },
    [svc, refresh],
  );

  const update = useCallback(
    async (id: string, input: ProfileInput) => {
      const updated = await svc.update(id, input);
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

  return { profiles, activeId, loading, error, refresh, create, update, remove, select };
}
