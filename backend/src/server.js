import express from 'express';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import webhookRoutes from './routes/webhook.js';

// Загружаем переменные окружения
dotenv.config();

const app = express();

// Render всегда использует числовой порт для Web Service
// Если PORT не число, используем дефолтный порт
let PORT = 3000;
if (process.env.PORT) {
  const parsedPort = parseInt(process.env.PORT, 10);
  if (!isNaN(parsedPort) && parsedPort > 0) {
    PORT = parsedPort;
  } else {
    console.warn('⚠️ PORT env var is not a valid number, using default 3000');
    console.warn('PORT value:', process.env.PORT);
  }
}

console.log('Final PORT:', PORT);

// Middleware
// Для webhook endpoint сохраняем raw body для проверки подписи
app.use('/webhook', express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString('utf8');
  }
}));

// Для остальных endpoints обычный JSON парсинг
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS для frontend
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:5173');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Логирование запросов
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/auth', authRoutes);
app.use('/webhook', webhookRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Главная страница
app.get('/', (req, res) => {
  res.json({
    name: 'Instagram Chatbot API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: {
        login: '/auth/login',
        callback: '/auth/callback',
        status: '/auth/status'
      },
      webhook: {
        verify: 'GET /webhook',
        receive: 'POST /webhook'
      }
    }
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Запуск сервера
const server = app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log(`🚀 Instagram Chatbot Backend running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Frontend: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  console.log('='.repeat(50));
  
  // Проверяем наличие необходимых переменных окружения
  const requiredEnvVars = [
    'INSTAGRAM_APP_ID',
    'INSTAGRAM_APP_SECRET',
    'WEBHOOK_VERIFY_TOKEN'
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.warn('⚠️  Warning: Missing environment variables:');
    missingVars.forEach(varName => console.warn(`   - ${varName}`));
    console.warn('   Please copy .env.example to .env and fill in the values');
  } else {
    console.log('✅ All required environment variables are set');
  }
});

// Обработка ошибок сервера
server.on('error', (error) => {
  console.error('Server error:', error);
  if (error.code === 'EACCES') {
    console.error('Permission denied. Check if PORT is correctly set.');
    console.error('PORT value:', process.env.PORT);
  }
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;
