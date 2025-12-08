import dotenv from 'dotenv';

dotenv.config();

export const config = {
  discord: {
    token: process.env.DISCORD_TOKEN || '',
    textChannelId: process.env.TEXT_CHANNEL_ID || '',
  },
  database: {
    url: process.env.DATABASE_URL || 'file:./dev.db',
  },
  announcement: {
    repeatCount: parseInt(process.env.ANNOUNCEMENT_REPEAT_COUNT || '2', 10),
    repeatDelayMs: parseInt(process.env.ANNOUNCEMENT_REPEAT_DELAY_MS || '2000', 10),
    voiceDelayMs: parseInt(process.env.ANNOUNCEMENT_VOICE_DELAY_MS || '5000', 10),
  },
} as const;

export function validateConfig(): void {
  if (!config.discord.token) {
    throw new Error('DISCORD_TOKEN não configurado no .env');
  }
}

