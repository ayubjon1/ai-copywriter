import Parser from 'rss-parser';
import { readFileSync } from 'fs';
import { isNewsPublished } from './database.js';

const parser = new Parser({
  customFields: {
    item: [
      ['media:content', 'media'],
      ['media:thumbnail', 'mediaThumbnail'],
      ['enclosure', 'enclosure'],
      ['content:encoded', 'contentEncoded']
    ]
  }
});

function loadConfig() {
  const configPath = new URL('../../config.json', import.meta.url);
  return JSON.parse(readFileSync(configPath, 'utf-8'));
}

function extractImageUrl(item) {
  // Try different common image locations in RSS
  if (item.media?.$ ?.url) {
    return item.media.$.url;
  }
  if (item.mediaThumbnail?.$ ?.url) {
    return item.mediaThumbnail.$.url;
  }
  if (item.enclosure?.url && item.enclosure.type?.startsWith('image')) {
    return item.enclosure.url;
  }

  // Try to extract from content
  const content = item.contentEncoded || item.content || item.description || '';
  const imgMatch = content.match(/<img[^>]+src="([^"]+)"/);
  if (imgMatch) {
    return imgMatch[1];
  }

  return null;
}

function cleanHtml(html) {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export async function fetchNewsFromSources() {
  const config = loadConfig();
  const allNews = [];

  for (const source of config.rss_sources) {
    if (!source.enabled) continue;

    try {
      console.log(`Fetching from: ${source.name}`);
      const feed = await parser.parseURL(source.url);

      for (const item of feed.items) {
        const url = item.link || item.guid;
        if (!url) continue;

        // Check if already published
        const isPublished = await isNewsPublished(url);
        if (isPublished) continue;

        const content = cleanHtml(item.contentEncoded || item.content || item.description);
        const imageUrl = extractImageUrl(item);

        allNews.push({
          title: item.title,
          content: content,
          url: url,
          imageUrl: imageUrl,
          pubDate: item.pubDate ? new Date(item.pubDate) : new Date(),
          sourceName: source.name,
          category: source.category
        });
      }
    } catch (error) {
      console.error(`Error fetching ${source.name}:`, error.message);
    }
  }

  // Sort by date (newest first) and return
  return allNews.sort((a, b) => b.pubDate - a.pubDate);
}

export async function getRandomUnpublishedNews() {
  const news = await fetchNewsFromSources();
  if (news.length === 0) return null;

  // Pick random from top 10 newest
  const topNews = news.slice(0, Math.min(10, news.length));
  const randomIndex = Math.floor(Math.random() * topNews.length);
  return topNews[randomIndex];
}
