import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Folder, FileEntry } from './types';

interface PkosDB extends DBSchema {
  folders: {
    key: string;
    value: Folder;
    indexes: { byParent: string };
  };
  files: {
    key: string;
    value: FileEntry;
    indexes: { byFolder: string };
  };
  blobs: {
    key: string;
    value: Blob;
  };
}

let dbPromise: Promise<IDBPDatabase<PkosDB>> | null = null;

export function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<PkosDB>('pkos', 1, {
      upgrade(db) {
        const folders = db.createObjectStore('folders', { keyPath: 'id' });
        folders.createIndex('byParent', 'parentId');
        const files = db.createObjectStore('files', { keyPath: 'id' });
        files.createIndex('byFolder', 'folderId');
        db.createObjectStore('blobs');
      },
    });
  }
  return dbPromise;
}
