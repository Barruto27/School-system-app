import * as pdfjsLib from 'pdfjs-dist';
import workerSource from 'pdfjs-dist/build/pdf.worker.mjs?raw';

// Loaded as raw source + Blob URL (rather than `?url`) so the worker ships
// as part of the main JS bundle instead of a separate asset file — required
// for single-file builds (e.g. the Artifact preview) where no companion
// asset files exist alongside the published HTML.
const workerBlobUrl = URL.createObjectURL(new Blob([workerSource], { type: 'application/javascript' }));
pdfjsLib.GlobalWorkerOptions.workerSrc = workerBlobUrl;

export { pdfjsLib };
export type PDFDocumentProxy = pdfjsLib.PDFDocumentProxy;
export type PDFPageProxy = pdfjsLib.PDFPageProxy;
