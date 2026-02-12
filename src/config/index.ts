import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

loadDotenv();

const configSchema = z.object({
  // Server
  port: z.coerce.number().int().positive().default(3000),

  // Update interval (ms) - default 1 hour
  updateIntervalMs: z.coerce.number().int().positive().default(3_600_000),

  // News API
  newsApiKey: z.string().optional(),

  // Twitter / X API
  twitterBearerToken: z.string().optional(),
  twitterConsumerKey: z.string().optional(),
  twitterConsumerSecret: z.string().optional(),
  twitterAccessToken: z.string().optional(),
  twitterAccessTokenSecret: z.string().optional(),

  // RSS feed URLs (comma-separated)
  rssFeedUrls: z
    .string()
    .optional()
    .transform((val) =>
      val
        ? val.split(',').map((url) => url.trim()).filter(Boolean)
        : []
    ),

  // Anthropic API (optional, for AI summarization)
  anthropicApiKey: z.string().optional(),

  // Storage TTL (ms) - default 24 hours
  storageTtlMs: z.coerce.number().int().positive().default(86_400_000),
});

export type AppConfig = z.infer<typeof configSchema>;

function loadConfig(): AppConfig {
  const result = configSchema.safeParse({
    port: process.env.PORT,
    updateIntervalMs: process.env.UPDATE_INTERVAL_MS,
    newsApiKey: process.env.NEWS_API_KEY,
    twitterBearerToken: process.env.TWITTER_BEARER_TOKEN,
    twitterConsumerKey: process.env.TWITTER_CONSUMER_KEY,
    twitterConsumerSecret: process.env.TWITTER_CONSUMER_SECRET,
    twitterAccessToken: process.env.TWITTER_ACCESS_TOKEN,
    twitterAccessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
    rssFeedUrls: process.env.RSS_FEED_URLS,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    storageTtlMs: process.env.STORAGE_TTL_MS,
  });

  if (!result.success) {
    const formatted = result.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid configuration:\n${formatted}`);
  }

  return result.data;
}

export const appConfig = loadConfig();
