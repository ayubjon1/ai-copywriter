import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

export async function initDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS published_news (
        id SERIAL PRIMARY KEY,
        source_url TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        original_content TEXT,
        rewritten_content TEXT,
        image_url TEXT,
        published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        source_name TEXT
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS posting_schedule (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        posts_count INTEGER DEFAULT 0,
        UNIQUE(date)
      )
    `);

    console.log('Database initialized successfully');
  } finally {
    client.release();
  }
}

export async function isNewsPublished(url) {
  const result = await pool.query(
    'SELECT id FROM published_news WHERE source_url = $1',
    [url]
  );
  return result.rows.length > 0;
}

export async function savePublishedNews(news) {
  const { sourceUrl, title, originalContent, rewrittenContent, imageUrl, sourceName } = news;
  await pool.query(
    `INSERT INTO published_news (source_url, title, original_content, rewritten_content, image_url, source_name)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (source_url) DO NOTHING`,
    [sourceUrl, title, originalContent, rewrittenContent, imageUrl, sourceName]
  );
}

export async function getTodayPostsCount() {
  const result = await pool.query(
    `SELECT posts_count FROM posting_schedule WHERE date = CURRENT_DATE`
  );
  return result.rows[0]?.posts_count || 0;
}

export async function incrementTodayPostsCount() {
  await pool.query(`
    INSERT INTO posting_schedule (date, posts_count)
    VALUES (CURRENT_DATE, 1)
    ON CONFLICT (date) DO UPDATE SET posts_count = posting_schedule.posts_count + 1
  `);
}

export async function getRecentNews(limit = 50) {
  const result = await pool.query(
    'SELECT * FROM published_news ORDER BY published_at DESC LIMIT $1',
    [limit]
  );
  return result.rows;
}

export default pool;
