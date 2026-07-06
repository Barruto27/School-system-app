import { useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy } from '../pdf/pdfjs';
import type { AnnotationTool } from '../annotations/types';
import { AnnotationLayer, type SearchRect } from './AnnotationLayer';

export type { SearchRect };

interface PageViewProps {
  doc: PDFDocumentProxy;
  pageIndex: number;
  scale: number;
  tool: AnnotationTool;
  color: string;
  strokeWidth: number;
  registerPageEl: (pageIndex: number, el: HTMLDivElement | null) => void;
  searchRects: SearchRect[];
}

export function PageView({
  doc,
  pageIndex,
  scale,
  tool,
  color,
  strokeWidth,
  registerPageEl,
  searchRects,
}: PageViewProps) {
  const pdfCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  // Render the PDF page itself.
  useEffect(() => {
    let cancelled = false;
    let renderTask: ReturnType<import('../pdf/pdfjs').PDFPageProxy['render']> | null = null;
    doc.getPage(pageIndex + 1).then(async (page) => {
      if (cancelled) return;
      const viewport = page.getViewport({ scale });
      const canvas = pdfCanvasRef.current;
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(viewport.width * dpr);
      canvas.height = Math.floor(viewport.height * dpr);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      setSize({ width: viewport.width, height: viewport.height });
      renderTask = page.render({ canvasContext: ctx, viewport });
      try {
        await renderTask.promise;
      } catch {
        // cancelled render, ignore
      }
    });
    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [doc, pageIndex, scale]);

  return (
    <div
      className="page-view"
      ref={(el) => registerPageEl(pageIndex, el)}
      style={{ width: size.width || undefined, height: size.height || undefined }}
      data-page-index={pageIndex}
    >
      <canvas ref={pdfCanvasRef} className="pdf-canvas" />
      <AnnotationLayer
        pageIndex={pageIndex}
        width={size.width}
        height={size.height}
        tool={tool}
        color={color}
        strokeWidth={strokeWidth}
        searchRects={searchRects}
      />
    </div>
  );
}
