<template>
  <div id="app">
    <div class="container">
      <header>
        <h1>🤖 Instagram Chatbot Demo</h1>
        <p class="subtitle">Echo bot для Instagram Direct Messages</p>
      </header>

      <main>
        <!-- Статус подключения -->
        <div v-if="loading" class="card">
          <div class="loading">
            <div class="spinner"></div>
            <p>Загрузка...</p>
          </div>
        </div>

        <!-- Ошибка -->
        <div v-else-if="error" class="card error-card">
          <h2>❌ Ошибка</h2>
          <p>{{ error }}</p>
          <button @click="resetState" class="btn btn-secondary">Попробовать снова</button>
        </div>

        <!-- Успешное подключение -->
        <div v-else-if="authenticated" class="card success-card">
          <h2>✅ Успешно подключено!</h2>
          <div class="info-group">
            <p><strong>Instagram Account ID:</strong></p>
            <code>{{ accountId }}</code>
          </div>
          <div class="status-badge">
            <span class="badge badge-success">● Бот активен</span>
          </div>
          <div class="instructions">
            <h3>Как протестировать:</h3>
            <ol>
              <li>Отправьте сообщение в директ вашему Instagram аккаунту</li>
              <li>Бот автоматически ответит тем же сообщением (echo)</li>
              <li>Проверьте логи в терминале backend для отладки</li>
            </ol>
          </div>
          <button @click="checkStatus" class="btn btn-secondary">Обновить статус</button>
        </div>

        <!-- Начальное состояние - нужна авторизация -->
        <div v-else class="card">
          <h2>Подключите Instagram</h2>
          <p>Для начала работы необходимо авторизоваться через Instagram</p>
          
          <div class="requirements">
            <h3>Требования:</h3>
            <ul>
              <li>✓ Instagram Business или Creator аккаунт</li>
              <li>✓ Аккаунт связан с Facebook Page</li>
              <li>✓ Facebook App настроен с необходимыми разрешениями</li>
            </ul>
          </div>

          <button @click="connectInstagram" class="btn btn-primary" :disabled="connecting">
            {{ connecting ? 'Подключение...' : '🔗 Подключить Instagram' }}
          </button>
        </div>

        <!-- Информация о настройке -->
        <div class="info-section">
          <h3>📋 Следующие шаги для настройки webhook:</h3>
          <ol>
            <li>
              <strong>Запустите ngrok:</strong>
              <pre><code>ngrok http 3000</code></pre>
            </li>
            <li>
              <strong>Скопируйте HTTPS URL</strong> (например: https://xxxx.ngrok.io)
            </li>
            <li>
              <strong>В Facebook App → Webhooks:</strong>
              <ul>
                <li>Callback URL: <code>https://xxxx.ngrok.io/webhook</code></li>
                <li>Verify Token: значение из вашего <code>.env</code> файла</li>
                <li>Подписка: <code>messages</code></li>
              </ul>
            </li>
          </ol>
        </div>
      </main>

      <footer>
        <p>Backend API: {{ apiUrl }}</p>
        <p class="version">v1.0.0 | Demo</p>
      </footer>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import axios from 'axios';

export default {
  name: 'App',
  setup() {
    const apiUrl = ref(import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000');
    const loading = ref(true);
    const connecting = ref(false);
    const authenticated = ref(false);
    const accountId = ref(null);
    const error = ref(null);

    // Проверка статуса авторизации
    const checkStatus = async () => {
      try {
        loading.value = true;
        error.value = null;
        
        const response = await axios.get(`${apiUrl.value}/auth/status`);
        authenticated.value = response.data.authenticated;
        accountId.value = response.data.accountId;
      } catch (err) {
        console.error('Error checking status:', err);
        error.value = 'Не удалось проверить статус подключения';
      } finally {
        loading.value = false;
      }
    };

    // Подключение к Instagram
    const connectInstagram = async () => {
      try {
        connecting.value = true;
        error.value = null;

        // Получаем URL для авторизации
        const response = await axios.get(`${apiUrl.value}/auth/login`);
        
        // Перенаправляем пользователя на Instagram OAuth
        window.location.href = response.data.authUrl;
      } catch (err) {
        console.error('Error connecting to Instagram:', err);
        error.value = 'Не удалось начать процесс авторизации';
        connecting.value = false;
      }
    };

    // Сброс состояния
    const resetState = () => {
      error.value = null;
      authenticated.value = false;
      accountId.value = null;
      checkStatus();
    };

    // Обработка callback после OAuth
    const handleOAuthCallback = () => {
      const params = new URLSearchParams(window.location.search);
      
      if (params.has('success')) {
        authenticated.value = true;
        accountId.value = params.get('accountId');
        
        // Очищаем URL от параметров
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (params.has('error')) {
        error.value = decodeURIComponent(params.get('error'));
        
        // Очищаем URL от параметров
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      
      loading.value = false;
    };

    // При загрузке компонента
    onMounted(() => {
      // Проверяем есть ли параметры OAuth callback
      if (window.location.search) {
        handleOAuthCallback();
      } else {
        checkStatus();
      }
    });

    return {
      apiUrl,
      loading,
      connecting,
      authenticated,
      accountId,
      error,
      checkStatus,
      connectInstagram,
      resetState
    };
  }
};
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

#app {
  width: 100%;
  max-width: 800px;
}

.container {
  background: white;
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 40px;
  text-align: center;
}

header h1 {
  font-size: 2.5em;
  margin-bottom: 10px;
}

.subtitle {
  font-size: 1.1em;
  opacity: 0.9;
}

main {
  padding: 40px;
}

.card {
  background: #f8f9fa;
  border-radius: 15px;
  padding: 30px;
  margin-bottom: 20px;
}

.card h2 {
  margin-bottom: 20px;
  color: #333;
}

.success-card {
  background: #d4edda;
  border: 2px solid #28a745;
}

.error-card {
  background: #f8d7da;
  border: 2px solid #dc3545;
}

.info-group {
  margin: 20px 0;
}

.info-group code {
  display: block;
  background: white;
  padding: 10px 15px;
  border-radius: 8px;
  font-family: 'Courier New', monospace;
  margin-top: 10px;
  word-break: break-all;
}

.status-badge {
  margin: 20px 0;
}

.badge {
  display: inline-block;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 0.9em;
  font-weight: 600;
}

.badge-success {
  background: #28a745;
  color: white;
}

.requirements ul,
.instructions ol {
  margin: 15px 0;
  padding-left: 25px;
}

.requirements li,
.instructions li {
  margin: 10px 0;
  line-height: 1.6;
}

.instructions {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 2px solid rgba(0, 0, 0, 0.1);
}

.btn {
  padding: 12px 30px;
  border: none;
  border-radius: 8px;
  font-size: 1em;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 20px;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background: #5a6268;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading {
  text-align: center;
  padding: 40px;
}

.spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  width: 50px;
  height: 50px;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.info-section {
  background: #fff3cd;
  border: 2px solid #ffc107;
  border-radius: 15px;
  padding: 25px;
  margin-top: 20px;
}

.info-section h3 {
  color: #856404;
  margin-bottom: 15px;
}

.info-section pre {
  background: #333;
  color: #0f0;
  padding: 15px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 10px 0;
}

.info-section code {
  background: rgba(0, 0, 0, 0.05);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
}

.info-section ul {
  list-style: none;
  padding-left: 0;
}

.info-section ul li {
  padding-left: 20px;
  position: relative;
}

.info-section ul li:before {
  content: "→";
  position: absolute;
  left: 0;
  color: #ffc107;
  font-weight: bold;
}

footer {
  background: #f8f9fa;
  padding: 20px;
  text-align: center;
  color: #6c757d;
  font-size: 0.9em;
}

.version {
  margin-top: 5px;
  font-size: 0.8em;
}
</style>
