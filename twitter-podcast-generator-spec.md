# Twitter Podcast Generator - Technical Specification

## 1. Overview

### 1.1 Project Summary
An application that converts Twitter/X content into emotionally-aware audio podcasts using ElevenLabs voice synthesis and sentiment analysis.

### 1.2 Key Objectives
- Transform tweet streams into natural-sounding audio content
- Detect and apply appropriate emotional tone to voice delivery
- Provide seamless user experience across web and mobile platforms
- Enable personalization and content curation

---

## 2. System Architecture

### 2.1 High-Level Components
```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Frontend  │────▶│   Backend    │────▶│  ElevenLabs │
│   (React)   │     │   (Node.js)  │     │     API     │
└─────────────┘     └──────────────┘     └─────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │   Twitter    │
                    │     API      │
                    └──────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  PostgreSQL  │
                    │   Database   │
                    └──────────────┘
```

### 2.2 Technology Stack

**Frontend**
- Framework: React 18+ / Next.js 14+
- UI Library: Tailwind CSS + shadcn/ui
- State Management: Zustand or React Context
- Audio Player: Howler.js or React-Player

**Backend**
- Runtime: Node.js 20+ / Express.js
- Language: TypeScript
- Queue System: Bull/BullMQ (Redis-based)
- Caching: Redis

**Database**
- Primary: PostgreSQL 15+
- Schema: User data, tweet cache, audio files metadata, usage tracking

**External APIs**
- Twitter API v2 (Essential or higher tier)
- ElevenLabs API (Text-to-Speech)
- OpenAI API or Anthropic Claude (sentiment analysis)

**Infrastructure**
- Hosting: Vercel (frontend) + Railway/Render (backend)
- Storage: AWS S3 or Cloudflare R2 (audio files)
- CDN: Cloudflare

---

## 3. Core Features

### 3.1 Content Ingestion

**Input Methods**
- Direct Twitter URL (tweet, thread, profile)
- Username lookup
- Hashtag/keyword search
- User timeline (home feed requires OAuth)

**Content Filtering**
```typescript
interface FilterOptions {
  includeRetweets: boolean;
  includeReplies: boolean;
  minimumLikes?: number;
  dateRange?: { start: Date; end: Date };
  excludeKeywords?: string[];
}
```

### 3.2 Emotion Detection System

**Sentiment Analysis Pipeline**
1. Text preprocessing (remove URLs, normalize mentions)
2. Multi-class emotion classification
3. Intensity scoring (0-1 scale)
4. Context-aware adjustments

**Emotion Categories**
```typescript
enum EmotionType {
  NEUTRAL = 'neutral',
  EXCITED = 'excited',
  ANGRY = 'angry',
  SAD = 'sad',
  SARCASTIC = 'sarcastic',
  HUMOROUS = 'humorous',
  URGENT = 'urgent',
  THOUGHTFUL = 'thoughtful'
}

interface EmotionScore {
  emotion: EmotionType;
  confidence: number; // 0-1
  indicators: string[]; // e.g., ["ALL_CAPS", "multiple_exclamation"]
}
```

**Detection Heuristics**
- ALL CAPS detection → excitement/anger
- Punctuation patterns (!!!, ???, ...) → emotion amplifiers
- Emoji sentiment mapping
- Sarcasm indicators (e.g., "oh great", "sure Jan")
- Length and complexity → thoughtful vs casual

### 3.3 Voice Synthesis

**ElevenLabs Integration**
```typescript
interface VoiceParameters {
  voiceId: string;
  stability: number;      // 0-1 (0 = more variable, 1 = more stable)
  similarityBoost: number; // 0-1
  style: number;          // 0-1 (emotion exaggeration)
  useSpeakerBoost: boolean;
}

// Emotion → Voice Parameter Mapping
const emotionMapping: Record<EmotionType, Partial<VoiceParameters>> = {
  excited: { stability: 0.3, style: 0.8 },
  angry: { stability: 0.4, style: 0.9 },
  sad: { stability: 0.7, style: 0.6 },
  sarcastic: { stability: 0.5, style: 0.7 },
  // ... etc
};
```

**Audio Processing**
- Format: MP3 (default), option for WAV/OGG
- Bitrate: 128kbps (standard), 192kbps (premium)
- Sample rate: 44.1kHz
- Normalization: -16 LUFS (podcast standard)

### 3.4 Podcast Assembly

**Segment Structure**
```typescript
interface PodcastSegment {
  id: string;
  type: 'intro' | 'tweet' | 'transition' | 'outro';
  text: string;
  voiceParams: VoiceParameters;
  metadata?: {
    tweetId?: string;
    author?: string;
    timestamp?: Date;
  };
}
```

**Assembly Pipeline**
1. Generate intro segment
2. Process tweets in chronological order
3. Insert contextual transitions
4. Add chapter markers
5. Generate outro
6. Concatenate audio files
7. Add ID3 tags (metadata)

**Transition Templates**
- Thread continuation: "They continued..."
- Time gap: "Three hours later..."
- Topic shift: "On a different note..."
- Reply context: "Responding to @username..."

---

## 4. Data Models

### 4.1 Database Schema

```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  twitter_username VARCHAR(50),
  subscription_tier VARCHAR(20) DEFAULT 'free',
  voice_preference VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Podcasts
CREATE TABLE podcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  source_type VARCHAR(20), -- 'timeline', 'thread', 'user', 'hashtag'
  source_identifier VARCHAR(255), -- URL, username, hashtag
  status VARCHAR(20) DEFAULT 'processing', -- 'processing', 'completed', 'failed'
  audio_url VARCHAR(500),
  duration_seconds INTEGER,
  tweet_count INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tweets (Cache)
CREATE TABLE tweets (
  id VARCHAR(50) PRIMARY KEY,
  author_username VARCHAR(50) NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL,
  like_count INTEGER DEFAULT 0,
  retweet_count INTEGER DEFAULT 0,
  emotion_type VARCHAR(20),
  emotion_confidence DECIMAL(3,2),
  cached_at TIMESTAMP DEFAULT NOW()
);

-- Podcast Episodes (many-to-many)
CREATE TABLE podcast_tweets (
  podcast_id UUID REFERENCES podcasts(id),
  tweet_id VARCHAR(50) REFERENCES tweets(id),
  sequence_order INTEGER NOT NULL,
  PRIMARY KEY (podcast_id, tweet_id)
);

-- Usage Tracking
CREATE TABLE usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(50), -- 'podcast_created', 'tweet_fetched', 'audio_generated'
  credits_used INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 4.2 API Models

```typescript
// Request: Create Podcast
interface CreatePodcastRequest {
  sourceType: 'url' | 'username' | 'hashtag' | 'timeline';
  sourceValue: string;
  filters?: FilterOptions;
  voiceId?: string;
  includeIntro?: boolean;
}

// Response: Podcast Status
interface PodcastResponse {
  id: string;
  status: 'processing' | 'completed' | 'failed';
  title: string;
  audioUrl?: string;
  duration?: number;
  tweetCount?: number;
  chapters?: Chapter[];
  error?: string;
}

interface Chapter {
  startTime: number; // seconds
  title: string;
  tweetId?: string;
}
```

---

## 5. API Endpoints

### 5.1 Core Endpoints

```
POST   /api/podcasts              Create new podcast
GET    /api/podcasts/:id          Get podcast details
GET    /api/podcasts              List user's podcasts
DELETE /api/podcasts/:id          Delete podcast

GET    /api/tweets/preview        Preview tweets before generation
POST   /api/tweets/analyze        Analyze emotion for tweet text

GET    /api/voices                List available ElevenLabs voices
GET    /api/user/usage            Get usage statistics
PATCH  /api/user/preferences      Update user preferences

POST   /api/auth/twitter          Twitter OAuth callback
POST   /api/auth/login            Email/password login
POST   /api/auth/register         User registration
```

### 5.2 Webhook Endpoints

```
POST   /api/webhooks/generation-complete   ElevenLabs callback
```

---

## 6. Processing Pipeline

### 6.1 Async Job Queue

**Queue Structure (BullMQ)**
```typescript
// Job Types
enum JobType {
  FETCH_TWEETS = 'fetch_tweets',
  ANALYZE_EMOTIONS = 'analyze_emotions',
  GENERATE_AUDIO = 'generate_audio',
  ASSEMBLE_PODCAST = 'assemble_podcast'
}

// Job Flow
1. fetchTweets (priority: high, timeout: 30s)
   ↓
2. analyzeEmotions (priority: medium, timeout: 60s)
   ↓
3. generateAudio (priority: medium, timeout: 300s)
   ↓
4. assemblePodcast (priority: low, timeout: 120s)
```

**Error Handling**
- Max retries: 3 per job
- Exponential backoff: 1s, 5s, 25s
- Dead letter queue for manual intervention
- User notification on final failure

### 6.2 Rate Limiting

**Twitter API Limits**
- Tweet lookup: 300/15min (user context)
- User timeline: 1500/15min
- Search: 450/15min

**ElevenLabs Limits**
- Character quota based on subscription
- Concurrent requests: 5 (starter), 20 (pro)

**Application Limits**
```typescript
const rateLimits = {
  free: {
    podcastsPerDay: 5,
    tweetsPerPodcast: 50,
    maxDuration: 300 // seconds
  },
  pro: {
    podcastsPerDay: 50,
    tweetsPerPodcast: 500,
    maxDuration: 3600
  }
};
```

---

## 7. User Interface

### 7.1 Key Screens

**Home/Dashboard**
- Recent podcasts list
- Quick create input
- Usage statistics

**Create Podcast**
- Source input (URL/username/hashtag)
- Filter options
- Voice selection
- Preview tweets before generation

**Podcast Player**
- Waveform visualization
- Chapter navigation
- Playback controls (speed, skip)
- Download option
- Share functionality

**Settings**
- Voice preferences
- Default filters
- Twitter account connection
- Subscription management

### 7.2 Mobile Considerations
- Progressive Web App (PWA)
- Offline playback
- Background audio support
- Push notifications for completed podcasts

---

## 8. Security & Privacy

### 8.1 Authentication
- JWT-based authentication
- OAuth 2.0 for Twitter integration
- Secure token storage (httpOnly cookies)

### 8.2 Data Protection
- Encrypt sensitive data at rest
- HTTPS only (TLS 1.3)
- Regular security audits
- GDPR compliance (data export/deletion)

### 8.3 Content Moderation
- Filter offensive content
- Respect Twitter's content policies
- User reporting mechanism
- Rate limiting per IP

---

## 9. Monitoring & Analytics

### 9.1 Metrics to Track
- Podcast creation success rate
- Average processing time
- API error rates (Twitter, ElevenLabs)
- User engagement (listens, downloads)
- Cost per podcast (API usage)

### 9.2 Logging
```typescript
interface LogEntry {
  level: 'info' | 'warn' | 'error';
  timestamp: Date;
  service: string;
  message: string;
  metadata?: Record<string, any>;
  userId?: string;
  podcastId?: string;
}
```

### 9.3 Tools
- Application: Sentry (error tracking)
- Infrastructure: Datadog or New Relic
- Analytics: PostHog or Mixpanel

---

## 10. Deployment

### 10.1 Environments
- **Development**: Local + staging database
- **Staging**: Vercel preview + Railway staging
- **Production**: Vercel + Railway production

### 10.2 CI/CD Pipeline
```yaml
# GitHub Actions Workflow
1. Lint & Type Check
2. Unit Tests
3. Integration Tests
4. Build Docker Image
5. Deploy to Staging (on PR)
6. Deploy to Production (on merge to main)
```

### 10.3 Infrastructure as Code
- Terraform for cloud resources
- Docker Compose for local development
- Kubernetes (optional, for scale)

---

## 11. Cost Estimation

### 11.1 API Costs (per 1000 users/month)

**ElevenLabs**
- Assuming 50 tweets per podcast, 5 podcasts per user
- ~12,500 words = 100,000 characters per user
- Cost: ~$3-5 per user at scale pricing

**Twitter API**
- Basic tier: $100/month (10K tweets)
- Pro tier: $5,000/month (1M tweets)

**OpenAI/Claude (Emotion Analysis)**
- ~50 requests per podcast = 250 requests per user
- Cost: ~$0.10-0.25 per user

**Infrastructure**
- Backend: $50-200/month (Railway/Render)
- Database: $25-100/month (managed PostgreSQL)
- Storage: $20-50/month (S3/R2)
- CDN: Included with Cloudflare free tier

### 11.2 Revenue Model
- Free: 5 podcasts/month, ads
- Pro: $9.99/month, 50 podcasts, premium voices
- Enterprise: Custom pricing, API access, white-label

---

## 12. Future Enhancements

### 12.1 Phase 2 Features
- Multi-voice support (different voice per Twitter account)
- Background music generation
- RSS feed generation for podcast apps
- Twitter Spaces to podcast conversion
- Collaborative playlists

### 12.2 Advanced Features
- Real-time streaming (listen while generating)
- Custom voice cloning for personalized narration
- AI-generated summaries and insights
- Integration with Spotify/Apple Podcasts
- Browser extension for one-click generation

### 12.3 Enterprise Features
- Team workspaces
- API access for developers
- Custom branding
- Advanced analytics dashboard
- Priority processing queue

---

## 13. Success Metrics

### 13.1 Key Performance Indicators
- **User Acquisition**: 1,000 users in first 3 months
- **Conversion Rate**: 10% free to paid
- **Retention**: 60% monthly active users
- **Processing Time**: <2 minutes for 50 tweets
- **Error Rate**: <5% failed podcast generations
- **User Satisfaction**: 4.5+ star rating

### 13.2 Technical Metrics
- API uptime: 99.5%
- Average response time: <200ms
- Database query time: <50ms (p95)
- Audio generation success rate: >95%

---

## 14. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Twitter API changes | High | Abstract API layer, multiple providers |
| ElevenLabs quota limits | Medium | Queue management, user tier limits |
| Copyright/legal issues | High | Terms of service, content filtering |
| High processing costs | Medium | Caching, tiered pricing |
| Abuse/spam | Medium | Rate limiting, content moderation |

---

## 15. Development Timeline

### Phase 1: MVP (8 weeks)
- Week 1-2: Project setup, basic backend API
- Week 3-4: Twitter integration, emotion detection
- Week 5-6: ElevenLabs integration, audio processing
- Week 7-8: Frontend UI, testing, deployment

### Phase 2: Beta Launch (4 weeks)
- Week 9-10: User authentication, payment integration
- Week 11-12: Polish, bug fixes, beta testing

### Phase 3: Public Launch (ongoing)
- Marketing and user acquisition
- Feature iterations based on feedback
- Performance optimization

---

## 16. Appendix

### 16.1 References
- [Twitter API Documentation](https://developer.twitter.com/en/docs)
- [ElevenLabs API Documentation](https://elevenlabs.io/docs)
- [Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)

### 16.2 Glossary
- **TTS**: Text-to-Speech
- **LUFS**: Loudness Units relative to Full Scale
- **ID3**: Metadata container for MP3 files
- **PWA**: Progressive Web App
- **JWT**: JSON Web Token

### 16.3 Contact
- Project Lead: [Name]
- Technical Lead: [Name]
- Repository: [GitHub URL]
