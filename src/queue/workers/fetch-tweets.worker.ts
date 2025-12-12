import { Worker, Job } from 'bullmq';
import { redisClient } from '../redis';
import { JobType, FetchTweetsJobData, JobResult } from '../types';
import { db } from '../../db/connection';
import { podcasts } from '../../db/schema';
import { eq } from 'drizzle-orm';

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

    const mockTweetIds = Array.from({ length: 10 }, (_, i) => `tweet_${Date.now()}_${i}`);

    await job.updateProgress(50);

    await new Promise((resolve) => setTimeout(resolve, 2000));

    await job.updateProgress(90);

    await db
      .update(podcasts)
      .set({ tweetCount: mockTweetIds.length })
      .where(eq(podcasts.id, podcastId));

    await job.updateProgress(100);

    return {
      success: true,
      data: {
        tweetIds: mockTweetIds,
        count: mockTweetIds.length,
      },
      timestamp: new Date(),
    };
  }

  public async close(): Promise<void> {
    await this.worker.close();
    console.log(`Worker ${JobType.FETCH_TWEETS} closed`);
  }
}
