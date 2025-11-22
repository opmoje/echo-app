#!/bin/bash

# Цвета для вывода
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Instagram Chatbot Demo - Quick Start        ║${NC}"
echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo ""

# Проверка Node.js
echo -e "${YELLOW}[1/5]${NC} Проверка Node.js..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js не установлен. Установите Node.js 18+ и попробуйте снова.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js установлен: $(node --version)${NC}"
echo ""

# Проверка npm
echo -e "${YELLOW}[2/5]${NC} Проверка npm..."
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm не установлен.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ npm установлен: $(npm --version)${NC}"
echo ""

# Проверка .env файла
echo -e "${YELLOW}[3/5]${NC} Проверка конфигурации..."
if [ ! -f "backend/.env" ]; then
    echo -e "${YELLOW}⚠️  Файл backend/.env не найден.${NC}"
    echo -e "${BLUE}Создаю из .env.example...${NC}"
    cp backend/.env.example backend/.env
    echo -e "${YELLOW}⚠️  ВАЖНО: Отредактируйте backend/.env и добавьте:${NC}"
    echo -e "   - INSTAGRAM_APP_ID"
    echo -e "   - INSTAGRAM_APP_SECRET"
    echo -e "   - WEBHOOK_VERIFY_TOKEN (любая случайная строка)"
    echo ""
    read -p "Нажмите Enter когда отредактируете .env файл..."
fi
echo -e "${GREEN}✅ Конфигурация найдена${NC}"
echo ""

# Установка зависимостей
echo -e "${YELLOW}[4/5]${NC} Установка зависимостей..."

if [ ! -d "backend/node_modules" ]; then
    echo -e "${BLUE}Устанавливаю backend зависимости...${NC}"
    cd backend && npm install && cd ..
    echo -e "${GREEN}✅ Backend зависимости установлены${NC}"
else
    echo -e "${GREEN}✅ Backend зависимости уже установлены${NC}"
fi

if [ ! -d "frontend/node_modules" ]; then
    echo -e "${BLUE}Устанавливаю frontend зависимости...${NC}"
    cd frontend && npm install && cd ..
    echo -e "${GREEN}✅ Frontend зависимости установлены${NC}"
else
    echo -e "${GREEN}✅ Frontend зависимости уже установлены${NC}"
fi
echo ""

# Проверка ngrok
echo -e "${YELLOW}[5/5]${NC} Проверка ngrok..."
if ! command -v ngrok &> /dev/null; then
    echo -e "${YELLOW}⚠️  ngrok не установлен${NC}"
    echo -e "${BLUE}Для установки выполните: brew install ngrok${NC}"
    echo -e "${BLUE}Или скачайте с: https://ngrok.com/download${NC}"
    echo ""
    read -p "Продолжить без ngrok? (y/n): " continue_without_ngrok
    if [[ $continue_without_ngrok != "y" ]]; then
        exit 1
    fi
    NGROK_AVAILABLE=false
else
    echo -e "${GREEN}✅ ngrok установлен${NC}"
    NGROK_AVAILABLE=true
fi
echo ""

echo -e "${GREEN}╔════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          Запуск приложения...                  ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════╝${NC}"
echo ""

# Создаем функцию для корректного завершения всех процессов
cleanup() {
    echo ""
    echo -e "${YELLOW}Остановка всех сервисов...${NC}"
    kill $(jobs -p) 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Запускаем backend
echo -e "${BLUE}🚀 Запуск Backend (http://localhost:3000)...${NC}"
cd backend && npm run dev &
BACKEND_PID=$!
cd ..

# Даем время backend запуститься
sleep 3

# Запускаем frontend
echo -e "${BLUE}🎨 Запуск Frontend (http://localhost:5173)...${NC}"
cd frontend && npm run dev &
FRONTEND_PID=$!
cd ..

# Даем время frontend запуститься
sleep 3

# Запускаем ngrok если доступен
if [ "$NGROK_AVAILABLE" = true ]; then
    echo -e "${BLUE}🌐 Запуск ngrok...${NC}"
    ngrok http 3000 &
    NGROK_PID=$!
    sleep 2
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║        Все сервисы запущены!                   ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📌 Frontend:${NC}  http://localhost:5173"
echo -e "${BLUE}📌 Backend:${NC}   http://localhost:3000"
if [ "$NGROK_AVAILABLE" = true ]; then
    echo -e "${BLUE}📌 ngrok:${NC}     Проверьте ngrok dashboard для HTTPS URL"
    echo -e "              http://localhost:4040"
fi
echo ""
echo -e "${YELLOW}📋 Следующие шаги:${NC}"
echo -e "1. Откройте http://localhost:5173 в браузере"
if [ "$NGROK_AVAILABLE" = true ]; then
    echo -e "2. Скопируйте HTTPS URL из ngrok dashboard (http://localhost:4040)"
    echo -e "3. Настройте webhook в Facebook App с этим URL"
fi
echo -e "4. Нажмите 'Подключить Instagram' на странице"
echo ""
echo -e "${RED}Нажмите Ctrl+C для остановки всех сервисов${NC}"
echo ""

# Ждем завершения
wait
