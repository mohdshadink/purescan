import { createPool } from '@vercel/postgres';

export const db = process.env.POSTGRES_URL
  ? createPool({
    connectionString: process.env.POSTGRES_URL,
  })
  : {
    sql: async () => {
      console.warn("Database not connected: POSTGRES_URL missing");
      return { rows: [] };
    },
  } as unknown as ReturnType<typeof createPool>;

export async function seed() {
  await db.sql`
    CREATE TABLE IF NOT EXISTS scans (
      id SERIAL PRIMARY KEY,
      userId TEXT NOT NULL,
      foodName TEXT NOT NULL,
      score INTEGER NOT NULL,
      analysis TEXT NOT NULL,
      imageUrl TEXT NOT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
}
