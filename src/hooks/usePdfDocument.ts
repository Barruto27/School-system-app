import { useEffect, useState } from 'react';
import { pdfjsLib, type PDFDocumentProxy } from '../pdf/pdfjs';

interface PdfDocState {
  doc: PDFDocumentProxy | null;
  numPages: number;
  loading: boolean;
  error: string | null;
}

export function usePdfDocument(fileData: ArrayBuffer | null) {
  const [state, setState] = useState<PdfDocState>({ doc: null, numPages: 0, loading: false, error: null });

  useEffect(() => {
    if (!fileData) {
      setState({ doc: null, numPages: 0, loading: false, error: null });
      return;
    }
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    const task = pdfjsLib.getDocument({ data: fileData.slice(0) });
    task.promise.then(
      (doc) => {
        if (cancelled) return;
        setState({ doc, numPages: doc.numPages, loading: false, error: null });
      },
      (err) => {
        if (cancelled) return;
        setState({ doc: null, numPages: 0, loading: false, error: String(err?.message ?? err) });
      },
    );
    return () => {
      cancelled = true;
      task.destroy();
    };
  }, [fileData]);

  return state;
}
