import { Router, Request, Response } from 'express';
import passport from '../auth/passport';
import { generateToken } from '../auth/jwt';
import { authenticateJWT, AuthRequest } from '../auth/middleware';

const router = Router();

router.get('/twitter', (req: Request, res: Response, next) => {
  passport.authenticate('twitter', (err: any, user: any, info: any) => {
    if (err) {
      console.error('Twitter OAuth error details:', {
        error: err.message,
        data: err.data,
        statusCode: err.statusCode,
      });
      return res.status(500).json({
        error: 'Twitter authentication failed',
        message: err.message,
        details: err.data || 'Check server logs for more details'
      });
    }
    next();
  })(req, res, next);
});

router.get(
  '/twitter/callback',
  passport.authenticate('twitter', {
    session: false,
    failureRedirect: '/login-failed'
  }),
  (req: Request, res: Response) => {
    const user = req.user as any;

    if (!user) {
      return res.redirect('/login-failed');
    }

    const token = generateToken({
      userId: user.id,
      twitterId: user.twitterId,
      twitterUsername: user.twitterUsername,
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
  }
);

router.get('/me', authenticateJWT, (req: AuthRequest, res: Response) => {
  const user = req.user;

  res.json({
    id: user.id,
    email: user.email,
    twitterId: user.twitterId,
    twitterUsername: user.twitterUsername,
    twitterDisplayName: user.twitterDisplayName,
    twitterProfileImage: user.twitterProfileImage,
    subscriptionTier: user.subscriptionTier,
    voicePreference: user.voicePreference,
    createdAt: user.createdAt,
  });
});

router.post('/logout', authenticateJWT, (req: AuthRequest, res: Response) => {
  res.json({ message: 'Logged out successfully' });
});

router.get('/status', (req: Request, res: Response) => {
  const hasTwitterCredentials = !!(
    process.env.TWITTER_CLIENT_ID && process.env.TWITTER_CLIENT_SECRET
  );

  res.json({
    configured: hasTwitterCredentials,
    loginUrl: hasTwitterCredentials ? '/api/auth/twitter' : null,
  });
});

router.get('/debug', (req: Request, res: Response) => {
  const clientId = process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;

  res.json({
    hasClientId: !!clientId,
    hasClientSecret: !!clientSecret,
    clientIdLength: clientId?.length || 0,
    clientSecretLength: clientSecret?.length || 0,
    clientIdPreview: clientId ? clientId.substring(0, 10) + '...' : 'NOT SET',
    clientSecretPreview: clientSecret ? clientSecret.substring(0, 10) + '...' : 'NOT SET',
    callbackUrl: process.env.TWITTER_CALLBACK_URL,
  });
});

export default router;
