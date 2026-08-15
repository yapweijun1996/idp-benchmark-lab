import { useEffect, useReducer, useRef } from "react";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

// Configure the PDF.js worker once (Vite emits the worker asset).
GlobalWorkerOptions.workerSrc = workerUrl;

interface State {
  blob: Blob | undefined;
  doc: PDFDocumentProxy | null;
  error: string | null;
  loading: boolean;
}

type Action =
  | { type: "start"; blob: Blob }
  | { type: "loaded"; blob: Blob; doc: PDFDocumentProxy }
  | { type: "failed"; blob: Blob; error: string }
  | { type: "reset" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "start":
      return { blob: action.blob, doc: null, error: null, loading: true };
    case "loaded":
      // Stale responses for a previous blob are ignored.
      return state.blob === action.blob ? { ...state, doc: action.doc, loading: false } : state;
    case "failed":
      return state.blob === action.blob ? { ...state, error: action.error, loading: false } : state;
    case "reset":
      return { blob: undefined, doc: null, error: null, loading: false };
  }
}

export interface PdfDocumentState {
  numPages: number;
  loading: boolean;
  error: string | null;
  doc: PDFDocumentProxy | null;
}

export type PdfLoader = (source: { data: Blob }) => {
  promise: Promise<PDFDocumentProxy>;
  destroy: () => Promise<void>;
};

// pdfjs-dist's typings do not declare Blob for DocumentInitParameters.data
// even though the runtime accepts it; the cast keeps the default loader
// assignable to PdfLoader.
const defaultLoader: PdfLoader = (source) =>
  getDocument(source as unknown as Parameters<typeof getDocument>[0]);

/** Loads a PDF document (metadata only; page rendering is PdfPreview's job). */
export function usePdfDocument(blob: Blob | undefined, loader: PdfLoader = defaultLoader): PdfDocumentState {
  const [state, dispatch] = useReducer(reducer, { blob: undefined, doc: null, error: null, loading: false });

  // Hold the latest loader in a ref so callers may pass an inline function
  // without retriggering the load effect (and thus an infinite loop).
  const loaderRef = useRef(loader);
  useEffect(() => {
    loaderRef.current = loader;
  }, [loader]);

  useEffect(() => {
    if (!blob) {
      dispatch({ type: "reset" });
      return;
    }
    dispatch({ type: "start", blob });
    const task = loaderRef.current({ data: blob });
    void task.promise
      .then((doc) => dispatch({ type: "loaded", blob, doc }))
      .catch((e: unknown) =>
        dispatch({ type: "failed", blob, error: e instanceof Error ? e.message : String(e) }),
      );
    return () => {
      void task.destroy();
    };
  }, [blob]);

  return { numPages: state.doc?.numPages ?? 0, loading: state.loading, error: state.error, doc: state.doc };
}
