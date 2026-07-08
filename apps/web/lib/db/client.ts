import { createClient } from '@edunexus/database';

export const db = createClient(process.env.DATABASE_URL);

export type DB = typeof db;
