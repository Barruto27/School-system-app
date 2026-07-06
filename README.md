# Personal Knowledge OS — Stage 3: Notes + Freeform Canvas

Two new content types alongside PDFs, both living in the Stage 2 file browser: rich-text notes and a
GoodNotes-style freeform drawing canvas. The canvas reuses the exact same draw/highlight/text/comment
annotation engine built in Stage 1 (`src/components/AnnotationLayer.tsx`), just anchored to a blank surface
instead of a rendered PDF page, instead of a second implementation. Local-only — no accounts, no sync.

This is the third stage of a larger build (Notion + Obsidian + GoodNotes, unified). Data models established
in earlier stages carry forward: annotations are stored separately from the source content, keyed by page
and normalized (zoom-independent) position (`src/annotations/types.ts`); files live in a folder+tags schema
(`src/storage/types.ts`) kept deliberately loose so later stages (auto-sort, cross-linking) don't need a
rewrite.

## Features

- **File browser**: folders, drag-and-drop upload/move, rename, delete, search by filename
- **PDF viewer/annotator**: draw, highlight, type, or add sticky-note comments on any PDF, with thumbnails,
  outline navigation, find-in-document, zoom, and page navigation; exports back out as a standard PDF
- **Notes**: a rich-text editor (bold/italic/headings/lists/quotes) for plain typed notes, autosaved
- **Freeform canvas**: a blank drawing surface using the same annotation tools as the PDF viewer — draw
  anywhere, not anchored to a page
- Files, notes, and canvases all persist locally (IndexedDB for content, localStorage for PDF/canvas
  annotations per file)

## Development

```bash
npm install
npm run dev      # start the dev server
npm run build    # typecheck + production build
```

## Stack

Vite, React, TypeScript, `pdfjs-dist` for PDF rendering, `pdf-lib` for PDF export, `idb` for the local
file/folder store, `@tiptap/react` for the rich-text note editor.
