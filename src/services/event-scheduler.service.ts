import { Client, TextChannel, VoiceBasedChannel } from 'discord.js';
import { voiceService } from './voice.service';
import { config } from '../config';

interface EventSchedule {
  hour: number;   // Brasília (UTC-3)
  minute: number;
}

interface GameEvent {
  name: string;
  emoji: string;
  schedules: EventSchedule[];
}

// Brasília is permanently UTC-3 (no DST since 2019)
const SP_UTC_OFFSET_HOURS = 3;
const ANNOUNCEMENT_ADVANCE_MINUTES = 5;

const GAME_EVENTS: GameEvent[] = [
  {
    name: 'Corrida dos Porings',
    emoji: '🏃',
    schedules: [
      { hour: 0, minute: 30 },
      { hour: 9, minute: 30 },
      { hour: 13, minute: 0 },
      { hour: 16, minute: 30 },
      { hour: 19, minute: 30 },
      { hour: 23, minute: 0 },
    ],
  },
  {
    name: 'Encontre o Poring',
    emoji: '🔍',
    schedules: [
      { hour: 1, minute: 0 },
      { hour: 10, minute: 30 },
      { hour: 13, minute: 30 },
      { hour: 17, minute: 0 },
      { hour: 20, minute: 30 },
      { hour: 23, minute: 30 },
    ],
  },
  {
    name: 'Menor e Único',
    emoji: '1️⃣',
    schedules: [
      { hour: 1, minute: 30 },
      { hour: 11, minute: 0 },
      { hour: 14, minute: 30 },
      { hour: 17, minute: 30 },
      { hour: 21, minute: 0 },
    ],
  },
  {
    name: 'Sortudo',
    emoji: '🍀',
    schedules: [
      { hour: 8, minute: 30 },
      { hour: 11, minute: 30 },
      { hour: 15, minute: 0 },
      { hour: 18, minute: 30 },
      { hour: 21, minute: 30 },
    ],
  },
  {
    name: 'Guerra dos Tesouros',
    emoji: '💰',
    schedules: [
      { hour: 0, minute: 0 },
      { hour: 2, minute: 0 },
      { hour: 4, minute: 0 },
      { hour: 6, minute: 0 },
      { hour: 8, minute: 0 },
      { hour: 10, minute: 0 },
      { hour: 12, minute: 0 },
      { hour: 14, minute: 0 },
      { hour: 16, minute: 0 },
      { hour: 18, minute: 0 },
      { hour: 20, minute: 0 },
      { hour: 22, minute: 0 },
    ],
  },
  {
    name: 'Sobrevivente',
    emoji: '⚔️',
    schedules: [
      { hour: 9, minute: 0 },
      { hour: 12, minute: 30 },
      { hour: 15, minute: 30 },
      { hour: 19, minute: 0 },
      { hour: 22, minute: 30 },
    ],
  },
];

export class EventSchedulerService {
  private client: Client | null = null;
  private timeouts: NodeJS.Timeout[] = [];

  setClient(client: Client): void {
    this.client = client;
  }

  startScheduler(): void {
    console.log('📅 Iniciando agendador de eventos do servidor...');

    for (const event of GAME_EVENTS) {
      for (const schedule of event.schedules) {
        this.scheduleNextOccurrence(event, schedule);
      }
    }

    const totalSchedules = GAME_EVENTS.reduce((sum, e) => sum + e.schedules.length, 0);
    console.log(`✅ ${totalSchedules} horários agendados para ${GAME_EVENTS.length} eventos`);
  }

  private scheduleNextOccurrence(event: GameEvent, schedule: EventSchedule): void {
    const nextEventTime = this.getNextEventUTC(schedule.hour, schedule.minute);
    const announceTime = new Date(nextEventTime.getTime() - ANNOUNCEMENT_ADVANCE_MINUTES * 60 * 1000);
    const now = new Date();

    // If announcement time already passed (event starting very soon), announce immediately
    const delay = Math.max(0, announceTime.getTime() - now.getTime());

    const timeout = setTimeout(async () => {
      await this.handleEventAnnouncement(event, schedule);
    }, delay);

    this.timeouts.push(timeout);

    const minutesUntil = Math.round(delay / 60000);
    const timeStr = `${String(schedule.hour).padStart(2, '0')}:${String(schedule.minute).padStart(2, '0')}`;
    if (minutesUntil > 0) {
      console.log(`⏰ "${event.name}" (${timeStr} Brasília) - próximo aviso em ${minutesUntil} min`);
    }
  }

  private async handleEventAnnouncement(event: GameEvent, schedule: EventSchedule): Promise<void> {
    try {
      console.log(`🔔 Anunciando evento: ${event.emoji} ${event.name}`);

      const voiceChannel = await this.findVoiceChannelWithMembers();

      if (voiceChannel) {
        const text = `Atenção! O evento ${event.name} começa em ${ANNOUNCEMENT_ADVANCE_MINUTES} minutos!`;

        await voiceService.announce({
          text,
          channel: voiceChannel,
          repeatCount: 1,
          repeatDelay: 2000,
          leaveAfter: 3000,
        });
      } else {
        console.log(`⚠️  Nenhum canal de voz com membros para anunciar ${event.name}`);
      }

      await this.sendTextNotification(event, schedule);
    } catch (error) {
      console.error(`❌ Erro ao anunciar evento ${event.name}:`, error);
    } finally {
      // Always schedule the next occurrence regardless of errors
      this.scheduleNextOccurrence(event, schedule);
    }
  }

  private async sendTextNotification(event: GameEvent, schedule: EventSchedule): Promise<void> {
    if (!this.client || !config.discord.textChannelId) return;

    try {
      const channel = await this.client.channels.fetch(config.discord.textChannelId);
      if (channel?.isTextBased()) {
        const timeStr = `${String(schedule.hour).padStart(2, '0')}:${String(schedule.minute).padStart(2, '0')}`;
        await (channel as TextChannel).send(
          `${event.emoji} **${event.name}** começa em **${ANNOUNCEMENT_ADVANCE_MINUTES} minutos**! ⏰ ${timeStr} (Brasília)`
        );
      }
    } catch (error) {
      console.error(`❌ Erro ao enviar notificação de texto para evento ${event.name}:`, error);
    }
  }

  // SP is UTC-3; UTC = SP + 3h. Brazil abolished DST in 2019 so offset is constant.
  private getNextEventUTC(hour: number, minute: number): Date {
    const utcHour = (hour + SP_UTC_OFFSET_HOURS) % 24;

    const now = new Date();
    const candidate = new Date(now);
    candidate.setUTCHours(utcHour, minute, 0, 0);

    // If this occurrence is already in the past, schedule for the next day
    if (candidate.getTime() <= now.getTime()) {
      candidate.setUTCDate(candidate.getUTCDate() + 1);
    }

    return candidate;
  }

  private async findVoiceChannelWithMembers(): Promise<VoiceBasedChannel | null> {
    if (!this.client) return null;

    let bestChannel: VoiceBasedChannel | null = null;
    let maxMembers = 0;

    for (const guild of this.client.guilds.cache.values()) {
      for (const channel of guild.channels.cache.values()) {
        if (channel.isVoiceBased() && channel.joinable) {
          const memberCount = channel.members?.size || 0;
          if (memberCount > maxMembers) {
            maxMembers = memberCount;
            bestChannel = channel as VoiceBasedChannel;
          }
        }
      }
    }

    if (bestChannel) {
      console.log(`🎯 Canal selecionado: ${bestChannel.name} (${maxMembers} membros)`);
    }

    return bestChannel;
  }

  stopScheduler(): void {
    for (const timeout of this.timeouts) {
      clearTimeout(timeout);
    }
    this.timeouts = [];
    console.log('⏹️  Agendador de eventos parado');
  }
}

export const eventSchedulerService = new EventSchedulerService();
