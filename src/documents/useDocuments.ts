import { useCallback, useEffect, useRef, useState } from "react";
import type { DocumentRecord } from "../storage/types";
import { DocumentService } from "./service";

export interface UseDocumentsResult {
  documents: DocumentRecord[];
  activeId: string | undefined;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  upload: (file: File, persist: boolean) => Promise<void>;
  remove: (id: string) => Promise<void>;
  setPersistence: (id: string, persist: boolean) => Promise<void>;
  select: (id: string | undefined) => void;
  getBlob: (id: string) => Promise<Blob | undefined>;
  updatePageCount: (id: string, pageCount: number) => Promise<void>;
}

/** React state wrapper around DocumentService. */
export function useDocuments(service?: DocumentService): UseDocumentsResult {
  const serviceRef = useRef<DocumentService | null>(null);
  if (serviceRef.current == null) {
    serviceRef.current = service ?? new DocumentService();
  }
  const svc = serviceRef.current;

  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [activeId, setActiveId] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const list = await svc.list();
      setDocuments(list);
      setActiveId((prev) => (prev && list.some((d) => d.id === prev) ? prev : list[0]?.id));
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

  const upload = useCallback(
    async (file: File, persist: boolean) => {
      await svc.upload(file, { persist });
      await refresh();
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

  const setPersistence = useCallback(
    async (id: string, persist: boolean) => {
      await svc.setPersistence(id, persist);
      await refresh();
    },
    [svc, refresh],
  );

  const select = useCallback((id: string | undefined) => setActiveId(id), []);

  const getBlob = useCallback((id: string) => svc.getBlob(id), [svc]);

  const updatePageCount = useCallback(
    async (id: string, pageCount: number) => {
      await svc.updatePageCount(id, pageCount);
      await refresh();
    },
    [svc, refresh],
  );

  return {
    documents,
    activeId,
    loading,
    error,
    refresh,
    upload,
    remove,
    setPersistence,
    select,
    getBlob,
    updatePageCount,
  };
}
