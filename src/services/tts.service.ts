import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';

const CACHE_DIR = path.join(process.cwd(), 'audio-cache');

export interface TTSOptions {
  text: string;
  lang?: string;
  slow?: boolean;
}

export class TTSService {
  private async ensureCacheDir(): Promise<void> {
    try {
      await fs.access(CACHE_DIR);
    } catch {
      await fs.mkdir(CACHE_DIR, { recursive: true });
    }
  }

  private getCacheKey(text: string, lang: string): string {
    const hash = Buffer.from(text + lang).toString('base64').replace(/[/+=]/g, '_');
    return `${hash}.mp3`;
  }

  private async getCachedAudio(cacheKey: string): Promise<string | null> {
    const cachePath = path.join(CACHE_DIR, cacheKey);
    try {
      await fs.access(cachePath);
      return cachePath;
    } catch {
      return null;
    }
  }

  async generateSpeech(options: TTSOptions): Promise<string> {
    const { text, lang = 'pt-BR', slow = false } = options;
    
    await this.ensureCacheDir();
    
    const cacheKey = this.getCacheKey(text, lang);
    const cached = await this.getCachedAudio(cacheKey);
    
    if (cached) {
      console.log(`📦 Usando áudio em cache: ${text.substring(0, 50)}...`);
      return cached;
    }

    try {
      console.log(`🎤 Gerando TTS: ${text.substring(0, 50)}...`);
      
      const langCode = lang.toLowerCase();
      const encodedText = encodeURIComponent(text);
      const speed = slow ? 0.24 : 1;
      
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${langCode}&client=tw-ob&q=${encodedText}&ttsspeed=${speed}`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      if (!response.ok) {
        throw new Error(`Erro ao gerar TTS: ${response.statusText}`);
      }

      const cachePath = path.join(CACHE_DIR, cacheKey);
      const fileStream = createWriteStream(cachePath);
      
      if (!response.body) {
        throw new Error('Resposta sem corpo');
      }
      
      await pipeline(response.body, fileStream);
      
      console.log(`✅ TTS gerado com sucesso`);
      return cachePath;
    } catch (error) {
      console.error('❌ Erro ao gerar TTS:', error);
      throw error;
    }
  }

  async clearCache(): Promise<void> {
    try {
      const files = await fs.readdir(CACHE_DIR);
      await Promise.all(
        files.map(file => fs.unlink(path.join(CACHE_DIR, file)))
      );
      console.log('🗑️  Cache de áudio limpo');
    } catch (error) {
      console.error('Erro ao limpar cache:', error);
    }
  }

  async getCacheSize(): Promise<{ files: number; sizeMB: number }> {
    try {
      const files = await fs.readdir(CACHE_DIR);
      let totalSize = 0;
      
      for (const file of files) {
        const stats = await fs.stat(path.join(CACHE_DIR, file));
        totalSize += stats.size;
      }
      
      return {
        files: files.length,
        sizeMB: totalSize / (1024 * 1024),
      };
    } catch {
      return { files: 0, sizeMB: 0 };
    }
  }
}

export const ttsService = new TTSService();

