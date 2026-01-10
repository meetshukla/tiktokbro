import { Router, Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { User } from '../models/user.model';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const JWT_SECRET = process.env.JWT_SECRET;
const NODE_ENV = process.env.NODE_ENV || 'development';

const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// 7 days in milliseconds
const TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;
const TOKEN_EXPIRY_S = '7d';

/**
 * POST /auth/google/verify
 * Verify Google ID token and create/update user
 */
router.post('/google/verify', async (req: Request, res: Response): Promise<void> => {
  try {
    const { credential } = req.body;

    if (!credential) {
      res.status(400).json({ success: false, error: 'Missing credential' });
      return;
    }

    if (!GOOGLE_CLIENT_ID) {
      res.status(500).json({ success: false, error: 'Google Client ID not configured' });
      return;
    }

    if (!JWT_SECRET) {
      res.status(500).json({ success: false, error: 'JWT Secret not configured' });
      return;
    }

    // Verify Google ID token
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      res.status(400).json({ success: false, error: 'Invalid Google token' });
      return;
    }

    const { sub: googleId, email, name, picture } = payload;

    if (!googleId || !email || !name) {
      res.status(400).json({ success: false, error: 'Missing user information from Google' });
      return;
    }

    // Upsert user in MongoDB
    const user = await User.findOneAndUpdate(
      { googleId },
      { email, name, picture },
      { upsert: true, new: true }
    );

    // Create JWT
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
        name: user.name,
        picture: user.picture,
      },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY_S }
    );

    // Set httpOnly cookie
    res.cookie('access_token', token, {
      httpOnly: true,
      secure: NODE_ENV === 'production',
      sameSite: NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: TOKEN_EXPIRY_MS,
      path: '/',
    });

    res.json({
      success: true,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        picture: user.picture,
      },
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(500).json({ success: false, error: 'Authentication failed' });
  }
});

/**
 * GET /auth/me
 * Get current authenticated user
 */
router.get('/me', requireAuth, (req: Request, res: Response): void => {
  res.json({
    success: true,
    user: req.user,
  });
});

/**
 * POST /auth/logout
 * Clear the auth cookie
 */
router.post('/logout', (_req: Request, res: Response): void => {
  res.cookie('access_token', '', {
    httpOnly: true,
    secure: NODE_ENV === 'production',
    sameSite: NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 0,
    path: '/',
  });

  res.json({ success: true });
});

export default router;
