import { Router, Request, Response } from 'express';
import { queueManager } from '../queue/queue-manager';
import { JobType, JobPriority } from '../queue/types';

const router = Router();

router.post('/jobs/fetch-tweets', async (req: Request, res: Response) => {
  try {
    const { podcastId, sourceType, sourceValue, filters, priority } = req.body;

    const job = await queueManager.addFetchTweetsJob(
      {
        podcastId,
        sourceType,
        sourceValue,
        filters,
      },
      priority || JobPriority.MEDIUM
    );

    res.status(201).json({
      jobId: job.id,
      jobType: JobType.FETCH_TWEETS,
      status: 'queued',
      data: job.data,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/jobs/analyze-emotions', async (req: Request, res: Response) => {
  try {
    const { podcastId, tweetIds, priority } = req.body;

    const job = await queueManager.addAnalyzeEmotionsJob(
      {
        podcastId,
        tweetIds,
      },
      priority || JobPriority.MEDIUM
    );

    res.status(201).json({
      jobId: job.id,
      jobType: JobType.ANALYZE_EMOTIONS,
      status: 'queued',
      data: job.data,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/jobs/generate-audio', async (req: Request, res: Response) => {
  try {
    const { podcastId, segments, priority } = req.body;

    const job = await queueManager.addGenerateAudioJob(
      {
        podcastId,
        segments,
      },
      priority || JobPriority.MEDIUM
    );

    res.status(201).json({
      jobId: job.id,
      jobType: JobType.GENERATE_AUDIO,
      status: 'queued',
      data: job.data,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/jobs/assemble-podcast', async (req: Request, res: Response) => {
  try {
    const { podcastId, audioFiles, metadata, priority } = req.body;

    const job = await queueManager.addAssemblePodcastJob(
      {
        podcastId,
        audioFiles,
        metadata,
      },
      priority || JobPriority.LOW
    );

    res.status(201).json({
      jobId: job.id,
      jobType: JobType.ASSEMBLE_PODCAST,
      status: 'queued',
      data: job.data,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/jobs/:jobType/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobType, jobId } = req.params;
    const queue = queueManager.getQueue(jobType as JobType);

    if (!queue) {
      return res.status(404).json({ error: 'Queue not found' });
    }

    const job = await queue.getJob(jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const state = await job.getState();
    const progress = job.progress;

    res.json({
      jobId: job.id,
      jobType,
      state,
      progress,
      data: job.data,
      returnvalue: job.returnvalue,
      failedReason: job.failedReason,
      attemptsMade: job.attemptsMade,
      timestamp: job.timestamp,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/queues/:jobType/counts', async (req: Request, res: Response) => {
  try {
    const { jobType } = req.params;
    const counts = await queueManager.getJobCounts(jobType as JobType);

    if (!counts) {
      return res.status(404).json({ error: 'Queue not found' });
    }

    res.json({
      jobType,
      counts,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/queues/:jobType/pause', async (req: Request, res: Response) => {
  try {
    const { jobType } = req.params;
    await queueManager.pauseQueue(jobType as JobType);

    res.json({
      jobType,
      status: 'paused',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/queues/:jobType/resume', async (req: Request, res: Response) => {
  try {
    const { jobType } = req.params;
    await queueManager.resumeQueue(jobType as JobType);

    res.json({
      jobType,
      status: 'resumed',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/queues/:jobType/clean', async (req: Request, res: Response) => {
  try {
    const { jobType } = req.params;
    const { grace } = req.query;

    await queueManager.cleanQueue(jobType as JobType, grace ? parseInt(grace as string) : 0);

    res.json({
      jobType,
      status: 'cleaned',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/queues/stats', async (req: Request, res: Response) => {
  try {
    const stats = await Promise.all(
      Object.values(JobType).map(async (jobType) => {
        const counts = await queueManager.getJobCounts(jobType);
        return {
          jobType,
          counts,
        };
      })
    );

    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
