import { getDb } from './db';
import { ROOT_ID, type FileEntry, type FileKind, type Folder, type Link } from './types';

function newId(): string {
  return crypto.randomUUID();
}

function detectKind(file: File): FileKind {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (file.type === 'application/pdf' || ext === 'pdf') return 'pdf';
  if (file.type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) {
    return 'image';
  }
  if (['doc', 'docx', 'txt', 'md', 'rtf'].includes(ext)) return 'doc';
  return 'other';
}

export async function listFolders(parentId: string): Promise<Folder[]> {
  const db = await getDb();
  const all = await db.getAllFromIndex('folders', 'byParent', parentId);
  return all.sort((a, b) => a.name.localeCompare(b.name));
}

export async function listFiles(folderId: string): Promise<FileEntry[]> {
  const db = await getDb();
  const all = await db.getAllFromIndex('files', 'byFolder', folderId);
  return all.sort((a, b) => a.name.localeCompare(b.name));
}

export async function createFolder(name: string, parentId: string): Promise<Folder> {
  const db = await getDb();
  const folder: Folder = { id: newId(), name, parentId, createdAt: Date.now() };
  await db.put('folders', folder);
  return folder;
}

export async function addFile(file: File, folderId: string): Promise<FileEntry> {
  const db = await getDb();
  const id = newId();
  const now = Date.now();
  const entry: FileEntry = {
    id,
    name: file.name,
    folderId,
    kind: detectKind(file),
    mimeType: file.type,
    size: file.size,
    dateAdded: now,
    dateModified: now,
    lastAccessedAt: now,
    tags: [],
  };
  const tx = db.transaction(['files', 'blobs'], 'readwrite');
  await tx.objectStore('files').put(entry);
  await tx.objectStore('blobs').put(file, id);
  await tx.done;
  return entry;
}

export async function getFileBlob(id: string): Promise<Blob | undefined> {
  const db = await getDb();
  return db.get('blobs', id);
}

export async function updateFileBlob(id: string, blob: Blob): Promise<void> {
  const db = await getDb();
  const file = await db.get('files', id);
  const tx = db.transaction(['files', 'blobs'], 'readwrite');
  if (file) await tx.objectStore('files').put({ ...file, size: blob.size, dateModified: Date.now() });
  await tx.objectStore('blobs').put(blob, id);
  await tx.done;
}

export const DEFAULT_CANVAS_WIDTH = 1400;
export const DEFAULT_CANVAS_HEIGHT = 1800;

export async function createNote(name: string, folderId: string): Promise<FileEntry> {
  const db = await getDb();
  const id = newId();
  const now = Date.now();
  const blob = new Blob([''], { type: 'application/json' });
  const entry: FileEntry = {
    id,
    name,
    folderId,
    kind: 'note',
    mimeType: 'application/json',
    size: blob.size,
    dateAdded: now,
    dateModified: now,
    lastAccessedAt: now,
    tags: [],
  };
  const tx = db.transaction(['files', 'blobs'], 'readwrite');
  await tx.objectStore('files').put(entry);
  await tx.objectStore('blobs').put(blob, id);
  await tx.done;
  return entry;
}

export async function createCanvas(
  name: string,
  folderId: string,
  width: number = DEFAULT_CANVAS_WIDTH,
  height: number = DEFAULT_CANVAS_HEIGHT,
): Promise<FileEntry> {
  const db = await getDb();
  const id = newId();
  const now = Date.now();
  const blob = new Blob([''], { type: 'application/json' });
  const entry: FileEntry = {
    id,
    name,
    folderId,
    kind: 'canvas',
    mimeType: 'application/json',
    size: blob.size,
    dateAdded: now,
    dateModified: now,
    lastAccessedAt: now,
    canvasWidth: width,
    canvasHeight: height,
    tags: [],
  };
  const tx = db.transaction(['files', 'blobs'], 'readwrite');
  await tx.objectStore('files').put(entry);
  await tx.objectStore('blobs').put(blob, id);
  await tx.done;
  return entry;
}

export async function createSlides(name: string, folderId: string): Promise<FileEntry> {
  const db = await getDb();
  const id = newId();
  const now = Date.now();
  const blob = new Blob([''], { type: 'application/json' });
  const entry: FileEntry = {
    id,
    name,
    folderId,
    kind: 'slides',
    mimeType: 'application/json',
    size: blob.size,
    dateAdded: now,
    dateModified: now,
    lastAccessedAt: now,
    tags: [],
  };
  const tx = db.transaction(['files', 'blobs'], 'readwrite');
  await tx.objectStore('files').put(entry);
  await tx.objectStore('blobs').put(blob, id);
  await tx.done;
  return entry;
}

export async function renameFolder(id: string, name: string): Promise<void> {
  const db = await getDb();
  const folder = await db.get('folders', id);
  if (!folder) return;
  await db.put('folders', { ...folder, name });
}

export async function renameFile(id: string, name: string): Promise<void> {
  const db = await getDb();
  const file = await db.get('files', id);
  if (!file) return;
  await db.put('files', { ...file, name, dateModified: Date.now() });
}

export async function touchFileAccess(id: string): Promise<void> {
  const db = await getDb();
  const file = await db.get('files', id);
  if (!file) return;
  await db.put('files', { ...file, lastAccessedAt: Date.now() });
}

export async function setFolderIcon(id: string, icon: string): Promise<void> {
  const db = await getDb();
  const folder = await db.get('folders', id);
  if (!folder) return;
  await db.put('folders', { ...folder, icon });
}

export async function setFileIcon(id: string, icon: string): Promise<void> {
  const db = await getDb();
  const file = await db.get('files', id);
  if (!file) return;
  await db.put('files', { ...file, icon });
}

export async function moveFolder(id: string, parentId: string): Promise<void> {
  const db = await getDb();
  const folder = await db.get('folders', id);
  if (!folder) return;
  await db.put('folders', { ...folder, parentId });
}

export async function moveFile(id: string, folderId: string): Promise<void> {
  const db = await getDb();
  const file = await db.get('files', id);
  if (!file) return;
  await db.put('files', { ...file, folderId });
}

export async function deleteFile(id: string): Promise<void> {
  const db = await getDb();
  const [outgoing, incoming] = await Promise.all([
    db.getAllFromIndex('links', 'bySource', id),
    db.getAllFromIndex('links', 'byTarget', id),
  ]);
  const tx = db.transaction(['files', 'blobs', 'links'], 'readwrite');
  await tx.objectStore('files').delete(id);
  await tx.objectStore('blobs').delete(id);
  await Promise.all([...outgoing, ...incoming].map((l) => tx.objectStore('links').delete(l.id)));
  await tx.done;
}

export async function deleteFolder(id: string): Promise<void> {
  const db = await getDb();
  const [subfolders, files] = await Promise.all([
    db.getAllFromIndex('folders', 'byParent', id),
    db.getAllFromIndex('files', 'byFolder', id),
  ]);
  await Promise.all(files.map((f) => deleteFile(f.id)));
  await Promise.all(subfolders.map((f) => deleteFolder(f.id)));
  await db.delete('folders', id);
}

export async function getFolderPath(folderId: string): Promise<Folder[]> {
  const db = await getDb();
  const path: Folder[] = [];
  let currentId = folderId;
  while (currentId !== ROOT_ID) {
    const folder = await db.get('folders', currentId);
    if (!folder) break;
    path.unshift(folder);
    currentId = folder.parentId;
  }
  return path;
}

export interface SearchResult {
  file: FileEntry;
  path: Folder[];
}

export async function searchFilesByName(query: string): Promise<SearchResult[]> {
  const db = await getDb();
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  const all = await db.getAll('files');
  const matches = all.filter((f) => f.name.toLowerCase().includes(needle));
  const results = await Promise.all(
    matches.map(async (file) => ({ file, path: await getFolderPath(file.folderId) })),
  );
  return results.sort((a, b) => a.file.name.localeCompare(b.file.name));
}

export async function getFile(id: string): Promise<FileEntry | undefined> {
  const db = await getDb();
  return db.get('files', id);
}

/** Replaces sourceId's full set of outgoing links with exactly targetIds,
 * so authoring never has to diff — just report "here's everything I link to now". */
export async function syncOutgoingLinks(sourceId: string, targetIds: string[]): Promise<void> {
  const db = await getDb();
  const existing = await db.getAllFromIndex('links', 'bySource', sourceId);
  const tx = db.transaction('links', 'readwrite');
  const wanted = new Set(targetIds);
  const already = new Set(existing.map((l) => l.targetId));
  await Promise.all(existing.filter((l) => !wanted.has(l.targetId)).map((l) => tx.store.delete(l.id)));
  await Promise.all(
    targetIds
      .filter((targetId) => !already.has(targetId))
      .map((targetId) =>
        tx.store.put({ id: crypto.randomUUID(), sourceId, targetId, createdAt: Date.now() } satisfies Link),
      ),
  );
  await tx.done;
}

export async function getBacklinks(targetId: string): Promise<FileEntry[]> {
  const db = await getDb();
  const links = await db.getAllFromIndex('links', 'byTarget', targetId);
  const files = await Promise.all(links.map((l) => db.get('files', l.sourceId)));
  return files.filter((f): f is FileEntry => !!f).sort((a, b) => a.name.localeCompare(b.name));
}

export async function getAllLinks(): Promise<Link[]> {
  const db = await getDb();
  return db.getAll('links');
}

export async function getAllFiles(): Promise<FileEntry[]> {
  const db = await getDb();
  return db.getAll('files');
}
