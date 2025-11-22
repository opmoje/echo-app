import express from 'express';
import instagramService from '../services/instagram.js';

const router = express.Router();

/**
 * GET /auth/login
 * Инициирует OAuth flow, перенаправляет пользователя на Instagram
 */
router.get('/login', (req, res) => {
  try {
    const authUrl = instagramService.getAuthorizationURL(
      process.env.INSTAGRAM_APP_ID,
      process.env.INSTAGRAM_REDIRECT_URI
    );

    res.json({ authUrl });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({ error: 'Failed to generate authorization URL' });
  }
});

/**
 * GET /auth/callback
 * Обрабатывает callback от Instagram OAuth
 */
router.get('/callback', async (req, res) => {
  const { code, error, error_description } = req.query;

  // Проверяем на ошибки от Instagram
  if (error) {
    console.error('OAuth error:', error, error_description);
    return res.redirect(`${process.env.FRONTEND_URL}?error=${encodeURIComponent(error_description || error)}`);
  }

  if (!code) {
    return res.redirect(`${process.env.FRONTEND_URL}?error=${encodeURIComponent('No authorization code received')}`);
  }

  try {
    // Обмениваем code на access token
    const credentials = await instagramService.exchangeCodeForToken(
      code,
      process.env.INSTAGRAM_APP_ID,
      process.env.INSTAGRAM_APP_SECRET,
      process.env.INSTAGRAM_REDIRECT_URI
    );

    console.log('Successfully authenticated!');
    console.log('Access Token:', credentials.accessToken);
    console.log('Instagram Account ID:', credentials.instagramAccountId);

    // Редиректим на frontend с успешным результатом
    res.redirect(`${process.env.FRONTEND_URL}?success=true&accountId=${credentials.instagramAccountId}`);
  } catch (error) {
    console.error('Error during token exchange:', error);
    const errorMessage = error.response?.data?.error?.message || error.message || 'Authentication failed';
    res.redirect(`${process.env.FRONTEND_URL}?error=${encodeURIComponent(errorMessage)}`);
  }
});

/**
 * GET /auth/status
 * Проверка статуса авторизации
 */
router.get('/status', (req, res) => {
  const isAuthenticated = !!(instagramService.accessToken && instagramService.instagramAccountId);
  
  res.json({
    authenticated: isAuthenticated,
    accountId: instagramService.instagramAccountId || null
  });
});

export default router;
