import { FetchTweetsWorker } from './fetch-tweets.worker';
import { AnalyzeEmotionsWorker } from './analyze-emotions.worker';
import { GenerateAudioWorker } from './generate-audio.worker';
import { AssemblePodcastWorker } from './assemble-podcast.worker';

export class WorkerManager {
  private static instance: WorkerManager;
  private workers: {
    fetchTweets: FetchTweetsWorker;
    analyzeEmotions: AnalyzeEmotionsWorker;
    generateAudio: GenerateAudioWorker;
    assemblePodcast: AssemblePodcastWorker;
  };

  private constructor() {
    console.log('Initializing workers...');

    this.workers = {
      fetchTweets: new FetchTweetsWorker(),
      analyzeEmotions: new AnalyzeEmotionsWorker(),
      generateAudio: new GenerateAudioWorker(),
      assemblePodcast: new AssemblePodcastWorker(),
    };

    console.log('All workers initialized successfully');
  }

  public static getInstance(): WorkerManager {
    if (!WorkerManager.instance) {
      WorkerManager.instance = new WorkerManager();
    }
    return WorkerManager.instance;
  }

  public async closeAll(): Promise<void> {
    console.log('Closing all workers...');
    await Promise.all([
      this.workers.fetchTweets.close(),
      this.workers.analyzeEmotions.close(),
      this.workers.generateAudio.close(),
      this.workers.assemblePodcast.close(),
    ]);
    console.log('All workers closed');
  }
}

export const workerManager = WorkerManager.getInstance();
