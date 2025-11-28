import express from 'express';
import crypto from 'crypto';
import instagramService from '../services/instagram.js';

const router = express.Router();

/**
 * GET /webhook
 * Верификация webhook от Instagram
 * Instagram отправляет GET запрос для подтверждения endpoint
 */
router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  console.log('Webhook verification request received');
  console.log('Mode:', mode);
  console.log('Token:', token);

  // Проверяем что это запрос на подписку и токен совпадает
  if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    console.log('Webhook verified successfully!');
    res.status(200).send(challenge);
  } else {
    console.error('Webhook verification failed');
    res.sendStatus(403);
  }
});

/**
 * POST /webhook
 * Получение сообщений от Instagram
 */
router.post('/', async (req, res) => {
  try {
    console.log('\n🔔 Webhook POST request received');
    console.log('📋 Headers:', JSON.stringify({
      'x-hub-signature': req.headers['x-hub-signature'],
      'x-hub-signature-256': req.headers['x-hub-signature-256'],
      'content-type': req.headers['content-type']
    }, null, 2));
    
    const signature = req.headers['x-hub-signature-256'];
    
    // Верификация подписи
    console.log('🔐 Verifying webhook signature...');
    console.log('📝 Received signature:', signature);
    
    // Проверяем наличие rawBody
    if (!req.rawBody) {
      console.error('❌ rawBody is missing! This means middleware is not configured correctly.');
      console.error('📄 Body type:', typeof req.body);
      console.error('📄 Body content:', JSON.stringify(req.body));
      return res.sendStatus(403);
    }
    
    console.log('📄 Raw body length:', req.rawBody.length);
    console.log('🔍 Raw body content:', req.rawBody);
    
    // Используем rawBodyBuffer (Buffer) для вычисления подписи
    // Facebook вычисляет HMAC на основе сырых байтов, не строки
    const bodyToVerify = req.rawBodyBuffer || req.rawBody;
    
    // ВАЖНО: Очищаем App Secret от возможных пробелов и переносов строк
    const appSecret = process.env.INSTAGRAM_APP_SECRET.trim();
    
    console.log('🔑 Using Buffer:', !!req.rawBodyBuffer);
    console.log('🔑 App Secret (trimmed) length:', appSecret.length);
    console.log('🔑 App Secret first/last chars:', `${appSecret[0]}...${appSecret[appSecret.length-1]}`);
    
    const hmac = crypto.createHmac('sha256', appSecret);
    hmac.update(bodyToVerify);
    const computedHash = hmac.digest('hex');
    const expectedSignature = 'sha256=' + computedHash;
    
    console.log('🔑 Computed hash:', computedHash);
    console.log('🔑 Expected signature:', expectedSignature);
    console.log('✅ Signatures match:', signature === expectedSignature);

    if (signature !== expectedSignature) {
      console.error('❌ Invalid signature!');
      console.error('🔧 Debug: App Secret length:', process.env.INSTAGRAM_APP_SECRET?.length || 0);
      console.error('🔧 Debug: App Secret first 4 chars:', process.env.INSTAGRAM_APP_SECRET?.substring(0, 4) || 'N/A');
      return res.sendStatus(403);
    }
    
    console.log('✅ Signature verified successfully!');

    console.log('📦 Webhook event received:', JSON.stringify(req.body, null, 2));

    // Обрабатываем вебхук асинхронно
    instagramService.handleWebhook(req.body).catch(error => {
      console.error('❌ Error processing webhook:', error);
    });

    // Быстро отвечаем Instagram что получили вебхук
    console.log('✅ Responding 200 OK to Instagram\n');
    res.sendStatus(200);
  } catch (error) {
    console.error('❌ Error handling webhook:', error);
    res.sendStatus(500);
  }
});

export default router;
