import { getDb } from './db';
import { ROOT_ID, type FileEntry, type FileKind, type Folder } from './types';

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
  const entry: FileEntry = {
    id,
    name: file.name,
    folderId,
    kind: detectKind(file),
    mimeType: file.type,
    size: file.size,
    dateAdded: Date.now(),
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
  await db.put('files', { ...file, name });
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
  const tx = db.transaction(['files', 'blobs'], 'readwrite');
  await tx.objectStore('files').delete(id);
  await tx.objectStore('blobs').delete(id);
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
