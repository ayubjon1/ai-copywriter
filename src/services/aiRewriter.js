import axios from 'axios';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config();

function loadConfig() {
  const configPath = new URL('../../config.json', import.meta.url);
  return JSON.parse(readFileSync(configPath, 'utf-8'));
}

const SYSTEM_PROMPT = `Ты — профессиональный копирайтер для новостного Telegram-канала.

Твоя задача: переписать новость своими словами для публикации в Telegram.

Правила:
1. Пиши на русском языке (если оригинал на английском — переведи)
2. Стиль: формальный, но легкий для понимания обычным человеком
3. НЕ добавляй эмодзи
4. НЕ добавляй свои комментарии или мнения
5. Сохрани все важные факты и цифры
6. Сделай текст компактным, но информативным
7. Используй простые предложения
8. Не начинай с "Сегодня", "Вчера" или подобных слов
9. Максимальная длина: 800 символов

Формат ответа: только переписанный текст новости, без пояснений.`;

export async function rewriteNews(title, content) {
  const config = loadConfig();
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY not found in environment variables');
  }

  const userPrompt = `Заголовок: ${title}

Содержание: ${content}

Перепиши эту новость для Telegram-канала.`;

  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: config.ai.model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: config.ai.max_tokens,
        temperature: config.ai.temperature
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://github.com/news-bot',
          'X-Title': 'News Bot'
        }
      }
    );

    const rewrittenText = response.data.choices[0]?.message?.content;

    if (!rewrittenText) {
      throw new Error('Empty response from AI');
    }

    // Trim to max length if needed
    const maxLength = config.content.max_post_length;
    if (rewrittenText.length > maxLength) {
      return rewrittenText.substring(0, maxLength - 3) + '...';
    }

    return rewrittenText.trim();
  } catch (error) {
    if (error.response) {
      console.error('OpenRouter API error:', error.response.data);
    }
    throw error;
  }
}

export async function testAiConnection() {
  try {
    const result = await rewriteNews(
      'Test Title',
      'This is a test content to verify the AI connection is working properly.'
    );
    console.log('AI connection test successful');
    return true;
  } catch (error) {
    console.error('AI connection test failed:', error.message);
    return false;
  }
}
