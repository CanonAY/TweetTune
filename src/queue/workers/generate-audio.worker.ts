import { Worker, Job } from 'bullmq';
import { redisClient } from '../redis';
import { JobType, GenerateAudioJobData, JobResult } from '../types';
import { db } from '../../db/connection';
import { podcasts } from '../../db/schema';
import { eq } from 'drizzle-orm';

export class GenerateAudioWorker {
  private worker: Worker;

  constructor() {
    this.worker = new Worker(
      JobType.GENERATE_AUDIO,
      async (job: Job<GenerateAudioJobData>) => {
        return await this.process(job);
      },
      {
        connection: redisClient,
        concurrency: 2,
      }
    );

    this.worker.on('completed', (job) => {
      console.log(`[${JobType.GENERATE_AUDIO}] Job ${job.id} completed`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`[${JobType.GENERATE_AUDIO}] Job ${job?.id} failed:`, err.message);
    });

    this.worker.on('error', (err) => {
      console.error(`[${JobType.GENERATE_AUDIO}] Worker error:`, err);
    });

    console.log(`Worker ${JobType.GENERATE_AUDIO} initialized`);
  }

  private async process(job: Job<GenerateAudioJobData>): Promise<JobResult> {
    const { podcastId, segments } = job.data;

    console.log(`Generating audio for ${segments.length} segments in podcast ${podcastId}`);

    await job.updateProgress(10);

    const audioFiles: string[] = [];

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      console.log(`Generating audio for segment ${i + 1}/${segments.length}: ${segment.type}`);

      await new Promise((resolve) => setTimeout(resolve, 1000));

      const mockAudioFile = `audio/${podcastId}/segment_${i}_${segment.type}.mp3`;
      audioFiles.push(mockAudioFile);

      const progress = 10 + ((i + 1) / segments.length) * 80;
      await job.updateProgress(progress);
    }

    await job.updateProgress(100);

    return {
      success: true,
      data: {
        audioFiles,
        segmentCount: segments.length,
      },
      timestamp: new Date(),
    };
  }

  public async close(): Promise<void> {
    await this.worker.close();
    console.log(`Worker ${JobType.GENERATE_AUDIO} closed`);
  }
}
