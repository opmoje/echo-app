# 🐳 Деплой Instagram Chatbot в Docker Swarm

Подробная инструкция по развертыванию приложения в Docker Swarm с использованием Nginx Proxy Manager.

## 📋 Предварительные требования

- Docker Engine 20.10+
- Docker Swarm инициализирован (`docker swarm init`)
- Nginx Proxy Manager установлен и настроен
- Домен `instabot.wbcheap.ru` с DNS записями, указывающими на ваш сервер
- SSL сертификаты (Let's Encrypt через NPM)

## 🏗️ Архитектура

```
Internet
    |
    | (HTTPS)
    ▼
┌─────────────────────────┐
│  Nginx Proxy Manager    │
│  Port: 80, 443          │
└────────┬────────────────┘
         │
         │ shared-network
         │
    ┌────┴────────────────┐
    │                     │
    ▼                     ▼
┌─────────────┐     ┌─────────────┐
│  Frontend   │     │  Backend    │
│  (Nginx)    │     │  (Node.js)  │
│  :80        │     │  :3000      │
└─────────────┘     └─────────────┘
```

## 🚀 Шаг 1: Подготовка сервера

### 1.1 Создание внешней сети

Создайте overlay сеть для связи с Nginx Proxy Manager:

```bash
docker network create \
  --driver overlay \
  --attachable \
  shared-network
```

Проверьте, что сеть создана:

```bash
docker network ls | grep shared-network
```

### 1.2 Клонирование репозитория

```bash
cd /opt
git clone https://github.com/yourusername/instaai.git
cd instaai
```

## 🔧 Шаг 2: Настройка переменных окружения

### 2.1 Создание файла .env

Создайте файл `.env` в корне проекта:

```bash
nano .env
```

Добавьте следующие переменные:

```env
# Docker Registry (опционально, если используете приватный registry)
DOCKER_REGISTRY=

# Версия образов
VERSION=latest

# Instagram App Configuration
INSTAGRAM_APP_ID=your_facebook_app_id
INSTAGRAM_APP_SECRET=your_facebook_app_secret

# Webhook Configuration
WEBHOOK_VERIFY_TOKEN=your_random_secure_token_here
```

### 2.2 Генерация безопасного токена

Для `WEBHOOK_VERIFY_TOKEN` используйте:

```bash
openssl rand -hex 32
```

## 🏗️ Шаг 3: Сборка образов

### 3.1 Сборка локально

```bash
# Сборка backend
docker build -t instabot-backend:latest ./backend

# Сборка frontend с правильным API URL
docker build \
  --build-arg VITE_BACKEND_URL=https://api.instabot.wbcheap.ru \
  -t instabot-frontend:latest \
  ./frontend
```

### 3.2 Проверка образов

```bash
docker images | grep instabot
```

Вы должны увидеть:
```
instabot-backend    latest    ...    ...    ...
instabot-frontend   latest    ...    ...    ...
```

## 📦 Шаг 4: Деплой в Docker Swarm

### 4.1 Деплой стека

```bash
docker stack deploy -c docker-stack.yml instabot
```

### 4.2 Проверка статуса

```bash
# Список сервисов
docker stack services instabot

# Логи backend
docker service logs -f instabot_backend

# Логи frontend
docker service logs -f instabot_frontend
```

### 4.3 Проверка контейнеров

```bash
# Список всех контейнеров стека
docker stack ps instabot

# Подробная информация о сервисе
docker service inspect instabot_backend --pretty
```

## 🌐 Шаг 5: Настройка Nginx Proxy Manager

### 5.1 Добавление Backend (api.instabot.wbcheap.ru)

1. Откройте NPM UI (обычно `http://your-server:81`)
2. Перейдите в **Proxy Hosts** → **Add Proxy Host**
3. Заполните поля:

**Details Tab:**
- Domain Names: `api.instabot.wbcheap.ru`
- Scheme: `http`
- Forward Hostname/IP: `instabot_backend` (имя сервиса в Docker)
- Forward Port: `3000`
- ✅ Cache Assets
- ✅ Block Common Exploits
- ✅ Websockets Support

**SSL Tab:**
- ✅ SSL Certificate: Request a new SSL Certificate
- ✅ Force SSL
- ✅ HTTP/2 Support
- ✅ HSTS Enabled
- Email: ваш email для Let's Encrypt
- ✅ I Agree to the Let's Encrypt Terms of Service

4. Нажмите **Save**

### 5.2 Добавление Frontend (instabot.wbcheap.ru)

Повторите процесс для frontend:

**Details Tab:**
- Domain Names: `instabot.wbcheap.ru`
- Scheme: `http`
- Forward Hostname/IP: `instabot_frontend`
- Forward Port: `80`
- ✅ Cache Assets
- ✅ Block Common Exploits
- ✅ Websockets Support

**SSL Tab:**
- Такие же настройки SSL как для backend

### 5.3 Проверка настроек NPM

Убедитесь что NPM подключен к сети `shared-network`:

```bash
# Проверка сетей NPM контейнера
docker inspect <npm_container_id> | grep -A 20 Networks
```

Если NPM не в сети `shared-network`, подключите его:

```bash
docker network connect shared-network <npm_container_name>
```

## 🧪 Шаг 6: Тестирование

### 6.1 Проверка доступности

```bash
# Backend health check
curl https://api.instabot.wbcheap.ru/health

# Frontend health check
curl https://instabot.wbcheap.ru/health
```

### 6.2 Проверка API

```bash
# Информация о API
curl https://api.instabot.wbcheap.ru/

# Статус авторизации
curl https://api.instabot.wbcheap.ru/auth/status
```

### 6.3 Проверка в браузере

1. Откройте `https://instabot.wbcheap.ru`
2. Нажмите "Подключить Instagram"
3. Пройдите процесс OAuth авторизации

## 🔄 Шаг 7: Настройка Instagram App

### 7.1 Обновление OAuth Redirect URI

В Facebook App Dashboard:

1. Settings → Basic
2. Instagram → Basic Display
3. Valid OAuth Redirect URIs:
   ```
   https://api.instabot.wbcheap.ru/auth/callback
   ```

### 7.2 Настройка Webhook

1. Products → Webhooks → Instagram
2. Edit Subscription:
   - **Callback URL:** `https://api.instabot.wbcheap.ru/webhook`
   - **Verify Token:** значение из `.env` (`WEBHOOK_VERIFY_TOKEN`)
   - **Fields:** ✅ messages

3. Нажмите **Verify and Save**

## 🔄 Обновление приложения

### Метод 1: Пересборка и обновление

```bash
# Пересоберите образы
docker build -t instabot-backend:latest ./backend
docker build --build-arg VITE_BACKEND_URL=https://api.instabot.wbcheap.ru \
  -t instabot-frontend:latest ./frontend

# Обновите стек
docker stack deploy -c docker-stack.yml instabot
```

Docker Swarm автоматически выполнит rolling update.

### Метод 2: Принудительное обновление сервиса

```bash
# Обновить только backend
docker service update --force instabot_backend

# Обновить только frontend
docker service update --force instabot_frontend
```

### Мониторинг обновления

```bash
# Следить за процессом обновления
docker service ps instabot_backend --no-trunc

# Логи во время обновления
docker service logs -f instabot_backend
```

## 📊 Масштабирование

### Увеличение реплик

```bash
# Масштабировать backend до 5 реплик
docker service scale instabot_backend=5

# Масштабировать frontend до 3 реплик
docker service scale instabot_frontend=3
```

### Изменение в файле

Отредактируйте `docker-stack.yml` и измените значение `replicas`:

```yaml
deploy:
  replicas: 5  # Было 2
```

Затем обновите:

```bash
docker stack deploy -c docker-stack.yml instabot
```

## 🐛 Troubleshooting

### Проблема: Сервисы не запускаются

```bash
# Проверить статус сервисов
docker service ls

# Посмотреть ошибки
docker service ps instabot_backend --no-trunc
docker service logs instabot_backend
```

### Проблема: NPM не видит сервисы

```bash
# Проверить, что сервисы в правильной сети
docker service inspect instabot_backend | grep -A 5 Networks

# Убедиться что NPM в той же сети
docker network inspect shared-network
```

### Проблема: SSL сертификат не генерируется

1. Убедитесь что порты 80 и 443 открыты
2. Проверьте DNS записи домена
3. Посмотрите логи NPM

### Проблема: Webhook не работает

```bash
# Проверить логи backend
docker service logs -f instabot_backend | grep webhook

# Тест webhook вручную
curl -X POST https://api.instabot.wbcheap.ru/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

### Проблема: Frontend не может достучаться до Backend

1. Проверьте что frontend собран с правильным `VITE_BACKEND_URL`
2. Проверьте CORS настройки в backend
3. Посмотрите Network tab в браузере (F12)

## 🔒 Безопасность

### Рекомендации для продакшена

1. **Используйте Docker Secrets для чувствительных данных:**

```bash
# Создать secret для App Secret
echo "your_app_secret" | docker secret create instagram_app_secret -

# Использовать в docker-stack.yml
secrets:
  - instagram_app_secret
```

2. **Ограничьте ресурсы:**

```yaml
deploy:
  resources:
    limits:
      cpus: '0.50'
      memory: 512M
    reservations:
      cpus: '0.25'
      memory: 256M
```

3. **Используйте read-only root filesystem:**

```yaml
read_only: true
tmpfs:
  - /tmp
```

## 📝 Полезные команды

```bash
# Удалить стек
docker stack rm instabot

# Просмотр всех сервисов
docker service ls

# Масштабирование
docker service scale instabot_backend=3

# Логи реального времени
docker service logs -f instabot_backend

# Инспекция сервиса
docker service inspect instabot_backend --pretty

# Список контейнеров стека
docker stack ps instabot

# Принудительное обновление
docker service update --force instabot_backend
```

## 📚 Дополнительные ресурсы

- [Docker Swarm Documentation](https://docs.docker.com/engine/swarm/)
- [Nginx Proxy Manager Documentation](https://nginxproxymanager.com/guide/)
- [Instagram Messaging API](https://developers.facebook.com/docs/messenger-platform/instagram)

## 🎯 Итоговый чеклист

- [ ] Docker Swarm инициализирован
- [ ] Сеть `shared-network` создана
- [ ] NPM установлен и настроен
- [ ] DNS записи настроены для обоих доменов
- [ ] Файл `.env` создан с корректными переменными
- [ ] Образы успешно собраны
- [ ] Стек задеплоен: `docker stack deploy`
- [ ] Proxy Hosts настроены в NPM
- [ ] SSL сертификаты получены
- [ ] Instagram App настроен с новыми URL
- [ ] Webhook верифицирован
- [ ] Приложение работает и отвечает на сообщения

---

**Готово к продакшену!** 🚀
