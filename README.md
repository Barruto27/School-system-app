# Personal Knowledge OS — Stage 1: PDF/Doc Viewer + Annotation Core

A standalone PDF viewer and annotator: open a PDF, draw, highlight, type, and comment on it, then export
the result back out as a real PDF. Local-only — no accounts, no sync.

This is the first stage of a larger build (Notion + Obsidian + GoodNotes, unified). Later stages build on
top of the annotation data model established here (`src/annotations/types.ts`) — annotations are stored
separately from the source file, keyed by page and normalized (zoom-independent) position, so the freeform
canvas and cross-document linking stages can reuse the same object model.

## Features

- Open a PDF and render its pages (PDF.js)
- Page thumbnails, table of contents (from the PDF's own outline), find-in-document, zoom, page navigation
- Draw, highlight, add text, and add sticky-note comments as an overlay layer distinct from the PDF content
- Export the annotated file back out as a standard PDF (pdf-lib), including real sticky-note annotations
  readable in any PDF viewer
- Annotations persist locally per file (localStorage) so reopening the same file recalls your marks

## Development

```bash
npm install
npm run dev      # start the dev server
npm run build    # typecheck + production build
```

## Stack

Vite, React, TypeScript, `pdfjs-dist` for rendering, `pdf-lib` for export.
