import { Telegraf } from 'telegraf';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config();

function loadConfig() {
  const configPath = new URL('../../config.json', import.meta.url);
  return JSON.parse(readFileSync(configPath, 'utf-8'));
}

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const channelId = process.env.TELEGRAM_CHANNEL_ID;

export async function publishToChannel(text, imageUrl = null, sourceUrl = null) {
  const config = loadConfig();

  // Add source link if configured
  let finalText = text;
  if (config.content.include_source_link && sourceUrl) {
    finalText += `\n\nИсточник: ${sourceUrl}`;
  }

  try {
    if (imageUrl) {
      // Try to send with photo
      try {
        await bot.telegram.sendPhoto(channelId, imageUrl, {
          caption: finalText,
          parse_mode: 'HTML'
        });
        return true;
      } catch (photoError) {
        // If photo fails, send as text only
        console.warn('Failed to send photo, sending text only:', photoError.message);
        await bot.telegram.sendMessage(channelId, finalText, {
          parse_mode: 'HTML',
          disable_web_page_preview: false
        });
        return true;
      }
    } else {
      // Send text only
      await bot.telegram.sendMessage(channelId, finalText, {
        parse_mode: 'HTML',
        disable_web_page_preview: false
      });
      return true;
    }
  } catch (error) {
    console.error('Telegram send error:', error.message);
    throw error;
  }
}

export async function testTelegramConnection() {
  try {
    const me = await bot.telegram.getMe();
    console.log(`Bot connected: @${me.username}`);

    // Test channel access
    try {
      const chat = await bot.telegram.getChat(channelId);
      console.log(`Channel access confirmed: ${chat.title}`);
      return true;
    } catch (chatError) {
      console.error('Cannot access channel. Make sure bot is admin in the channel.');
      return false;
    }
  } catch (error) {
    console.error('Telegram connection failed:', error.message);
    return false;
  }
}

export default bot;
