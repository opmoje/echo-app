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

  console.log('\n🔐 OAuth Callback received');
  console.log('📝 Code received:', code ? 'Yes' : 'No');
  console.log('❌ Error:', error || 'None');

  // Проверяем на ошибки от Instagram
  if (error) {
    console.error('❌ OAuth error from Instagram:', error, error_description);
    return res.redirect(`${process.env.FRONTEND_URL}?error=${encodeURIComponent(error_description || error)}`);
  }

  if (!code) {
    console.error('❌ No authorization code received');
    return res.redirect(`${process.env.FRONTEND_URL}?error=${encodeURIComponent('No authorization code received')}`);
  }

  try {
    console.log('🔄 Exchanging code for access token...');
    
    // Обмениваем code на access token
    const credentials = await instagramService.exchangeCodeForToken(
      code,
      process.env.INSTAGRAM_APP_ID,
      process.env.INSTAGRAM_APP_SECRET,
      process.env.INSTAGRAM_REDIRECT_URI
    );

    console.log('\n✅ Successfully authenticated!');
    console.log('🔑 Access Token obtained');
    console.log('📱 Instagram Account ID:', credentials.instagramAccountId);

    // Редиректим на frontend с успешным результатом
    res.redirect(`${process.env.FRONTEND_URL}?success=true&accountId=${credentials.instagramAccountId}`);
  } catch (error) {
    console.error('\n❌ Error during token exchange:', error);
    
    let errorMessage = 'Authentication failed';
    
    // Определяем более понятное сообщение об ошибке
    if (error.message.includes('No Facebook Pages found')) {
      errorMessage = 'No Facebook Pages found. Please:\n1. Create a Facebook Page\n2. Link it to your Instagram Business account\n3. Try authorizing again';
    } else if (error.message.includes('No Instagram Business Account')) {
      errorMessage = 'Instagram account not linked to Facebook Page. Please:\n1. Convert to Business/Creator account\n2. Link to Facebook Page in Instagram settings\n3. Try authorizing again';
    } else if (error.response?.data?.error?.message) {
      errorMessage = error.response.data.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    console.error('📤 Redirecting to frontend with error:', errorMessage);
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
