# Personal Knowledge OS

A local-first PDF annotator, file browser, notes, and freeform canvas — a Notion + Obsidian + GoodNotes-style
app that runs entirely client-side (IndexedDB + localStorage, no backend). Built in stages, each one usable
on its own before the next was added.

## Features

- **Home**: a Drive-style landing page with quick actions (new note, new canvas, upload)
- **Sidebar**: collapsible and resizable, listing Home, categories (top-level folders), and standalone
  pages, with animated selection (sliding accent indicator, bubble highlight + slight shift on select).
  A single "+" menu (Category/Upload/Note/Canvas) replaces individual buttons; a Settings icon sits at
  the bottom.
- **Categories & items**: rename, delete, and set a custom emoji icon on any category or item; drag one
  category onto another to nest it, or drag a file onto a category to file it there
- **File browser**: folders, drag-and-drop upload/move, search by filename, same rename/delete/emoji
  actions as the sidebar
- **PDF viewer/annotator**: draw, highlight, type, or add sticky-note comments on any PDF, with thumbnails,
  outline navigation, find-in-document, zoom, and page navigation; exports back out as a standard PDF
- **Notes**: a rich-text editor (bold/italic/headings/lists/quotes) for plain typed notes, autosaved
- **Freeform canvas**: a blank drawing surface reusing the same annotation engine as the PDF viewer
  (`src/components/AnnotationLayer.tsx`) — draw anywhere, not anchored to a page
- **Settings**: Apple Books-style theme presets (Night/White/Sepia/Gray) and font presets (Sans/Serif/
  System), applied via CSS custom properties and persisted locally
- Files, notes, and canvases all persist locally (IndexedDB for content, localStorage for PDF/canvas
  annotations per file)

Data models are kept deliberately loose so later stages don't force a rewrite: annotations are stored
separately from source content, keyed by page and normalized (zoom-independent) position
(`src/annotations/types.ts`); files live in a folder+tags schema (`src/storage/types.ts`) though tags are
unused today.

Note: the "welcome." headline uses **Plus Jakarta Sans** (self-hosted via `@fontsource-variable`), a
substitute for Satoshi — Satoshi's own CDN isn't reachable from this build environment's network policy.

## Development

```bash
npm install
npm run dev      # start the dev server
npm run build    # typecheck + production build
```

## Stack

Vite, React, TypeScript, `pdfjs-dist` for PDF rendering, `pdf-lib` for PDF export, `idb` for the local
file/folder store, `@tiptap/react` for the rich-text note editor, `@fontsource-variable/plus-jakarta-sans`
and `@fontsource-variable/lora` for self-hosted fonts.
