# 🤖 Instagram Chatbot Demo

Демонстрационный проект для создания чатбота в Instagram Direct Messages с функцией echo (отправка того же сообщения обратно).

## 📋 Возможности

- ✅ Полный OAuth 2.0 flow для Instagram
- ✅ Web-интерфейс для авторизации (Vue.js)
- ✅ Webhook для получения сообщений
- ✅ Echo-функция (автоматический ответ тем же сообщением)
- ✅ Backend API на Node.js + Express
- ✅ Хранение токенов в памяти (для демо)

## 🏗️ Архитектура

```
instaai/
├── backend/              # Node.js backend
│   ├── src/
│   │   ├── routes/      # API endpoints
│   │   ├── services/    # Instagram API клиент
│   │   └── server.js    # Express сервер
│   └── package.json
├── frontend/            # Vue.js SPA
│   ├── src/
│   │   └── App.vue     # Главный компонент
│   └── package.json
└── README.md
```

## 📦 Требования

- Node.js 18+ 
- npm или yarn
- ngrok (для webhook)
- Instagram Business/Creator аккаунт
- Facebook Page связанная с Instagram
- Facebook App с необходимыми разрешениями

## 🚀 Быстрый старт

### Шаг 1: Создание Facebook App

1. Перейдите на https://developers.facebook.com/apps/
2. Создайте новое приложение (тип: **Business**)
3. Добавьте продукт **"Instagram"** и **"Webhooks"**
4. В настройках приложения найдите:
   - **App ID** 
   - **App Secret** (Settings → Basic)

### Шаг 2: Настройка разрешений

В разделе **Instagram → Basic Display** добавьте:

**OAuth Redirect URIs:**
```
http://localhost:3000/auth/callback
```

**Необходимые разрешения (permissions):**
- `instagram_basic`
- `instagram_manage_messages`
- `pages_manage_metadata`
- `pages_messaging`

### Шаг 3: Подготовка Instagram аккаунта

1. Конвертируйте ваш Instagram в **Business** или **Creator** аккаунт:
   - Откройте Instagram → Settings → Account → Switch to Professional Account
   
2. Свяжите с Facebook Page:
   - Instagram → Settings → Business → Page
   - Выберите существующую или создайте новую Facebook Page

3. В Facebook App добавьте Instagram аккаунт:
   - Products → Instagram → Settings
   - Add Instagram Account

### Шаг 4: Установка зависимостей

```bash
# Backend
cd backend
npm install

# Frontend (в новом терминале)
cd frontend
npm install
```

### Шаг 5: Настройка переменных окружения

Создайте файл `backend/.env` на основе `.env.example`:

```bash
cd backend
cp .env.example .env
```

Отредактируйте `backend/.env`:

```env
# Instagram App Configuration
INSTAGRAM_APP_ID=your_facebook_app_id
INSTAGRAM_APP_SECRET=your_facebook_app_secret
INSTAGRAM_REDIRECT_URI=http://localhost:3000/auth/callback

# Server Configuration
PORT=3000
NODE_ENV=development

# Webhook Configuration
WEBHOOK_VERIFY_TOKEN=your_random_secret_token_123

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

> **ВАЖНО:** `WEBHOOK_VERIFY_TOKEN` - любая случайная строка для безопасности webhook

### Шаг 6: Запуск приложения

**Терминал 1 - Backend:**
```bash
cd backend
npm run dev
```

Вы должны увидеть:
```
🚀 Instagram Chatbot Backend running on port 3000
```

**Терминал 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Вы должны увидеть:
```
Local: http://localhost:5173/
```

**Терминал 3 - ngrok:**
```bash
ngrok http 3000
```

Скопируйте HTTPS URL (например: `https://abc123.ngrok.io`)

### Шаг 7: Настройка Webhook

1. Откройте Facebook App → **Products → Webhooks**
2. Выберите **Instagram** в выпадающем списке
3. Нажмите **"Edit Subscription"**
4. Заполните:
   - **Callback URL:** `https://kirby-plutonic-stiffly.ngrok-free.dev/webhook`
   - **Verify Token:** значение из вашего `.env` (WEBHOOK_VERIFY_TOKEN)
5. Выберите поля подписки:
   - ✓ `messages`
6. Нажмите **"Verify and Save"**

Если всё настроено правильно, вы увидите ✅ рядом с webhook URL.

### Шаг 8: Авторизация

1. Откройте браузер: http://localhost:5173
2. Нажмите **"Подключить Instagram"**
3. Войдите в Facebook/Instagram
4. Разрешите доступ к приложению
5. Вы будете перенаправлены обратно с успешной авторизацией

## 🧪 Тестирование

1. После успешной авторизации бот активен
2. Отправьте сообщение в директ вашему Instagram аккаунту **с другого аккаунта**
3. Бот автоматически ответит тем же сообщением
4. Проверьте логи в терминале backend для отладки

## 📡 API Endpoints

### Backend (http://localhost:3000)

| Endpoint | Method | Описание |
|----------|--------|----------|
| `/` | GET | Информация о API |
| `/health` | GET | Health check |
| `/auth/login` | GET | Получить URL для OAuth |
| `/auth/callback` | GET | OAuth callback |
| `/auth/status` | GET | Статус авторизации |
| `/webhook` | GET | Webhook verification |
| `/webhook` | POST | Получение сообщений |

## 🔧 Разработка

### Структура кода

**Backend:**
- `src/server.js` - Express сервер и middleware
- `src/routes/auth.js` - OAuth endpoints
- `src/routes/webhook.js` - Webhook endpoints
- `src/services/instagram.js` - Instagram API клиент

**Frontend:**
- `src/App.vue` - Главный компонент с UI
- `src/main.js` - Entry point

### Логика Echo бота

```javascript
// backend/src/services/instagram.js
async handleWebhook(data) {
  for (const entry of data.entry) {
    for (const messaging of entry.messaging || []) {
      if (messaging.message && !messaging.message.is_echo) {
        const senderId = messaging.sender.id;
        const messageText = messaging.message.text;
        
        // Echo - отправляем обратно
        await this.sendMessage(senderId, messageText);
      }
    }
  }
}
```

## 🚀 Будущее масштабирование

Эта демка идеально подходит как основа для более сложного бота. Для production рекомендуется:

### Python для бизнес-логики
```python
# Пример: AI-powered ответы
from openai import OpenAI

def generate_response(user_message):
    client = OpenAI()
    response = client.chat.completions.create(
        model="gpt-4",
        messages=[{"role": "user", "content": user_message}]
    )
    return response.choices[0].message.content
```

### Golang для высоконагруженных сервисов
```go
// Пример: обработка message queue
package main

import "github.com/streadway/amqp"

func processMessages() {
    // High-performance message processing
    // Rate limiting
    // Concurrent webhook handling
}
```

### Архитектура для production

```
┌─────────────┐
│  Instagram  │
└──────┬──────┘
       │ webhook
       ▼
┌─────────────┐      ┌──────────────┐
│   Node.js   │─────▶│  Message     │
│   Gateway   │      │  Queue       │
└─────────────┘      │  (RabbitMQ)  │
                     └──────┬───────┘
                            │
              ┌─────────────┼─────────────┐
              ▼             ▼             ▼
       ┌──────────┐  ┌──────────┐  ┌──────────┐
       │  Python  │  │  Python  │  │   Go     │
       │  Worker  │  │  Worker  │  │  Worker  │
       │  (AI)    │  │  (NLP)   │  │  (Fast)  │
       └──────────┘  └──────────┘  └──────────┘
              │             │             │
              └─────────────┼─────────────┘
                            ▼
                     ┌──────────────┐
                     │  PostgreSQL  │
                     │  + Redis     │
                     └──────────────┘
```

## 🐳 Деплой в Docker Swarm

Для продакшен деплоя с использованием Docker Swarm и Nginx Proxy Manager:

📖 **[Полная инструкция по Docker деплою](DOCKER_DEPLOY.md)**

### Краткая инструкция:

1. **Создайте сеть:**
```bash
docker network create --driver overlay --attachable shared-network
```

2. **Создайте файл `.env` с переменными окружения**

3. **Соберите образы:**
```bash
docker build -t instabot-backend:latest ./backend
docker build --build-arg VITE_BACKEND_URL=https://api.instabot.wbcheap.ru -t instabot-frontend:latest ./frontend
```

4. **Деплой:**
```bash
docker stack deploy -c docker-stack.yml instabot
```

5. **Настройте Nginx Proxy Manager** для доменов `instabot.wbcheap.ru` и `api.instabot.wbcheap.ru`

## 🚀 Деплой на Render.com

Для деплоя приложения на Render.com следуйте подробной инструкции:

📖 **[Полная инструкция по деплою](RENDER_DEPLOY.md)**

### ⚠️ Настройка Facebook OAuth

После деплоя нужно настроить Facebook App:

- 📘 **[Для старого интерфейса Facebook](FACEBOOK_OAUTH_SETUP.md)** (с Instagram Basic Display)
- 🆕 **[Для нового интерфейса Facebook 2024](FACEBOOK_OAUTH_NEW_INTERFACE.md)** (с "Настройка API для входа в Instagram")

```

2. **Создайте Blueprint на Render.com:**
   - Зарегистрируйтесь на https://render.com
   - New → Blueprint → Выберите репозиторий
   - Render автоматически найдет `render.yaml`

3. **Настройте переменные окружения:**
   - `INSTAGRAM_APP_ID`
   - `INSTAGRAM_APP_SECRET`
   - `WEBHOOK_VERIFY_TOKEN`

4. **Обновите Instagram App настройки:**
   - Redirect URI: `https://ваш-backend.onrender.com/auth/callback`
   - Webhook URL: `https://ваш-backend.onrender.com/webhook`

**Важно:** На бесплатном tier backend "засыпает" после 15 минут. Перед тестированием откройте `/health` endpoint чтобы "разбудить" сервер.

См. [RENDER_DEPLOY.md](RENDER_DEPLOY.md) для полных инструкций и troubleshooting.

## 📝 Заметки

- **Токены хранятся в памяти** - при перезапуске нужна повторная авторизация
- Для production добавьте БД (MongoDB/PostgreSQL)
- Токены Instagram имеют срок действия - добавьте refresh механизм
- Используйте environment variables для всех секретов
- Добавьте rate limiting для production

## 🐛 Troubleshooting

### Webhook не верифицируется
- Убедитесь что ngrok запущен и URL актуален
- Проверьте что WEBHOOK_VERIFY_TOKEN совпадает
- Проверьте логи backend

### OAuth ошибки
- Убедитесь что Redirect URI точно совпадает
- Проверьте что все permissions добавлены
- Instagram аккаунт должен быть Business/Creator

### Сообщения не приходят
- Проверьте подписку webhook на `messages`
- Убедитесь что отправляете с другого аккаунта
- Проверьте логи backend на ошибки

## 📚 Полезные ссылки

- [Instagram Messaging API Documentation](https://developers.facebook.com/docs/messenger-platform/instagram)
- [Facebook App Dashboard](https://developers.facebook.com/apps/)
- [ngrok Documentation](https://ngrok.com/docs)
- [Vue.js Guide](https://vuejs.org/guide/)

## 📄 Лицензия

MIT

## 👨‍💻 Автор

Создано как demo для изучения Instagram Messaging API

---

**Готово к запуску!** 🚀
