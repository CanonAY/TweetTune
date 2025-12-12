export enum JobType {
  FETCH_TWEETS = 'fetch_tweets',
  ANALYZE_EMOTIONS = 'analyze_emotions',
  GENERATE_AUDIO = 'generate_audio',
  ASSEMBLE_PODCAST = 'assemble_podcast',
}

export enum JobPriority {
  LOW = 1,
  MEDIUM = 5,
  HIGH = 10,
}

export interface FetchTweetsJobData {
  podcastId: string;
  sourceType: 'url' | 'username' | 'hashtag' | 'timeline';
  sourceValue: string;
  filters?: {
    includeRetweets?: boolean;
    includeReplies?: boolean;
    minimumLikes?: number;
    dateRange?: {
      start: string;
      end: string;
    };
    excludeKeywords?: string[];
  };
}

export interface AnalyzeEmotionsJobData {
  podcastId: string;
  tweetIds: string[];
}

export interface TweetEmotion {
  tweetId: string;
  emotionType: EmotionType;
  confidence: number;
  indicators: string[];
}

export enum EmotionType {
  NEUTRAL = 'neutral',
  EXCITED = 'excited',
  ANGRY = 'angry',
  SAD = 'sad',
  SARCASTIC = 'sarcastic',
  HUMOROUS = 'humorous',
  URGENT = 'urgent',
  THOUGHTFUL = 'thoughtful',
}

export interface GenerateAudioJobData {
  podcastId: string;
  segments: AudioSegment[];
}

export interface AudioSegment {
  id: string;
  type: 'intro' | 'tweet' | 'transition' | 'outro';
  text: string;
  voiceParams: VoiceParameters;
  metadata?: {
    tweetId?: string;
    author?: string;
    timestamp?: string;
  };
}

export interface VoiceParameters {
  voiceId: string;
  stability: number;
  similarityBoost: number;
  style: number;
  useSpeakerBoost: boolean;
}

export interface AssemblePodcastJobData {
  podcastId: string;
  audioFiles: string[];
  metadata: PodcastMetadata;
}

export interface PodcastMetadata {
  title: string;
  description?: string;
  author: string;
  chapters?: Chapter[];
}

export interface Chapter {
  startTime: number;
  title: string;
  tweetId?: string;
}

export interface JobResult {
  success: boolean;
  data?: any;
  error?: string;
  timestamp: Date;
}

export interface QueueConfig {
  attempts: number;
  backoff: {
    type: 'exponential' | 'fixed';
    delay: number;
  };
  removeOnComplete: boolean | number;
  removeOnFail: boolean | number;
}
