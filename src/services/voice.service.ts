import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnection,
  AudioPlayer,
  entersState,
  VoiceConnectionStatus,
} from '@discordjs/voice';
import { VoiceBasedChannel } from 'discord.js';
import { ttsService } from './tts.service';

export interface AnnouncementOptions {
  text: string;
  channel: VoiceBasedChannel;
  repeatCount?: number;
  repeatDelay?: number;
  leaveAfter?: number;
}

export class VoiceService {
  private activeConnections = new Map<string, VoiceConnection>();
  private announcementQueue: AnnouncementOptions[] = [];
  private isProcessingQueue = false;

  async announce(options: AnnouncementOptions): Promise<void> {
    this.announcementQueue.push(options);
    
    if (!this.isProcessingQueue) {
      await this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.announcementQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      while (this.announcementQueue.length > 0) {
        const announcement = this.announcementQueue.shift();
        if (announcement) {
          await this.processAnnouncement(announcement);
        }
      }
    } finally {
      this.isProcessingQueue = false;
    }
  }

  private async processAnnouncement(options: AnnouncementOptions): Promise<void> {
    const {
      text,
      channel,
      repeatCount = 3,
      repeatDelay = 2000,
      leaveAfter = 5000,
    } = options;

    try {
      console.log(`🔊 Anunciando no canal: ${channel.name}`);
      console.log(`📝 Texto: ${text}`);
      
      console.log(`⏳ Gerando áudio TTS...`);
      const audioPath = await ttsService.generateSpeech({ text, lang: 'pt-BR' });
      console.log(`✅ Áudio gerado em: ${audioPath}`);
      
      console.log(`🔌 Conectando ao canal de voz...`);
      const connection = await this.connectToChannel(channel);
      console.log(`✅ Conectado ao canal de voz`);
      
      const player = createAudioPlayer();
      connection.subscribe(player);
      
      for (let i = 0; i < repeatCount; i++) {
        if (i > 0) {
          console.log(`⏸️  Aguardando ${repeatDelay}ms antes da próxima repetição...`);
          await this.delay(repeatDelay);
        }
        
        console.log(`📢 Reproduzindo anúncio (${i + 1}/${repeatCount})`);
        await this.playAudio(player, audioPath);
        console.log(`✅ Reprodução ${i + 1} concluída`);
      }
      
      console.log(`⏸️  Aguardando ${leaveAfter}ms antes de desconectar...`);
      await this.delay(leaveAfter);
      
      console.log(`👋 Desconectando do canal...`);
      await this.leaveChannel(channel.guildId);
      
      console.log('✅ Anúncio concluído');
    } catch (error) {
      console.error('❌ Erro ao fazer anúncio:', error);
      await this.leaveChannel(channel.guildId);
    }
  }

  private async connectToChannel(channel: VoiceBasedChannel): Promise<VoiceConnection> {
    const existingConnection = this.activeConnections.get(channel.guildId);
    
    if (existingConnection && existingConnection.state.status !== VoiceConnectionStatus.Destroyed) {
      return existingConnection;
    }

    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guildId,
      adapterCreator: channel.guild.voiceAdapterCreator as any,
    });

    try {
      await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
      this.activeConnections.set(channel.guildId, connection);
      console.log(`✅ Conectado ao canal de voz: ${channel.name}`);
      return connection;
    } catch (error) {
      connection.destroy();
      throw error;
    }
  }

  private async playAudio(player: AudioPlayer, audioPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const resource = createAudioResource(audioPath);
      
      player.play(resource);
      
      const onIdle = () => {
        cleanup();
        resolve();
      };
      
      const onError = (error: Error) => {
        cleanup();
        reject(error);
      };
      
      const cleanup = () => {
        player.off(AudioPlayerStatus.Idle, onIdle);
        player.off('error', onError);
      };
      
      player.once(AudioPlayerStatus.Idle, onIdle);
      player.once('error', onError);
    });
  }

  private async leaveChannel(guildId: string): Promise<void> {
    const connection = this.activeConnections.get(guildId);
    
    if (connection) {
      connection.destroy();
      this.activeConnections.delete(guildId);
      console.log('👋 Desconectado do canal de voz');
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async leaveAllChannels(): Promise<void> {
    for (const [guildId] of this.activeConnections) {
      await this.leaveChannel(guildId);
    }
  }

  getActiveConnections(): string[] {
    return Array.from(this.activeConnections.keys());
  }
}

export const voiceService = new VoiceService();

