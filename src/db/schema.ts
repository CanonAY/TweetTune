import { pgTable, uuid, varchar, text, timestamp, integer, decimal, primaryKey } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).unique(),
  twitterId: varchar('twitter_id', { length: 100 }).notNull().unique(),
  twitterUsername: varchar('twitter_username', { length: 50 }).notNull(),
  twitterDisplayName: varchar('twitter_display_name', { length: 100 }),
  twitterProfileImage: varchar('twitter_profile_image', { length: 500 }),
  twitterAccessToken: text('twitter_access_token').notNull(),
  twitterRefreshToken: text('twitter_refresh_token'),
  subscriptionTier: varchar('subscription_tier', { length: 20 }).default('free').notNull(),
  voicePreference: varchar('voice_preference', { length: 50 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Podcasts table
export const podcasts = pgTable('podcasts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  sourceType: varchar('source_type', { length: 20 }).notNull(), // 'timeline', 'thread', 'user', 'hashtag'
  sourceIdentifier: varchar('source_identifier', { length: 255 }).notNull(), // URL, username, hashtag
  status: varchar('status', { length: 20 }).default('processing').notNull(), // 'processing', 'completed', 'failed'
  audioUrl: varchar('audio_url', { length: 500 }),
  durationSeconds: integer('duration_seconds'),
  tweetCount: integer('tweet_count'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Tweets table (cache)
export const tweets = pgTable('tweets', {
  id: varchar('id', { length: 50 }).primaryKey(),
  authorUsername: varchar('author_username', { length: 50 }).notNull(),
  text: text('text').notNull(),
  createdAt: timestamp('created_at').notNull(),
  likeCount: integer('like_count').default(0).notNull(),
  retweetCount: integer('retweet_count').default(0).notNull(),
  emotionType: varchar('emotion_type', { length: 20 }),
  emotionConfidence: decimal('emotion_confidence', { precision: 3, scale: 2 }),
  cachedAt: timestamp('cached_at').defaultNow().notNull(),
});

// Podcast tweets junction table (many-to-many)
export const podcastTweets = pgTable('podcast_tweets', {
  podcastId: uuid('podcast_id').references(() => podcasts.id).notNull(),
  tweetId: varchar('tweet_id', { length: 50 }).references(() => tweets.id).notNull(),
  sequenceOrder: integer('sequence_order').notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.podcastId, table.tweetId] }),
}));

// Usage logs table
export const usageLogs = pgTable('usage_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  action: varchar('action', { length: 50 }).notNull(), // 'podcast_created', 'tweet_fetched', 'audio_generated'
  creditsUsed: integer('credits_used').default(1).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  podcasts: many(podcasts),
  usageLogs: many(usageLogs),
}));

export const podcastsRelations = relations(podcasts, ({ one, many }) => ({
  user: one(users, {
    fields: [podcasts.userId],
    references: [users.id],
  }),
  podcastTweets: many(podcastTweets),
}));

export const tweetsRelations = relations(tweets, ({ many }) => ({
  podcastTweets: many(podcastTweets),
}));

export const podcastTweetsRelations = relations(podcastTweets, ({ one }) => ({
  podcast: one(podcasts, {
    fields: [podcastTweets.podcastId],
    references: [podcasts.id],
  }),
  tweet: one(tweets, {
    fields: [podcastTweets.tweetId],
    references: [tweets.id],
  }),
}));

export const usageLogsRelations = relations(usageLogs, ({ one }) => ({
  user: one(users, {
    fields: [usageLogs.userId],
    references: [users.id],
  }),
}));
