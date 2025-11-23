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
    if (signature && process.env.INSTAGRAM_APP_SECRET) {
      console.log('🔐 Verifying webhook signature...');
      console.log('📝 Received signature:', signature);
      
      // Используем raw body для проверки подписи!
      const expectedSignature = 'sha256=' + crypto
        .createHmac('sha256', process.env.INSTAGRAM_APP_SECRET)
        .update(req.rawBody || JSON.stringify(req.body))
        .digest('hex');
      
      console.log('🔑 Expected signature:', expectedSignature);
      console.log('✅ Signatures match:', signature === expectedSignature);

      if (signature !== expectedSignature) {
        console.error('❌ Invalid signature!');
        console.error('📄 Raw body length:', req.rawBody?.length || 'N/A');
        console.error('🔍 First 100 chars of raw body:', req.rawBody?.substring(0, 100) || 'N/A');
        return res.sendStatus(403);
      }
      
      console.log('✅ Signature verified successfully!');
    } else {
      console.warn('⚠️  No signature verification (missing signature or app secret)');
    }

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
