import { Worker, Job } from 'bullmq';
import { redisClient } from '../redis';
import { JobType, FetchTweetsJobData, JobResult } from '../types';
import { db } from '../../db/connection';
import { podcasts, users, tweets } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { createTwitterClient } from '../../services/twitter-client';

export class FetchTweetsWorker {
  private worker: Worker;

  constructor() {
    this.worker = new Worker(
      JobType.FETCH_TWEETS,
      async (job: Job<FetchTweetsJobData>) => {
        return await this.process(job);
      },
      {
        connection: redisClient,
        concurrency: 5,
      }
    );

    this.worker.on('completed', (job) => {
      console.log(`[${JobType.FETCH_TWEETS}] Job ${job.id} completed`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`[${JobType.FETCH_TWEETS}] Job ${job?.id} failed:`, err.message);
    });

    this.worker.on('error', (err) => {
      console.error(`[${JobType.FETCH_TWEETS}] Worker error:`, err);
    });

    console.log(`Worker ${JobType.FETCH_TWEETS} initialized`);
  }

  private async process(job: Job<FetchTweetsJobData>): Promise<JobResult> {
    const { podcastId, sourceType, sourceValue, filters } = job.data;

    console.log(`Fetching tweets for podcast ${podcastId} from ${sourceType}: ${sourceValue}`);

    await job.updateProgress(10);

    const [podcast] = await db.select().from(podcasts).where(eq(podcasts.id, podcastId));

    if (!podcast) {
      throw new Error('Podcast not found');
    }

    const [user] = await db.select().from(users).where(eq(users.id, podcast.userId));

    if (!user) {
      throw new Error('User not found');
    }

    await job.updateProgress(20);

    const twitterClient = createTwitterClient(user.twitterAccessToken);

    let fetchedTweets;

    try {
      if (sourceType === 'timeline') {
        const me = await twitterClient.getMe();
        fetchedTweets = await twitterClient.getUserTimeline(me.id, {
          maxResults: filters?.minimumLikes ? 100 : 50,
          excludeRetweets: filters?.includeRetweets === false,
          excludeReplies: filters?.includeReplies === false,
          startTime: filters?.dateRange?.start ? new Date(filters.dateRange.start) : undefined,
          endTime: filters?.dateRange?.end ? new Date(filters.dateRange.end) : undefined,
        });
      } else if (sourceType === 'username') {
        const targetUser = await twitterClient.getUserByUsername(sourceValue.replace('@', ''));
        fetchedTweets = await twitterClient.getUserTimeline(targetUser.id, {
          maxResults: 50,
          excludeRetweets: filters?.includeRetweets === false,
          excludeReplies: filters?.includeReplies === false,
        });
      } else if (sourceType === 'hashtag') {
        fetchedTweets = await twitterClient.searchTweets(`#${sourceValue.replace('#', '')}`, {
          maxResults: 50,
        });
      } else if (sourceType === 'url') {
        const tweetId = sourceValue.split('/').pop()?.split('?')[0];
        if (!tweetId) throw new Error('Invalid tweet URL');
        fetchedTweets = await twitterClient.getThread(tweetId);
      } else {
        throw new Error(`Unsupported source type: ${sourceType}`);
      }
    } catch (error: any) {
      console.error('Twitter API error:', error);
      throw new Error(`Failed to fetch tweets: ${error.message}`);
    }

    await job.updateProgress(60);

    const tweetIds: string[] = [];

    for (const tweet of fetchedTweets) {
      const existingTweet = await db
        .select()
        .from(tweets)
        .where(eq(tweets.id, tweet.id))
        .limit(1);

      if (existingTweet.length === 0) {
        await db.insert(tweets).values({
          id: tweet.id,
          authorUsername: user.twitterUsername,
          text: tweet.text,
          createdAt: new Date(tweet.created_at || Date.now()),
          likeCount: tweet.public_metrics?.like_count || 0,
          retweetCount: tweet.public_metrics?.retweet_count || 0,
        });
      }

      tweetIds.push(tweet.id);
    }

    await job.updateProgress(90);

    await db
      .update(podcasts)
      .set({ tweetCount: tweetIds.length })
      .where(eq(podcasts.id, podcastId));

    await job.updateProgress(100);

    return {
      success: true,
      data: {
        tweetIds,
        count: tweetIds.length,
      },
      timestamp: new Date(),
    };
  }

  public async close(): Promise<void> {
    await this.worker.close();
    console.log(`Worker ${JobType.FETCH_TWEETS} closed`);
  }
}
