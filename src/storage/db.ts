import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Folder, FileEntry, Link } from './types';

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
  links: {
    key: string;
    value: Link;
    indexes: { bySource: string; byTarget: string };
  };
}

let dbPromise: Promise<IDBPDatabase<PkosDB>> | null = null;

export function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<PkosDB>('pkos', 3, {
      upgrade(db, oldVersion, _newVersion, transaction) {
        if (oldVersion < 1) {
          const folders = db.createObjectStore('folders', { keyPath: 'id' });
          folders.createIndex('byParent', 'parentId');
          const files = db.createObjectStore('files', { keyPath: 'id' });
          files.createIndex('byFolder', 'folderId');
          db.createObjectStore('blobs');
        }
        if (oldVersion < 2) {
          const links = db.createObjectStore('links', { keyPath: 'id' });
          links.createIndex('bySource', 'sourceId');
          links.createIndex('byTarget', 'targetId');
        }
        // Some early builds bumped the DB to version 2 before the byTarget
        // index existed in this upgrade block, so browsers that already
        // upgraded never got it. Defensively ensure it exists.
        if (oldVersion < 3) {
          const links = transaction.objectStore('links');
          if (!links.indexNames.contains('byTarget')) {
            links.createIndex('byTarget', 'targetId');
          }
          if (!links.indexNames.contains('bySource')) {
            links.createIndex('bySource', 'sourceId');
          }
        }
      },
    });
  }
  return dbPromise;
}
