import { Worker, Job } from 'bullmq';
import { redisClient } from '../redis';
import { JobType, AnalyzeEmotionsJobData, JobResult, EmotionType } from '../types';
import { db } from '../../db/connection';
import { tweets } from '../../db/schema';
import { inArray } from 'drizzle-orm';

export class AnalyzeEmotionsWorker {
  private worker: Worker;

  constructor() {
    this.worker = new Worker(
      JobType.ANALYZE_EMOTIONS,
      async (job: Job<AnalyzeEmotionsJobData>) => {
        return await this.process(job);
      },
      {
        connection: redisClient,
        concurrency: 3,
      }
    );

    this.worker.on('completed', (job) => {
      console.log(`[${JobType.ANALYZE_EMOTIONS}] Job ${job.id} completed`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`[${JobType.ANALYZE_EMOTIONS}] Job ${job?.id} failed:`, err.message);
    });

    this.worker.on('error', (err) => {
      console.error(`[${JobType.ANALYZE_EMOTIONS}] Worker error:`, err);
    });

    console.log(`Worker ${JobType.ANALYZE_EMOTIONS} initialized`);
  }

  private async process(job: Job<AnalyzeEmotionsJobData>): Promise<JobResult> {
    const { podcastId, tweetIds } = job.data;

    console.log(`Analyzing emotions for ${tweetIds.length} tweets in podcast ${podcastId}`);

    await job.updateProgress(10);

    const emotionResults = tweetIds.map((tweetId, index) => {
      const emotions = Object.values(EmotionType);
      const randomEmotion = emotions[Math.floor(Math.random() * emotions.length)];
      const confidence = 0.6 + Math.random() * 0.35;

      return {
        tweetId,
        emotionType: randomEmotion,
        emotionConfidence: confidence.toFixed(2),
      };
    });

    await job.updateProgress(50);

    await new Promise((resolve) => setTimeout(resolve, 3000));

    await job.updateProgress(90);

    for (const result of emotionResults) {
      await db
        .update(tweets)
        .set({
          emotionType: result.emotionType,
          emotionConfidence: result.emotionConfidence,
        })
        .where(inArray(tweets.id, tweetIds));
    }

    await job.updateProgress(100);

    return {
      success: true,
      data: {
        analyzed: emotionResults.length,
        results: emotionResults,
      },
      timestamp: new Date(),
    };
  }

  public async close(): Promise<void> {
    await this.worker.close();
    console.log(`Worker ${JobType.ANALYZE_EMOTIONS} closed`);
  }
}
