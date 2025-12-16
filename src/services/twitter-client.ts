import { TwitterApi, TweetV2, UserV2 } from 'twitter-api-v2';

export interface TwitterClientOptions {
  bearerToken: string;
}

export interface FetchTweetsOptions {
  maxResults?: number;
  startTime?: Date;
  endTime?: Date;
  excludeRetweets?: boolean;
  excludeReplies?: boolean;
}

export class TwitterClient {
  private client: TwitterApi;

  constructor(options: TwitterClientOptions) {
    this.client = new TwitterApi(options.bearerToken);
  }

  async getMe(): Promise<UserV2> {
    const user = await this.client.v2.me();
    return user.data;
  }

  async getUserTimeline(
    userId: string,
    options: FetchTweetsOptions = {}
  ): Promise<TweetV2[]> {
    const {
      maxResults = 50,
      startTime,
      endTime,
      excludeRetweets = true,
      excludeReplies = true,
    } = options;

    const excludeParams: string[] = [];
    if (excludeRetweets) excludeParams.push('retweets');
    if (excludeReplies) excludeParams.push('replies');

    const tweets = await this.client.v2.userTimeline(userId, {
      max_results: maxResults,
      exclude: excludeParams.length > 0 ? excludeParams : undefined,
      start_time: startTime?.toISOString(),
      end_time: endTime?.toISOString(),
      'tweet.fields': ['created_at', 'public_metrics', 'author_id', 'conversation_id'],
    });

    return tweets.data.data || [];
  }

  async getUserByUsername(username: string): Promise<UserV2> {
    const user = await this.client.v2.userByUsername(username);
    return user.data;
  }

  async getTweet(tweetId: string): Promise<TweetV2> {
    const tweet = await this.client.v2.singleTweet(tweetId, {
      'tweet.fields': ['created_at', 'public_metrics', 'author_id'],
    });
    return tweet.data;
  }

  async searchTweets(query: string, options: FetchTweetsOptions = {}): Promise<TweetV2[]> {
    const { maxResults = 50, startTime, endTime } = options;

    const tweets = await this.client.v2.search(query, {
      max_results: maxResults,
      start_time: startTime?.toISOString(),
      end_time: endTime?.toISOString(),
      'tweet.fields': ['created_at', 'public_metrics', 'author_id'],
    });

    return tweets.data.data || [];
  }

  async getThread(tweetId: string): Promise<TweetV2[]> {
    const tweet = await this.getTweet(tweetId);
    const conversationId = tweet.conversation_id || tweetId;

    const tweets = await this.client.v2.search(`conversation_id:${conversationId}`, {
      max_results: 100,
      'tweet.fields': ['created_at', 'public_metrics', 'author_id', 'conversation_id'],
    });

    return tweets.data.data || [];
  }
}

export function createTwitterClient(bearerToken: string): TwitterClient {
  return new TwitterClient({ bearerToken });
}
