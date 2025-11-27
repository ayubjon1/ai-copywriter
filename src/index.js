import dotenv from 'dotenv';
import { initDatabase, savePublishedNews, getTodayPostsCount } from './services/database.js';
import { getRandomUnpublishedNews } from './services/rssParser.js';
import { rewriteNews, testAiConnection } from './services/aiRewriter.js';
import { publishToChannel, testTelegramConnection } from './services/telegram.js';
import { Scheduler } from './services/scheduler.js';

dotenv.config();

async function publishSingleNews() {
  // Get random unpublished news
  const news = await getRandomUnpublishedNews();

  if (!news) {
    console.log('No new articles to publish');
    return false;
  }

  console.log(`Processing: "${news.title}"`);

  // Rewrite with AI
  const rewrittenContent = await rewriteNews(news.title, news.content);
  console.log('Content rewritten successfully');

  // Publish to Telegram
  await publishToChannel(rewrittenContent, news.imageUrl, news.url);
  console.log('Published to Telegram');

  // Save to database
  await savePublishedNews({
    sourceUrl: news.url,
    title: news.title,
    originalContent: news.content,
    rewrittenContent: rewrittenContent,
    imageUrl: news.imageUrl,
    sourceName: news.sourceName
  });

  console.log('Saved to database');
  return true;
}

async function runTests() {
  console.log('\n=== Running connection tests ===\n');

  // Test Telegram
  console.log('Testing Telegram connection...');
  const telegramOk = await testTelegramConnection();
  if (!telegramOk) {
    console.error('Telegram test failed. Check your bot token and channel ID.');
    return false;
  }

  // Test AI
  console.log('\nTesting AI connection...');
  const aiOk = await testAiConnection();
  if (!aiOk) {
    console.error('AI test failed. Check your OpenRouter API key.');
    return false;
  }

  console.log('\n=== All tests passed ===\n');
  return true;
}

async function main() {
  console.log('=================================');
  console.log('  AI News Bot for Telegram');
  console.log('=================================\n');

  // Check required env vars
  const required = ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHANNEL_ID', 'OPENROUTER_API_KEY', 'DATABASE_URL'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('Missing required environment variables:');
    missing.forEach(key => console.error(`  - ${key}`));
    console.error('\nPlease check your .env file');
    process.exit(1);
  }

  try {
    // Initialize database
    console.log('Initializing database...');
    await initDatabase();

    // Run tests
    const testsOk = await runTests();
    if (!testsOk) {
      process.exit(1);
    }

    // Check command line arguments
    const args = process.argv.slice(2);

    if (args.includes('--post-now')) {
      // Manual single post
      console.log('Publishing single post...\n');
      await publishSingleNews();
      process.exit(0);
    }

    if (args.includes('--test')) {
      // Just run tests
      console.log('Tests completed.');
      process.exit(0);
    }

    // Start scheduler
    const scheduler = new Scheduler(publishSingleNews);
    scheduler.start();

    const nextPost = scheduler.getNextPostTime();
    if (nextPost) {
      console.log(`\nNext post scheduled for: ${nextPost.toLocaleTimeString()}`);
    }

    const todayPosts = await getTodayPostsCount();
    console.log(`Posts published today: ${todayPosts}`);

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\nShutting down...');
      scheduler.stop();
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('\nShutting down...');
      scheduler.stop();
      process.exit(0);
    });

    // Keep process running
    console.log('\nBot is running. Press Ctrl+C to stop.\n');

  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();
