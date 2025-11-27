import cron from 'node-cron';
import { readFileSync } from 'fs';
import { getTodayPostsCount, incrementTodayPostsCount } from './database.js';

function loadConfig() {
  const configPath = new URL('../../config.json', import.meta.url);
  return JSON.parse(readFileSync(configPath, 'utf-8'));
}

// Generate random posting times for today
function generatePostingTimes() {
  const config = loadConfig();
  const { min, max } = config.posting.posts_per_day;
  const { start, end } = config.posting.active_hours;
  const skipProbability = config.posting.skip_probability;

  // Random number of posts for today
  const postsCount = Math.floor(Math.random() * (max - min + 1)) + min;

  // Generate random times within active hours
  const times = [];
  const totalMinutes = (end - start) * 60;

  for (let i = 0; i < postsCount; i++) {
    // Skip some posts randomly
    if (Math.random() < skipProbability) continue;

    const randomMinute = Math.floor(Math.random() * totalMinutes);
    const hour = start + Math.floor(randomMinute / 60);
    const minute = randomMinute % 60;

    // Add random seconds for more human-like timing
    const second = Math.floor(Math.random() * 60);

    times.push({ hour, minute, second });
  }

  // Sort by time
  times.sort((a, b) => {
    if (a.hour !== b.hour) return a.hour - b.hour;
    return a.minute - b.minute;
  });

  // Ensure minimum delay between posts
  const minDelay = config.posting.min_delay_between_posts_minutes;
  const filteredTimes = [];

  for (const time of times) {
    const timeInMinutes = time.hour * 60 + time.minute;

    if (filteredTimes.length === 0) {
      filteredTimes.push(time);
      continue;
    }

    const lastTime = filteredTimes[filteredTimes.length - 1];
    const lastTimeInMinutes = lastTime.hour * 60 + lastTime.minute;

    if (timeInMinutes - lastTimeInMinutes >= minDelay) {
      filteredTimes.push(time);
    }
  }

  return filteredTimes;
}

export class Scheduler {
  constructor(publishCallback) {
    this.publishCallback = publishCallback;
    this.todaysTimes = [];
    this.timeouts = [];
    this.isRunning = false;
  }

  async canPublish() {
    const config = loadConfig();
    const todayPosts = await getTodayPostsCount();
    return todayPosts < config.posting.posts_per_day.max;
  }

  scheduleForToday() {
    // Clear existing timeouts
    this.timeouts.forEach(t => clearTimeout(t));
    this.timeouts = [];

    this.todaysTimes = generatePostingTimes();
    const now = new Date();

    console.log(`Scheduled ${this.todaysTimes.length} posts for today:`);

    for (const time of this.todaysTimes) {
      const scheduledTime = new Date();
      scheduledTime.setHours(time.hour, time.minute, time.second, 0);

      // Skip if time already passed
      if (scheduledTime <= now) {
        console.log(`  - ${time.hour}:${String(time.minute).padStart(2, '0')} (skipped, already passed)`);
        continue;
      }

      const delay = scheduledTime - now;
      console.log(`  - ${time.hour}:${String(time.minute).padStart(2, '0')}:${String(time.second).padStart(2, '0')}`);

      const timeout = setTimeout(async () => {
        try {
          const canPost = await this.canPublish();
          if (canPost) {
            console.log(`\n[${new Date().toLocaleTimeString()}] Publishing scheduled post...`);
            await this.publishCallback();
            await incrementTodayPostsCount();
          } else {
            console.log('Daily post limit reached, skipping');
          }
        } catch (error) {
          console.error('Scheduled publish failed:', error.message);
        }
      }, delay);

      this.timeouts.push(timeout);
    }
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    // Schedule for today immediately
    this.scheduleForToday();

    // Reset and reschedule every day at midnight
    cron.schedule('0 0 * * *', () => {
      console.log('\n=== New day, generating new schedule ===');
      this.scheduleForToday();
    });

    console.log('\nScheduler started. Posts will be published at random times.');
  }

  stop() {
    this.isRunning = false;
    this.timeouts.forEach(t => clearTimeout(t));
    this.timeouts = [];
    console.log('Scheduler stopped');
  }

  getNextPostTime() {
    const now = new Date();
    for (const time of this.todaysTimes) {
      const scheduledTime = new Date();
      scheduledTime.setHours(time.hour, time.minute, time.second, 0);
      if (scheduledTime > now) {
        return scheduledTime;
      }
    }
    return null;
  }
}
