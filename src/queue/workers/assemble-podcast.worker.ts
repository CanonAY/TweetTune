import { Worker, Job } from 'bullmq';
import { redisClient } from '../redis';
import { JobType, AssemblePodcastJobData, JobResult } from '../types';
import { db } from '../../db/connection';
import { podcasts } from '../../db/schema';
import { eq } from 'drizzle-orm';

export class AssemblePodcastWorker {
  private worker: Worker;

  constructor() {
    this.worker = new Worker(
      JobType.ASSEMBLE_PODCAST,
      async (job: Job<AssemblePodcastJobData>) => {
        return await this.process(job);
      },
      {
        connection: redisClient,
        concurrency: 2,
      }
    );

    this.worker.on('completed', (job) => {
      console.log(`[${JobType.ASSEMBLE_PODCAST}] Job ${job.id} completed`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`[${JobType.ASSEMBLE_PODCAST}] Job ${job?.id} failed:`, err.message);
    });

    this.worker.on('error', (err) => {
      console.error(`[${JobType.ASSEMBLE_PODCAST}] Worker error:`, err);
    });

    console.log(`Worker ${JobType.ASSEMBLE_PODCAST} initialized`);
  }

  private async process(job: Job<AssemblePodcastJobData>): Promise<JobResult> {
    const { podcastId, audioFiles, metadata } = job.data;

    console.log(`Assembling podcast ${podcastId} from ${audioFiles.length} audio files`);

    await job.updateProgress(10);

    console.log('Concatenating audio files...');
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await job.updateProgress(40);

    console.log('Adding ID3 tags...');
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await job.updateProgress(60);

    console.log('Normalizing audio levels...');
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await job.updateProgress(80);

    const finalAudioUrl = `https://storage.example.com/podcasts/${podcastId}/final.mp3`;
    const estimatedDuration = audioFiles.length * 30;

    await db
      .update(podcasts)
      .set({
        audioUrl: finalAudioUrl,
        durationSeconds: estimatedDuration,
        status: 'completed',
      })
      .where(eq(podcasts.id, podcastId));

    await job.updateProgress(100);

    return {
      success: true,
      data: {
        audioUrl: finalAudioUrl,
        duration: estimatedDuration,
        fileCount: audioFiles.length,
      },
      timestamp: new Date(),
    };
  }

  public async close(): Promise<void> {
    await this.worker.close();
    console.log(`Worker ${JobType.ASSEMBLE_PODCAST} closed`);
  }
}
