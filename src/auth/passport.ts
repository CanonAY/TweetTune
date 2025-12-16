import passport from 'passport';
import { Strategy as TwitterStrategy } from '@superfaceai/passport-twitter-oauth2';
import { db } from '../db/connection';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';
import * as dotenv from 'dotenv';

dotenv.config();

const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID || 'placeholder_id';
const TWITTER_CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET || 'placeholder_secret';
const TWITTER_CALLBACK_URL = process.env.TWITTER_CALLBACK_URL || 'http://localhost:3000/api/auth/twitter/callback';

const hasCredentials = process.env.TWITTER_CLIENT_ID && process.env.TWITTER_CLIENT_SECRET;

if (!hasCredentials) {
  console.warn('Warning: Twitter OAuth 2.0 credentials not configured - auth will not work');
} else {
  console.log('Twitter OAuth 2.0 credentials detected:');
  console.log(`  Client ID: ${TWITTER_CLIENT_ID.substring(0, 10)}... (length: ${TWITTER_CLIENT_ID.length})`);
  console.log(`  Client Secret: ${TWITTER_CLIENT_SECRET.substring(0, 10)}... (length: ${TWITTER_CLIENT_SECRET.length})`);
  console.log(`  Callback URL: ${TWITTER_CALLBACK_URL}`);
}

passport.use(
  new TwitterStrategy(
    {
      clientID: TWITTER_CLIENT_ID,
      clientSecret: TWITTER_CLIENT_SECRET,
      callbackURL: TWITTER_CALLBACK_URL,
      clientType: 'confidential',
      scope: ['tweet.read', 'users.read'],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const twitterId = profile.id;
        const twitterUsername = profile.username;
        const twitterDisplayName = profile.displayName;
        const twitterProfileImage = profile.photos?.[0]?.value;

        const [existingUser] = await db
          .select()
          .from(users)
          .where(eq(users.twitterId, twitterId))
          .limit(1);

        if (existingUser) {
          const [updatedUser] = await db
            .update(users)
            .set({
              twitterUsername,
              twitterDisplayName,
              twitterProfileImage,
              twitterAccessToken: accessToken,
              twitterRefreshToken: refreshToken || existingUser.twitterRefreshToken,
              updatedAt: new Date(),
            })
            .where(eq(users.id, existingUser.id))
            .returning();

          return done(null, updatedUser);
        }

        const [newUser] = await db
          .insert(users)
          .values({
            twitterId,
            twitterUsername,
            twitterDisplayName,
            twitterProfileImage,
            twitterAccessToken: accessToken,
            twitterRefreshToken: refreshToken,
            subscriptionTier: 'free',
          })
          .returning();

        return done(null, newUser);
      } catch (error) {
        console.error('Twitter OAuth 2.0 error:', error);
        return done(error as Error, undefined);
      }
    }
  )
);

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    done(null, user || null);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
