import axios from 'axios';

class InstagramService {
  constructor() {
    this.baseURL = 'https://graph.instagram.com';
    this.graphBaseURL = 'https://graph.facebook.com/v18.0';
    this.accessToken = null;
    this.instagramAccountId = null;
  }

  /**
   * Получение URL для OAuth авторизации
   */
  getAuthorizationURL(appId, redirectUri) {
    const scopes = [
      'instagram_basic',
      'instagram_manage_messages',
      'pages_manage_metadata',
      'pages_messaging'
    ].join(',');

    return `https://www.facebook.com/v18.0/dialog/oauth?` +
      `client_id=${appId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent(scopes)}` +
      `&response_type=code`;
  }

  /**
   * Обмен authorization code на access token
   */
  async exchangeCodeForToken(code, appId, appSecret, redirectUri) {
    try {
      const response = await axios.get(`${this.graphBaseURL}/oauth/access_token`, {
        params: {
          client_id: appId,
          client_secret: appSecret,
          redirect_uri: redirectUri,
          code: code
        }
      });

      this.accessToken = response.data.access_token;
      
      // Получаем Instagram Business Account ID
      await this.getInstagramAccountId();
      
      return {
        accessToken: this.accessToken,
        instagramAccountId: this.instagramAccountId
      };
    } catch (error) {
      console.error('Error exchanging code for token:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Получение Instagram Business Account ID из connected pages
   */
  async getInstagramAccountId() {
    try {
      // Получаем список Facebook Pages
      const pagesResponse = await axios.get(`${this.graphBaseURL}/me/accounts`, {
        params: {
          access_token: this.accessToken
        }
      });

      if (!pagesResponse.data.data || pagesResponse.data.data.length === 0) {
        throw new Error('No Facebook Pages found. Please connect your Instagram account to a Facebook Page.');
      }

      // Берем первую страницу и получаем связанный Instagram аккаунт
      const pageId = pagesResponse.data.data[0].id;
      const pageAccessToken = pagesResponse.data.data[0].access_token;
      
      const igResponse = await axios.get(`${this.graphBaseURL}/${pageId}`, {
        params: {
          fields: 'instagram_business_account',
          access_token: pageAccessToken
        }
      });

      if (!igResponse.data.instagram_business_account) {
        throw new Error('No Instagram Business Account linked to this Facebook Page.');
      }

      this.instagramAccountId = igResponse.data.instagram_business_account.id;
      // Сохраняем page access token для будущих запросов
      this.accessToken = pageAccessToken;
      
      return this.instagramAccountId;
    } catch (error) {
      console.error('Error getting Instagram account ID:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Установка токена и account ID (для использования после перезапуска)
   */
  setCredentials(accessToken, instagramAccountId) {
    this.accessToken = accessToken;
    this.instagramAccountId = instagramAccountId;
  }

  /**
   * Отправка сообщения в Instagram Direct
   */
  async sendMessage(recipientId, message) {
    try {
      const response = await axios.post(
        `${this.graphBaseURL}/me/messages`,
        {
          recipient: { id: recipientId },
          message: { text: message }
        },
        {
          params: {
            access_token: this.accessToken
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error sending message:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Обработка входящего вебхука от Instagram
   */
  async handleWebhook(data) {
    try {
      // Проверяем что это сообщение от Instagram
      if (data.object !== 'instagram') {
        return;
      }

      for (const entry of data.entry) {
        for (const messaging of entry.messaging || []) {
          // Обрабатываем только входящие сообщения
          if (messaging.message && !messaging.message.is_echo) {
            const senderId = messaging.sender.id;
            const messageText = messaging.message.text;

            console.log(`Received message from ${senderId}: ${messageText}`);

            // Echo функция - отправляем сообщение обратно
            await this.sendMessage(senderId, messageText);
            
            console.log(`Echoed message back to ${senderId}`);
          }
        }
      }
    } catch (error) {
      console.error('Error handling webhook:', error);
      throw error;
    }
  }
}

export default new InstagramService();
