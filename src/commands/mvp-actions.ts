import { SlashCommandBuilder, ChatInputCommandInteraction, ChannelType } from 'discord.js';
import { mvpService } from '../services/mvp.service';
import { voiceService } from '../services/voice.service';
import { timerService } from '../services/timer.service';
import { Command, replyError, replySuccess } from './registry';
import { config } from '../config';

export const mvpAnnounceCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('mvp-announce')
    .setDescription('Anuncia que um MVP vai nascer em um horário específico')
    .addStringOption(option =>
      option
        .setName('nome')
        .setDescription('Nome do MVP')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption(option =>
      option
        .setName('horario')
        .setDescription('Horário que o MVP vai nascer (ex: 21:30 ou 14:45)')
        .setRequired(true)
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    try {
      const nome = interaction.options.getString('nome', true);
      const horarioStr = interaction.options.getString('horario', true);
      
      let mvp = await mvpService.getMVPByName(nome);
      
      if (!mvp) {
        console.log(`📝 MVP "${nome}" não encontrado. Criando automaticamente...`);
        
        mvp = await mvpService.createMVP({
          name: nome,
          map: 'Não especificado',
          respawnTimeMinutes: 180,
          priority: 5,
        });
        
        console.log(`✅ MVP "${nome}" criado automaticamente!`);
      }

      const horarioMatch = horarioStr.match(/^(\d{1,2}):(\d{2})$/);
      if (!horarioMatch) {
        await replyError(
          interaction,
          '❌ Formato de horário inválido! Use: HH:MM (ex: 21:30, 14:45)'
        );
        return;
      }

      const horas = parseInt(horarioMatch[1], 10);
      const minutos = parseInt(horarioMatch[2], 10);

      if (horas < 0 || horas > 23 || minutos < 0 || minutos > 59) {
        await replyError(
          interaction,
          '❌ Horário inválido! Horas: 0-23, Minutos: 0-59'
        );
        return;
      }

      const now = new Date();
      const respawnTime = new Date();
      respawnTime.setHours(horas, minutos, 0, 0);

      if (respawnTime <= now) {
        respawnTime.setDate(respawnTime.getDate() + 1);
      }

      const timeUntilRespawn = respawnTime.getTime() - now.getTime();
      const minutesUntilRespawn = Math.floor(timeUntilRespawn / 1000 / 60);

      if (minutesUntilRespawn < 1) {
        await replyError(
          interaction,
          '❌ O horário informado já passou ou é muito próximo!'
        );
        return;
      }

      let voiceChannel = null;
      
      if (interaction.guild) {
        const channels = interaction.guild.channels.cache.filter(
          ch => ch.isVoiceBased() && ch.joinable
        );
        
        let maxMembers = 0;
        let channelWithMostMembers = null;
        
        for (const [, channel] of channels) {
          if (channel.isVoiceBased()) {
            const memberCount = channel.members?.size || 0;
            if (memberCount > maxMembers) {
              maxMembers = memberCount;
              channelWithMostMembers = channel;
            }
          }
        }
        
        if (channelWithMostMembers) {
          voiceChannel = channelWithMostMembers;
          console.log(`🎯 Canal com mais membros: ${voiceChannel.name} (${maxMembers} membros)`);
        } else {
          const firstVoiceChannel = channels.first();
          if (firstVoiceChannel?.isVoiceBased()) {
            voiceChannel = firstVoiceChannel;
            console.log(`🎯 Usando primeiro canal disponível: ${voiceChannel.name}`);
          }
        }
      }

      if (!voiceChannel) {
        await replyError(
          interaction,
          '❌ Nenhum canal de voz disponível neste servidor!'
        );
        return;
      }

      const spawn = await mvpService.spawnMVPWithTime(mvp.id, respawnTime, {
        userId: interaction.user.id,
        username: interaction.user.username,
        autoTimer: true,
      });

      await timerService.startTimer({ ...spawn, mvp });

      if (interaction.guild && config.discord.textChannelId) {
        try {
          const textChannel = await interaction.guild.channels.fetch(config.discord.textChannelId);
          
          if (textChannel?.isTextBased()) {
            const mapInfo = mvp.map ? `\n🗺️ **Mapa:** ${mvp.map}` : '';
            await textChannel.send({
              content: `🔔 **ALERTA DE MVP** 🔔\n\n` +
                       `📍 **${mvp.name}** vai nascer às **${horarioStr}**!` +
                       mapInfo +
                       `\n⭐ **Prioridade:** ${mvp.priority}/10\n` +
                       `⏲️ **Horário do respawn:** <t:${Math.floor(spawn.expectedRespawn!.getTime() / 1000)}:t>\n` +
                       `📅 **Data:** <t:${Math.floor(spawn.expectedRespawn!.getTime() / 1000)}:D>\n` +
                       `⏰ **Faltam:** ${minutesUntilRespawn} minutos`,
            });
            console.log(`📝 Mensagem enviada para o canal de texto configurado`);
          }
        } catch (error) {
          console.error('❌ Erro ao enviar mensagem no canal de texto:', error);
        }
      }

      const announceTime = new Date(respawnTime.getTime() - 5 * 60 * 1000);
      await replySuccess(
        interaction,
        `✅ MVP **${mvp.name}** agendado para **${horarioStr}**!\n` +
        `⏲️ Horário de respawn: <t:${Math.floor(respawnTime.getTime() / 1000)}:t>\n` +
        `📢 Anúncio será feito às: <t:${Math.floor(announceTime.getTime() / 1000)}:t>\n` +
        `⏰ Faltam **${minutesUntilRespawn} minutos**`
      );
    } catch (error) {
      console.error('Erro ao anunciar MVP:', error);
      await replyError(interaction, 'Erro ao anunciar MVP. Tente novamente.');
    }
  },
};

export const mvpStatusCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('mvp-status')
    .setDescription('Mostra status dos MVPs ativos') as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    try {
      const activeSpawns = await mvpService.getActiveSpawns();
      const upcomingRespawns = await mvpService.getUpcomingRespawns();

      if (activeSpawns.length === 0 && upcomingRespawns.length === 0) {
        await interaction.followUp({
          content: '📊 Nenhum MVP ativo no momento.',
        });
        return;
      }

      let response = '📊 **Status dos MVPs**\n\n';

      if (activeSpawns.length > 0) {
        response += '🔴 **MVPs Vivos:**\n';
        for (const spawn of activeSpawns) {
          const timeAgo = Math.floor((Date.now() - spawn.spawnedAt.getTime()) / 1000 / 60);
          response += `• **${spawn.mvp.name}** (${spawn.mvp.map})\n`;
          response += `  Vivo há ${timeAgo} minutos\n`;
          
          if (spawn.expectedRespawn) {
            response += `  Respawn previsto: <t:${Math.floor(spawn.expectedRespawn.getTime() / 1000)}:R>\n`;
          }
        }
        response += '\n';
      }

      if (upcomingRespawns.length > 0) {
        response += '⏰ **Próximos Respawns:**\n';
        for (const spawn of upcomingRespawns.slice(0, 10)) {
          if (spawn.expectedRespawn) {
            response += `• **${spawn.mvp.name}**: <t:${Math.floor(spawn.expectedRespawn.getTime() / 1000)}:R>\n`;
          }
        }
      }

      await interaction.followUp(response);
    } catch (error) {
      console.error('Erro ao buscar status:', error);
      await replyError(interaction, 'Erro ao buscar status. Tente novamente.');
    }
  },
};

export const mvpHistoryCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('mvp-history')
    .setDescription('Mostra histórico de spawns')
    .addIntegerOption(option =>
      option
        .setName('limite')
        .setDescription('Número de registros para mostrar')
        .setMinValue(5)
        .setMaxValue(50)
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    try {
      const limite = interaction.options.getInteger('limite') ?? 20;
      
      const history = await mvpService.getSpawnHistory(limite);

      if (history.length === 0) {
        await interaction.followUp({
          content: '📜 Nenhum histórico de spawns ainda.',
        });
        return;
      }

      let response = `📜 **Histórico de Spawns (${history.length})**\n\n`;

      for (const spawn of history) {
        const timestamp = `<t:${Math.floor(spawn.spawnedAt.getTime() / 1000)}:f>`;
        const status = spawn.killedAt ? '💀' : '✅';
        
        response += `${status} **${spawn.mvp.name}** - ${timestamp}\n`;
        
        if (spawn.username) {
          response += `   Anunciado por: ${spawn.username}\n`;
        }
        
        response += '\n';

        if (response.length > 1800) {
          await interaction.followUp(response);
          response = '';
        }
      }

      if (response) {
        await interaction.followUp(response);
      }
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
      await replyError(interaction, 'Erro ao buscar histórico. Tente novamente.');
    }
  },
};

export const mvpTimersCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('mvp-timers')
    .setDescription('Mostra timers ativos') as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    try {
      const timers = timerService.getActiveTimers();

      if (timers.length === 0) {
        await interaction.followUp({
          content: '⏰ Nenhum timer ativo no momento.',
        });
        return;
      }

      let response = `⏰ **Timers Ativos (${timers.length})**\n\n`;

      const sortedTimers = timers.sort(
        (a, b) => a.expectedRespawn.getTime() - b.expectedRespawn.getTime()
      );

      for (const timer of sortedTimers) {
        const timestamp = `<t:${Math.floor(timer.expectedRespawn.getTime() / 1000)}:R>`;
        response += `• **${timer.mvpName}**: ${timestamp}\n`;
      }

      await interaction.followUp(response);
    } catch (error) {
      console.error('Erro ao buscar timers:', error);
      await replyError(interaction, 'Erro ao buscar timers. Tente novamente.');
    }
  },
};

