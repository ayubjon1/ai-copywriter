# AI News Bot для Telegram

Бот автоматически собирает новости из RSS-источников, переписывает их с помощью AI и публикует в Telegram-канал с имитацией поведения живого человека.

## Возможности

- Сбор новостей из нескольких RSS-источников
- Переписывание контента с помощью AI (OpenRouter)
- Перевод с английского на русский
- Публикация с картинками из источника
- Рандомное время публикаций (как живой человек)
- Иногда пропускает публикации для естественности
- Отслеживание опубликованных новостей (без дубликатов)

## Установка

### 1. Клонируйте репозиторий

```bash
git clone <your-repo>
cd ai-copywriter
```

### 2. Установите зависимости

```bash
npm install
```

### 3. Настройте переменные окружения

```bash
cp .env.example .env
```

Отредактируйте `.env`:

```env
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHANNEL_ID=@your_channel
OPENROUTER_API_KEY=your_openrouter_key
DATABASE_URL=postgresql://user:password@localhost:5432/news_bot
```

### 4. Настройте RSS-источники

Отредактируйте `config.json`:

```json
{
  "rss_sources": [
    {
      "name": "Хабр",
      "url": "https://habr.com/ru/rss/all/all/",
      "enabled": true,
      "category": "tech"
    },
    {
      "name": "TechCrunch",
      "url": "https://techcrunch.com/feed/",
      "enabled": true,
      "category": "tech"
    }
  ]
}
```

## Запуск

### Локально

```bash
# Запуск бота
npm start

# Опубликовать одну новость сейчас
npm start -- --post-now

# Только тестирование подключений
npm start -- --test
```

### Docker (рекомендуется для сервера)

```bash
# Запуск с PostgreSQL
docker-compose up -d

# Просмотр логов
docker-compose logs -f bot
```

## Деплой на Aeza

### 1. Создайте VPS на Aeza

- Ubuntu 22.04
- Минимум 1GB RAM

### 2. Установите Docker

```bash
curl -fsSL https://get.docker.com | sh
```

### 3. Загрузите проект

```bash
git clone <your-repo> /opt/news-bot
cd /opt/news-bot
```

### 4. Создайте .env файл

```bash
nano .env
```

### 5. Запустите

```bash
docker-compose up -d
```

## Конфигурация

### config.json

| Параметр | Описание |
|----------|----------|
| `rss_sources` | Массив RSS-источников |
| `posting.posts_per_day` | Мин/макс постов в день (5-10) |
| `posting.active_hours` | Часы публикации (9-22) |
| `posting.min_delay_between_posts_minutes` | Минимум минут между постами |
| `posting.skip_probability` | Вероятность пропуска поста (0.1 = 10%) |
| `ai.model` | Модель OpenRouter (напр. `openai/gpt-4o-mini`) |
| `content.max_post_length` | Максимальная длина поста |
| `content.include_source_link` | Добавлять ссылку на источник |

### Доступные модели OpenRouter

- `openai/gpt-4o-mini` - быстрая и дешевая
- `openai/gpt-4o` - качественнее, дороже
- `anthropic/claude-3-haiku` - быстрая альтернатива
- `google/gemini-flash-1.5` - бесплатная опция

## Структура проекта

```
ai-copywriter/
├── src/
│   ├── index.js           # Точка входа
│   └── services/
│       ├── database.js    # PostgreSQL
│       ├── rssParser.js   # Парсер RSS
│       ├── aiRewriter.js  # OpenRouter AI
│       ├── telegram.js    # Telegram API
│       └── scheduler.js   # Планировщик
├── config.json            # RSS источники и настройки
├── .env                   # Секреты (не коммитить!)
├── docker-compose.yml     # Docker конфиг
└── Dockerfile
```

## Добавление RSS-источника

Отредактируйте `config.json`:

```json
{
  "rss_sources": [
    {
      "name": "Название источника",
      "url": "https://example.com/rss",
      "enabled": true,
      "category": "tech"
    }
  ]
}
```

Перезапустите бота:

```bash
docker-compose restart bot
```

## Troubleshooting

### Бот не публикует

1. Проверьте, что бот добавлен в канал как администратор
2. Проверьте TELEGRAM_CHANNEL_ID (должен быть с @)
3. Запустите `npm start -- --test`

### Нет новостей

1. Проверьте RSS URL в браузере
2. Убедитесь, что `enabled: true` в config.json
3. Проверьте логи: `docker-compose logs bot`

### Ошибки AI

1. Проверьте баланс на OpenRouter
2. Проверьте правильность API ключа
3. Попробуйте другую модель в config.json
