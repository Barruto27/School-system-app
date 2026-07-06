# Personal Knowledge OS — Stage 2: Local File Browser

A local file manager (folders, drag-drop, rename, move, search) that gives the Stage 1 PDF viewer/annotator
a home instead of being a single-file tool. Local-only — no accounts, no sync.

This is the second stage of a larger build (Notion + Obsidian + GoodNotes, unified). Later stages build on
top of the data models established so far: annotations are stored separately from the source file, keyed by
page and normalized (zoom-independent) position (`src/annotations/types.ts`); files live in a folder+tags
schema (`src/storage/types.ts`) kept deliberately loose — tags are unused today but avoid retrofitting
auto-sort and cross-linking onto a too-rigid model later.

## Features

- **File browser**: folders, drag-and-drop upload, drag-and-drop move, rename, delete, search by filename
- **PDF viewer/annotator**: open a PDF from the browser and draw, highlight, type, or add sticky-note
  comments on it, with page thumbnails, outline navigation, find-in-document, zoom, and page navigation
- **Export**: annotated files export back out as standard PDFs (pdf-lib), including real sticky-note
  annotations readable in any PDF viewer
- Files and annotations persist locally (IndexedDB for files/folders, localStorage for annotations per file)

## Development

```bash
npm install
npm run dev      # start the dev server
npm run build    # typecheck + production build
```

## Stack

Vite, React, TypeScript, `pdfjs-dist` for rendering, `pdf-lib` for export, `idb` for the local file/folder store.
