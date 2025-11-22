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
    const signature = req.headers['x-hub-signature-256'];
    
    // Верификация подписи (опционально, но рекомендуется для production)
    if (signature && process.env.INSTAGRAM_APP_SECRET) {
      const expectedSignature = 'sha256=' + crypto
        .createHmac('sha256', process.env.INSTAGRAM_APP_SECRET)
        .update(JSON.stringify(req.body))
        .digest('hex');

      if (signature !== expectedSignature) {
        console.error('Invalid signature');
        return res.sendStatus(403);
      }
    }

    console.log('Webhook event received:', JSON.stringify(req.body, null, 2));

    // Обрабатываем вебхук асинхронно
    instagramService.handleWebhook(req.body).catch(error => {
      console.error('Error processing webhook:', error);
    });

    // Быстро отвечаем Instagram что получили вебхук
    res.sendStatus(200);
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.sendStatus(500);
  }
});

export default router;
