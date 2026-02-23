import { MVPSpawn } from '@prisma/client';
import { mvpService } from './mvp.service';
import { voiceService } from './voice.service';
import { Client } from 'discord.js';

export interface TimerInfo {
  spawnId: string;
  mvpName: string;
  expectedRespawn: Date;
  timeoutId: NodeJS.Timeout;
}

export class TimerService {
  private activeTimers = new Map<string, TimerInfo>();
  private client: Client | null = null;

  setClient(client: Client): void {
    this.client = client;
  }

  async startTimer(spawn: MVPSpawn & { mvp: any }): Promise<void> {
    if (!spawn.expectedRespawn) {
      return;
    }

    const now = new Date();
    const timeUntilRespawn = spawn.expectedRespawn.getTime() - now.getTime();
    
    const fiveMinutesInMs = 5 * 60 * 1000;
    const timeUntilAnnouncement = timeUntilRespawn - fiveMinutesInMs;

    if (timeUntilAnnouncement <= 0) {
      await this.handleRespawn(spawn);
      return;
    }

    const timeoutId = setTimeout(async () => {
      await this.handleRespawn(spawn);
    }, timeUntilAnnouncement);

    this.activeTimers.set(spawn.id, {
      spawnId: spawn.id,
      mvpName: spawn.mvp.name,
      expectedRespawn: spawn.expectedRespawn,
      timeoutId,
    });

    const minutesUntilAnnouncement = Math.round(timeUntilAnnouncement / 1000 / 60);
    console.log(
      `⏰ Timer iniciado para ${spawn.mvp.name} - Anúncio em ${minutesUntilAnnouncement} minutos (5 min antes do respawn)`
    );
  }

  private async handleRespawn(spawn: MVPSpawn & { mvp: any }): Promise<void> {
    try {
      console.log(`🔔 Anúncio de 5 minutos acionado para ${spawn.mvp.name}`);

      this.cancelTimer(spawn.id);

      const voiceChannel = await this.findVoiceChannelWithMembers();

      if (!voiceChannel) {
        console.log('⚠️  Nenhum canal de voz com membros encontrado');
        return;
      }

      const message = mvpService.formatAnnouncementMessage(spawn.mvp);
      
      await voiceService.announce({
        text: message,
        channel: voiceChannel,
        repeatCount: 1,
        repeatDelay: 2000,
        leaveAfter: 5000,
      });

      console.log(`✅ Anúncio de 5 minutos enviado para ${spawn.mvp.name}`);
    } catch (error) {
      console.error(`❌ Erro ao processar anúncio de ${spawn.mvp.name}:`, error);
    }
  }

  private async findVoiceChannelWithMembers() {
    if (!this.client) {
      return null;
    }

    let bestChannel = null;
    let maxMembers = 0;

    for (const guild of this.client.guilds.cache.values()) {
      for (const channel of guild.channels.cache.values()) {
        if (channel.isVoiceBased() && channel.joinable) {
          const memberCount = channel.members?.size || 0;
          
          if (memberCount > maxMembers) {
            maxMembers = memberCount;
            bestChannel = channel;
          } else if (!bestChannel && memberCount === 0) {
            bestChannel = channel;
          }
        }
      }
    }

    if (bestChannel) {
      console.log(`🎯 Canal selecionado: ${bestChannel.name} (${maxMembers} membros)`);
    }

    return bestChannel;
  }

  cancelTimer(spawnId: string): void {
    const timer = this.activeTimers.get(spawnId);
    if (timer) {
      clearTimeout(timer.timeoutId);
      this.activeTimers.delete(spawnId);
      console.log(`⏹️  Timer cancelado para ${timer.mvpName}`);
    }
  }

  cancelAllTimers(): void {
    for (const [spawnId] of this.activeTimers) {
      this.cancelTimer(spawnId);
    }
  }

  async loadActiveTimers(): Promise<void> {
    console.log('🔄 Carregando timers ativos...');
    
    const upcomingRespawns = await mvpService.getUpcomingRespawns();
    
    for (const spawn of upcomingRespawns) {
      await this.startTimer(spawn);
    }
    
    console.log(`✅ ${upcomingRespawns.length} timers carregados`);
  }

  getActiveTimers(): TimerInfo[] {
    return Array.from(this.activeTimers.values());
  }

  getTimerInfo(spawnId: string): TimerInfo | undefined {
    return this.activeTimers.get(spawnId);
  }
}

export const timerService = new TimerService();

