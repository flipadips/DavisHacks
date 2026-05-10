import pg from "pg";
import { seedProviders } from "./seedProviders.js";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS commands (
      id SERIAL PRIMARY KEY,
      command TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(
    `
    INSERT INTO users (username, password)
    VALUES ($1, $2)
    ON CONFLICT (username) DO NOTHING;
    `,
    ["mockuser", "mockpassword"]
  );

  await pool.query(`
    CREATE TABLE IF NOT EXISTS providers (
      id SERIAL PRIMARY KEY,
      source_id TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      short_summary TEXT NOT NULL,
      place_name TEXT NOT NULL,
      address TEXT NOT NULL,
      city TEXT,
      state TEXT,
      latitude DOUBLE PRECISION NOT NULL,
      longitude DOUBLE PRECISION NOT NULL,
      insurance TEXT[] NOT NULL DEFAULT '{}',
      specialty TEXT NOT NULL,
      rating NUMERIC(2, 1) NOT NULL DEFAULT 4.5,
      review_count INTEGER NOT NULL DEFAULT 18,
      accepting_patients BOOLEAN NOT NULL DEFAULT TRUE,
      tags TEXT[] NOT NULL DEFAULT '{}',
      languages TEXT[] NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    ALTER TABLE providers
      ADD COLUMN IF NOT EXISTS source_id TEXT,
      ADD COLUMN IF NOT EXISTS name TEXT,
      ADD COLUMN IF NOT EXISTS short_summary TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS place_name TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS address TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS city TEXT,
      ADD COLUMN IF NOT EXISTS state TEXT,
      ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS insurance TEXT[] NOT NULL DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS specialty TEXT NOT NULL DEFAULT 'PRIMARY CARE',
      ADD COLUMN IF NOT EXISTS rating NUMERIC(2, 1) NOT NULL DEFAULT 4.5,
      ADD COLUMN IF NOT EXISTS review_count INTEGER NOT NULL DEFAULT 18,
      ADD COLUMN IF NOT EXISTS accepting_patients BOOLEAN NOT NULL DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS languages TEXT[] NOT NULL DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS providers_source_id_idx
      ON providers (source_id);
  `);

  await seedProviderRows();
}

async function seedProviderRows() {
  for (const provider of seedProviders) {
    await pool.query(
      `
        INSERT INTO providers (
          source,
          source_id,
          name,
          clinic_name,
          short_summary,
          place_name,
          address,
          city,
          state,
          latitude,
          longitude,
          insurance,
          specialty,
          rating,
          review_count,
          accepting_patients,
          tags,
          languages,
          updated_at
        )
        VALUES (
          'seed', $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW()
        )
        ON CONFLICT (source_id)
        DO UPDATE SET
          name = EXCLUDED.name,
          clinic_name = EXCLUDED.clinic_name,
          short_summary = EXCLUDED.short_summary,
          place_name = EXCLUDED.place_name,
          address = EXCLUDED.address,
          city = EXCLUDED.city,
          state = EXCLUDED.state,
          latitude = EXCLUDED.latitude,
          longitude = EXCLUDED.longitude,
          insurance = EXCLUDED.insurance,
          specialty = EXCLUDED.specialty,
          rating = EXCLUDED.rating,
          review_count = EXCLUDED.review_count,
          accepting_patients = EXCLUDED.accepting_patients,
          tags = EXCLUDED.tags,
          languages = EXCLUDED.languages,
          updated_at = NOW();
      `,
      [
        provider.source_id,
        provider.name,
        provider.place_name,
        provider.short_summary,
        provider.place_name,
        provider.address,
        provider.city,
        provider.state,
        provider.latitude,
        provider.longitude,
        provider.insurance,
        provider.specialty,
        provider.rating,
        provider.review_count,
        provider.accepting_patients,
        provider.tags,
        provider.languages
      ]
    );
  }
}
