import { useState, useEffect } from 'react';
import * as SQLite from 'expo-sqlite';

const DB_NAME = 'cleo.db';

export function useDatabase() {
  const [db, setDb] = useState<SQLite.SQLiteDatabase | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const database = await SQLite.openDatabaseAsync(DB_NAME);
        setDb(database);
      } catch (error) {
        console.error('Failed to open database:', error);
      }
    })();
  }, []);

  return db;
}
