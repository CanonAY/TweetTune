import { Queue, QueueOptions } from 'bullmq';
import { redisClient } from './redis';
import {
  JobType,
  JobPriority,
  FetchTweetsJobData,
  AnalyzeEmotionsJobData,
  GenerateAudioJobData,
  AssemblePodcastJobData,
  QueueConfig,
} from './types';

export class QueueManager {
  private static instance: QueueManager;
  private queues: Map<JobType, Queue>;

  private constructor() {
    this.queues = new Map();
    this.initializeQueues();
  }

  public static getInstance(): QueueManager {
    if (!QueueManager.instance) {
      QueueManager.instance = new QueueManager();
    }
    return QueueManager.instance;
  }

  private initializeQueues(): void {
    const queueOptions: QueueOptions = {
      connection: redisClient,
    };

    this.queues.set(JobType.FETCH_TWEETS, new Queue(JobType.FETCH_TWEETS, queueOptions));
    this.queues.set(JobType.ANALYZE_EMOTIONS, new Queue(JobType.ANALYZE_EMOTIONS, queueOptions));
    this.queues.set(JobType.GENERATE_AUDIO, new Queue(JobType.GENERATE_AUDIO, queueOptions));
    this.queues.set(JobType.ASSEMBLE_PODCAST, new Queue(JobType.ASSEMBLE_PODCAST, queueOptions));

    console.log('Job queues initialized:', Array.from(this.queues.keys()));
  }

  private getQueueConfig(jobType: JobType): QueueConfig {
    const configs: Record<JobType, QueueConfig> = {
      [JobType.FETCH_TWEETS]: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
      [JobType.ANALYZE_EMOTIONS]: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
      [JobType.GENERATE_AUDIO]: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 50,
        removeOnFail: 200,
      },
      [JobType.ASSEMBLE_PODCAST]: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 50,
        removeOnFail: 200,
      },
    };

    return configs[jobType];
  }

  public async addFetchTweetsJob(
    data: FetchTweetsJobData,
    priority: JobPriority = JobPriority.MEDIUM
  ) {
    const queue = this.queues.get(JobType.FETCH_TWEETS);
    if (!queue) throw new Error('Fetch tweets queue not initialized');

    const config = this.getQueueConfig(JobType.FETCH_TWEETS);

    return await queue.add(JobType.FETCH_TWEETS, data, {
      priority,
      attempts: config.attempts,
      backoff: config.backoff,
      removeOnComplete: config.removeOnComplete,
      removeOnFail: config.removeOnFail,
    });
  }

  public async addAnalyzeEmotionsJob(
    data: AnalyzeEmotionsJobData,
    priority: JobPriority = JobPriority.MEDIUM
  ) {
    const queue = this.queues.get(JobType.ANALYZE_EMOTIONS);
    if (!queue) throw new Error('Analyze emotions queue not initialized');

    const config = this.getQueueConfig(JobType.ANALYZE_EMOTIONS);

    return await queue.add(JobType.ANALYZE_EMOTIONS, data, {
      priority,
      attempts: config.attempts,
      backoff: config.backoff,
      removeOnComplete: config.removeOnComplete,
      removeOnFail: config.removeOnFail,
    });
  }

  public async addGenerateAudioJob(
    data: GenerateAudioJobData,
    priority: JobPriority = JobPriority.MEDIUM
  ) {
    const queue = this.queues.get(JobType.GENERATE_AUDIO);
    if (!queue) throw new Error('Generate audio queue not initialized');

    const config = this.getQueueConfig(JobType.GENERATE_AUDIO);

    return await queue.add(JobType.GENERATE_AUDIO, data, {
      priority,
      attempts: config.attempts,
      backoff: config.backoff,
      removeOnComplete: config.removeOnComplete,
      removeOnFail: config.removeOnFail,
    });
  }

  public async addAssemblePodcastJob(
    data: AssemblePodcastJobData,
    priority: JobPriority = JobPriority.LOW
  ) {
    const queue = this.queues.get(JobType.ASSEMBLE_PODCAST);
    if (!queue) throw new Error('Assemble podcast queue not initialized');

    const config = this.getQueueConfig(JobType.ASSEMBLE_PODCAST);

    return await queue.add(JobType.ASSEMBLE_PODCAST, data, {
      priority,
      attempts: config.attempts,
      backoff: config.backoff,
      removeOnComplete: config.removeOnComplete,
      removeOnFail: config.removeOnFail,
    });
  }

  public getQueue(jobType: JobType): Queue | undefined {
    return this.queues.get(jobType);
  }

  public async getJobCounts(jobType: JobType) {
    const queue = this.queues.get(jobType);
    if (!queue) return null;

    return await queue.getJobCounts();
  }

  public async pauseQueue(jobType: JobType): Promise<void> {
    const queue = this.queues.get(jobType);
    if (queue) {
      await queue.pause();
      console.log(`Queue ${jobType} paused`);
    }
  }

  public async resumeQueue(jobType: JobType): Promise<void> {
    const queue = this.queues.get(jobType);
    if (queue) {
      await queue.resume();
      console.log(`Queue ${jobType} resumed`);
    }
  }

  public async cleanQueue(jobType: JobType, grace: number = 0): Promise<void> {
    const queue = this.queues.get(jobType);
    if (queue) {
      await queue.clean(grace, 1000, 'completed');
      await queue.clean(grace, 1000, 'failed');
      console.log(`Queue ${jobType} cleaned`);
    }
  }

  public async closeAll(): Promise<void> {
    for (const [type, queue] of this.queues.entries()) {
      await queue.close();
      console.log(`Queue ${type} closed`);
    }
  }
}

export const queueManager = QueueManager.getInstance();
