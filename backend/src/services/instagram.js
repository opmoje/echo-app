import axios from 'axios';

class InstagramService {
  constructor() {
    this.baseURL = 'https://graph.instagram.com';
    this.graphBaseURL = 'https://graph.facebook.com/v24.0';
    this.accessToken = null;
    this.instagramAccountId = null;
  }

  /**
   * Получение URL для OAuth авторизации
   */
  getAuthorizationURL(appId, redirectUri) {
    const scopes = [
      'pages_manage_metadata',
      'instagram_basic',
      'instagram_manage_messages',
      'pages_show_list',          // Нужен для получения списка Pages
      'pages_read_engagement',    // Нужен для получения данных о взаимодействии с постами
    ].join(',');

    return `https://www.facebook.com/v24.0/dialog/oauth?` +
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
      console.log('\n🔍 Starting Instagram Account ID lookup...');
      console.log('📝 User Access Token:', this.accessToken ? `${this.accessToken.substring(0, 20)}...` : 'null');
      
      // Получаем список Facebook Pages
      console.log('📡 Requesting Facebook Pages from /me/accounts...');
      const pagesResponse = await axios.get(`${this.graphBaseURL}/me/accounts`, {
        params: {
          access_token: this.accessToken
        }
      });

      console.log('📄 Pages API Response:', JSON.stringify(pagesResponse.data, null, 2));
      console.log('📊 Number of pages found:', pagesResponse.data.data?.length || 0);

      if (!pagesResponse.data.data || pagesResponse.data.data.length === 0) {
        console.error('❌ No Facebook Pages found!');
        console.error('💡 Troubleshooting steps:');
        console.error('   1. Verify you have a Facebook Page created');
        console.error('   2. Check that your Instagram Business account is linked to this Page');
        console.error('   3. Ensure you granted "pages_show_list" permission during OAuth');
        console.error('   4. Try re-authorizing with the updated scopes');
        throw new Error('No Facebook Pages found. Please connect your Instagram account to a Facebook Page.');
      }

      // Берем первую страницу и получаем связанный Instagram аккаунт
      const pageId = pagesResponse.data.data[0].id;
      const pageName = pagesResponse.data.data[0].name;
      const pageAccessToken = pagesResponse.data.data[0].access_token;
      
      console.log(`✅ Found Facebook Page: "${pageName}" (ID: ${pageId})`);
      console.log('📡 Requesting Instagram Business Account for this page...');
      
      const igResponse = await axios.get(`${this.graphBaseURL}/${pageId}`, {
        params: {
          fields: 'instagram_business_account',
          access_token: pageAccessToken
        }
      });

      console.log('📄 Instagram Account Response:', JSON.stringify(igResponse.data, null, 2));

      if (!igResponse.data.instagram_business_account) {
        console.error('❌ No Instagram Business Account linked to this Facebook Page!');
        console.error('💡 Troubleshooting steps:');
        console.error('   1. Go to your Instagram app settings');
        console.error('   2. Switch to Professional Account (Business or Creator)');
        console.error('   3. Link it to your Facebook Page');
        console.error(`   4. Facebook Page: "${pageName}"`);
        throw new Error('No Instagram Business Account linked to this Facebook Page.');
      }

      this.instagramAccountId = igResponse.data.instagram_business_account.id;
      // Сохраняем page access token для будущих запросов
      this.accessToken = pageAccessToken;
      
      console.log(`✅ Successfully found Instagram Business Account ID: ${this.instagramAccountId}`);
      console.log('🎉 OAuth flow completed successfully!\n');
      
      return this.instagramAccountId;
    } catch (error) {
      console.error('\n❌ Error getting Instagram account ID:', error.response?.data || error.message);
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
      const typingResponse = await axios.post(
        `${this.graphBaseURL}/me/messages`,
        {
          recipient: { id: recipientId },
          "sender_action":"typing_on"
        },
        {
          params: {
            access_token: this.accessToken
          }
        }
      );
      console.log('📄 Typing Response:', JSON.stringify(typingResponse.data, null, 2));

      await new Promise(resolve => setTimeout(resolve, 2000));

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
      console.log('\n📨 Processing webhook data...');
      
      // Проверяем что это сообщение от Instagram
      if (data.object !== 'instagram') {
        console.log('⏭️  Not an Instagram object, skipping');
        return;
      }

      for (const entry of data.entry) {
        console.log('\n📋 Processing entry:', JSON.stringify({
          id: entry.id,
          time: entry.time,
          messagingCount: entry.messaging?.length || 0
        }, null, 2));

        for (const messaging of entry.messaging || []) {
          console.log('\n🔍 Analyzing messaging event:', JSON.stringify(messaging, null, 2));
          
          // Определяем тип события
          const eventType = this.getEventType(messaging);
          console.log('📍 Event type:', eventType);
          
          // Извлекаем sender ID (может быть в разных местах)
          const senderId = this.extractSenderId(messaging, entry);
          console.log('👤 Sender ID:', senderId || 'NOT FOUND');
          
          // Если нет sender ID, пропускаем
          if (!senderId) {
            console.warn('⚠️  Cannot process event without sender ID');
            continue;
          }

          // Обрабатываем разные типы событий
          switch (eventType) {
            case 'message':
              await this.handleMessageEvent(messaging, senderId);
              break;
            case 'message_edit':
              await this.handleMessageEditEvent(messaging, senderId);
              break;
            case 'postback':
              console.log('📬 Postback event detected (not implemented yet)');
              break;
            case 'reaction':
              console.log('❤️  Reaction event detected (not implemented yet)');
              break;
            default:
              console.log(`⏭️  Unknown event type: ${eventType}`);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error handling webhook:', error);
      throw error;
    }
  }

  /**
   * Определяет тип события webhook
   */
  getEventType(messaging) {
    if (messaging.message) return 'message';
    if (messaging.message_edit) return 'message_edit';
    if (messaging.postback) return 'postback';
    if (messaging.reaction) return 'reaction';
    return 'unknown';
  }

  /**
   * Извлекает sender ID из разных мест в webhook
   */
  extractSenderId(messaging, entry) {
    // Стандартное место
    if (messaging.sender?.id) {
      return messaging.sender.id;
    }
    
    // Альтернативные места (на случай, если структура отличается)
    if (messaging.from?.id) {
      return messaging.from.id;
    }
    
    // Для некоторых событий sender может быть в entry.id
    // Но это Instagram Business Account ID, не user ID
    // Поэтому не используем entry.id как sender
    
    return null;
  }

  /**
   * Обработка обычного сообщения
   */
  async handleMessageEvent(messaging, senderId) {
    try {
      // Пропускаем echo сообщения (наши собственные)
      if (messaging.message.is_echo) {
        console.log('↩️  Echo message, skipping');
        return;
      }

      const messageText = messaging.message.text;
      console.log(`\n💬 Received message from ${senderId}: "${messageText}"`);

      if (!this.accessToken) {
        console.error('❌ No access token available, cannot send reply');
        return;
      }

      // Echo функция - отправляем сообщение обратно
      console.log(`📤 Sending echo reply to ${senderId}...`);
      await this.sendMessage(senderId, messageText);
      console.log(`✅ Successfully sent echo to ${senderId}`);
    } catch (error) {
      console.error('❌ Error handling message event:', error);
    }
  }

  /**
   * Обработка редактирования сообщения
   */
  async handleMessageEditEvent(messaging, senderId) {
    try {
      const editData = messaging.message_edit;
      console.log(`\n✏️  Message edit event from ${senderId}:`, JSON.stringify(editData, null, 2));
      
      // num_edit: 0 означает, что это первая версия сообщения
      // Это странное поведение Instagram API - иногда обычные сообщения приходят как message_edit
      if (editData.num_edit === 0) {
        console.log('⚠️  num_edit is 0 - this might be a regular message sent as edit event');
        console.log('💡 This is a known Instagram API quirk');
      }
      
      // Мы не отвечаем на события редактирования
      console.log('⏭️  Message edit events are not processed (no reply sent)');
    } catch (error) {
      console.error('❌ Error handling message edit event:', error);
    }
  }
}

export default new InstagramService();
