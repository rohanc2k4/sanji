import Database, { type Database as DB } from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import * as sqliteVec from 'sqlite-vec';

export type Db = DB;

export function openDb(file: string): Db {
  mkdirSync(dirname(file), { recursive: true });
  const db = new Database(file);
  db.defaultSafeIntegers(true); // return INTEGER columns as BigInt so vec0 rowid bindings work
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('synchronous = NORMAL');
  sqliteVec.load(db);
  return db;
}
