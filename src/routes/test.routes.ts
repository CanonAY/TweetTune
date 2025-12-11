import { Router, Request, Response } from 'express';
import { db } from '../db/connection';
import { users, podcasts, tweets, podcastTweets, usageLogs } from '../db/schema';
import { eq, desc } from 'drizzle-orm';

const router = Router();

router.post('/users', async (req: Request, res: Response) => {
  try {
    const { email, twitterUsername, subscriptionTier, voicePreference } = req.body;

    const [user] = await db
      .insert(users)
      .values({
        email,
        twitterUsername,
        subscriptionTier: subscriptionTier || 'free',
        voicePreference,
      })
      .returning();

    res.status(201).json(user);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/users', async (req: Request, res: Response) => {
  try {
    const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));
    res.json(allUsers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/users/:id', async (req: Request, res: Response) => {
  try {
    const [user] = await db.select().from(users).where(eq(users.id, req.params.id));

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/tweets', async (req: Request, res: Response) => {
  try {
    const {
      id,
      authorUsername,
      text,
      createdAt,
      likeCount,
      retweetCount,
      emotionType,
      emotionConfidence,
    } = req.body;

    const [tweet] = await db
      .insert(tweets)
      .values({
        id,
        authorUsername,
        text,
        createdAt: new Date(createdAt),
        likeCount: likeCount || 0,
        retweetCount: retweetCount || 0,
        emotionType,
        emotionConfidence,
      })
      .returning();

    res.status(201).json(tweet);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/tweets', async (req: Request, res: Response) => {
  try {
    const allTweets = await db.select().from(tweets).orderBy(desc(tweets.createdAt));
    res.json(allTweets);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/podcasts', async (req: Request, res: Response) => {
  try {
    const {
      userId,
      title,
      description,
      sourceType,
      sourceIdentifier,
      status,
      audioUrl,
      durationSeconds,
      tweetCount,
    } = req.body;

    const [podcast] = await db
      .insert(podcasts)
      .values({
        userId,
        title,
        description,
        sourceType,
        sourceIdentifier,
        status: status || 'processing',
        audioUrl,
        durationSeconds,
        tweetCount,
      })
      .returning();

    res.status(201).json(podcast);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/podcasts', async (req: Request, res: Response) => {
  try {
    const allPodcasts = await db.select().from(podcasts).orderBy(desc(podcasts.createdAt));
    res.json(allPodcasts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/podcasts/:id', async (req: Request, res: Response) => {
  try {
    const [podcast] = await db.select().from(podcasts).where(eq(podcasts.id, req.params.id));

    if (!podcast) {
      return res.status(404).json({ error: 'Podcast not found' });
    }

    res.json(podcast);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/usage-logs', async (req: Request, res: Response) => {
  try {
    const { userId, action, creditsUsed } = req.body;

    const [log] = await db
      .insert(usageLogs)
      .values({
        userId,
        action,
        creditsUsed: creditsUsed || 1,
      })
      .returning();

    res.status(201).json(log);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/usage-logs', async (req: Request, res: Response) => {
  try {
    const logs = await db.select().from(usageLogs).orderBy(desc(usageLogs.createdAt));
    res.json(logs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/cleanup', async (req: Request, res: Response) => {
  try {
    await db.delete(podcastTweets);
    await db.delete(usageLogs);
    await db.delete(podcasts);
    await db.delete(tweets);
    await db.delete(users);

    res.json({ message: 'All test data cleaned up' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
