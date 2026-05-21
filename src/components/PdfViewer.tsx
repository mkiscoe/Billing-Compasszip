import { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import type { PDFPageProxy } from "pdfjs-dist";
import { Loader2, AlertCircle } from "lucide-react";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).href;

interface Props {
  url: string;
}

export function PdfViewer({ url }: Props) {
  const [pages, setPages] = useState<PDFPageProxy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPages([]);

    const task = pdfjsLib.getDocument({ url });
    task.promise
      .then(async (pdf) => {
        if (cancelled) return;
        const ps: PDFPageProxy[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          ps.push(await pdf.getPage(i));
        }
        if (!cancelled) setPages(ps);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message ?? "Could not load PDF.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      task.destroy();
    };
  }, [url]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading PDF…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
        <AlertCircle className="h-4 w-4 shrink-0" />
        Failed to load PDF: {error}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {pages.map((page, idx) => (
        <PdfPageCanvas key={idx} page={page} pageNumber={idx + 1} total={pages.length} />
      ))}
    </div>
  );
}

function PdfPageCanvas({
  page,
  pageNumber,
  total,
}: {
  page: PDFPageProxy;
  pageNumber: number;
  total: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const containerWidth = container.clientWidth || 800;
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = (containerWidth / baseViewport.width) * window.devicePixelRatio;
    const viewport = page.getViewport({ scale });

    canvas.width = viewport.width;
    canvas.height = viewport.height;
    canvas.style.width = "100%";
    canvas.style.display = "block";

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const renderTask = page.render({ canvasContext: ctx, viewport });
    return () => {
      renderTask.cancel();
    };
  }, [page]);

  return (
    <div ref={containerRef} className="relative">
      <canvas ref={canvasRef} className="w-full rounded-sm shadow-sm" />
      {total > 1 && (
        <div className="absolute bottom-2 right-2 rounded bg-black/40 px-1.5 py-0.5 text-[10px] text-white/80 select-none">
          {pageNumber} / {total}
        </div>
      )}
    </div>
  );
}
