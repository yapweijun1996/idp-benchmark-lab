import { useEffect, useRef } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { usePdfDocument } from "./usePdfDocument";

interface PdfPreviewProps {
  blob: Blob;
  scale?: number;
  onPageCount?: (count: number) => void;
}

/**
 * Renders PDF pages into canvases lazily: a page renders only when it
 * scrolls near the viewport, keeping memory bounded for large documents.
 */
export function PdfPreview({ blob, scale = 1.5, onPageCount }: PdfPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { numPages, loading, error, doc } = usePdfDocument(blob);

  const onPageCountRef = useRef(onPageCount);
  useEffect(() => {
    onPageCountRef.current = onPageCount;
  }, [onPageCount]);

  useEffect(() => {
    if (numPages > 0) {
      onPageCountRef.current?.(numPages);
    }
  }, [numPages]);

  useEffect(() => {
    const container = containerRef.current;
    if (!doc || !container) {
      return;
    }
    const rendered = new Set<number>();
    const observers: IntersectionObserver[] = [];

    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
      const holder = document.createElement("div");
      holder.className = "pdf-page";
      holder.dataset.pageNumber = String(pageNumber);
      container.appendChild(holder);

      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) {
              continue;
            }
            const n = Number((entry.target as HTMLElement).dataset.pageNumber);
            if (rendered.has(n)) {
              continue;
            }
            rendered.add(n);
            observer.disconnect();
            void renderPage(doc, n, holder, scale);
          }
        },
        { rootMargin: "240px 0px" },
      );
      observer.observe(holder);
      observers.push(observer);
    }

    return () => {
      for (const observer of observers) {
        observer.disconnect();
      }
      container.replaceChildren();
    };
  }, [doc, scale]);

  if (loading) {
    return (
      <p role="status" className="pdf-preview__status">
        Loading PDF…
      </p>
    );
  }
  if (error) {
    return (
      <p role="alert" className="pdf-preview__status pdf-preview__status--error">
        Failed to load PDF: {error}
      </p>
    );
  }
  if (!doc) {
    return null;
  }

  return (
    <div className="pdf-preview">
      <p className="pdf-preview__meta">
        {numPages} page{numPages === 1 ? "" : "s"}
      </p>
      <div ref={containerRef} className="pdf-preview__pages" />
    </div>
  );
}

async function renderPage(doc: PDFDocumentProxy, pageNumber: number, holder: HTMLElement, scale: number) {
  try {
    const page = await doc.getPage(pageNumber);
    const viewport = page.getViewport({ scale });
    const dpr = window.devicePixelRatio || 1;
    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(viewport.width * dpr);
    canvas.height = Math.floor(viewport.height * dpr);
    canvas.style.width = `${Math.floor(viewport.width)}px`;
    canvas.style.height = `${Math.floor(viewport.height)}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      page.cleanup();
      return;
    }
    await page.render({
      canvas,
      viewport,
      transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined,
    }).promise;
    holder.appendChild(canvas);
    page.cleanup();
  } catch {
    holder.textContent = `Failed to render page ${pageNumber}`;
  }
}
