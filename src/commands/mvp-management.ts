import { SlashCommandBuilder, CommandInteraction, PermissionFlagsBits } from 'discord.js';
import { mvpService } from '../services/mvp.service';
import { Command, replyError, replySuccess } from './registry';

export const mvpAddCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('mvp-add')
    .setDescription('Adiciona um novo MVP ao sistema')
    .addStringOption(option =>
      option
        .setName('nome')
        .setDescription('Nome do MVP')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('mapa')
        .setDescription('Mapa onde o MVP aparece (opcional)')
    )
    .addIntegerOption(option =>
      option
        .setName('prioridade')
        .setDescription('Prioridade do MVP (0-10, maior = mais importante)')
        .setMinValue(0)
        .setMaxValue(10)
    )
    .addStringOption(option =>
      option
        .setName('mensagem')
        .setDescription('Mensagem personalizada para o anúncio')
    ) as SlashCommandBuilder,

  async execute(interaction: CommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const nome = interaction.options.get('nome')?.value as string;
      const mapa = interaction.options.get('mapa')?.value as string | undefined;
      const prioridade = (interaction.options.get('prioridade')?.value as number) ?? 0;
      const mensagem = interaction.options.get('mensagem')?.value as string | undefined;

      const existing = await mvpService.getMVPByName(nome);
      if (existing) {
        await replyError(interaction, `MVP "${nome}" já existe no sistema!`);
        return;
      }

      const mvp = await mvpService.createMVP({
        name: nome,
        map: mapa || 'Não especificado',
        respawnTimeMinutes: 180,
        priority: prioridade,
        customMessage: mensagem,
      });

      await replySuccess(
        interaction,
        `MVP **${mvp.name}** adicionado com sucesso!\n` +
        (mapa ? `📍 Mapa: ${mvp.map}\n` : '') +
        `⭐ Prioridade: ${mvp.priority}`
      );
    } catch (error) {
      console.error('Erro ao adicionar MVP:', error);
      await replyError(interaction, 'Erro ao adicionar MVP. Tente novamente.');
    }
  },
};

export const mvpEditCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('mvp-edit')
    .setDescription('Edita um MVP existente')
    .addStringOption(option =>
      option
        .setName('nome')
        .setDescription('Nome do MVP para editar')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption(option =>
      option
        .setName('novo-nome')
        .setDescription('Novo nome do MVP')
    )
    .addStringOption(option =>
      option
        .setName('mapa')
        .setDescription('Novo mapa')
    )
    .addIntegerOption(option =>
      option
        .setName('respawn')
        .setDescription('Novo tempo de respawn em minutos')
        .setMinValue(1)
    )
    .addIntegerOption(option =>
      option
        .setName('prioridade')
        .setDescription('Nova prioridade (0-10)')
        .setMinValue(0)
        .setMaxValue(10)
    )
    .addStringOption(option =>
      option
        .setName('mensagem')
        .setDescription('Nova mensagem personalizada')
    ) as SlashCommandBuilder,

  async execute(interaction: CommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const nome = interaction.options.get('nome')?.value as string;
      
      const mvp = await mvpService.getMVPByName(nome);
      if (!mvp) {
        await replyError(interaction, `MVP "${nome}" não encontrado!`);
        return;
      }

      const updates: any = {};
      
      const novoNome = interaction.options.get('novo-nome')?.value as string | undefined;
      const mapa = interaction.options.get('mapa')?.value as string | undefined;
      const respawn = interaction.options.get('respawn')?.value as number | undefined;
      const prioridade = interaction.options.get('prioridade')?.value as number | undefined;
      const mensagem = interaction.options.get('mensagem')?.value as string | undefined;

      if (novoNome) updates.name = novoNome;
      if (mapa) updates.map = mapa;
      if (respawn) updates.respawnTimeMinutes = respawn;
      if (prioridade !== undefined) updates.priority = prioridade;
      if (mensagem) updates.customMessage = mensagem;

      if (Object.keys(updates).length === 0) {
        await replyError(interaction, 'Nenhuma alteração foi especificada!');
        return;
      }

      const updated = await mvpService.updateMVP(mvp.id, updates);

      await replySuccess(
        interaction,
        `MVP **${updated.name}** atualizado com sucesso!`
      );
    } catch (error) {
      console.error('Erro ao editar MVP:', error);
      await replyError(interaction, 'Erro ao editar MVP. Tente novamente.');
    }
  },
};

export const mvpRemoveCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('mvp-remove')
    .setDescription('Remove um MVP do sistema')
    .addStringOption(option =>
      option
        .setName('nome')
        .setDescription('Nome do MVP para remover')
        .setRequired(true)
        .setAutocomplete(true)
    ) as SlashCommandBuilder,

  async execute(interaction: CommandInteraction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const nome = interaction.options.get('nome')?.value as string;
      
      const mvp = await mvpService.getMVPByName(nome);
      if (!mvp) {
        await replyError(interaction, `MVP "${nome}" não encontrado!`);
        return;
      }

      await mvpService.deleteMVP(mvp.id);

      await replySuccess(
        interaction,
        `MVP **${mvp.name}** removido com sucesso!`
      );
    } catch (error) {
      console.error('Erro ao remover MVP:', error);
      await replyError(interaction, 'Erro ao remover MVP. Tente novamente.');
    }
  },
};

export const mvpListCommand: Command = {
  data: new SlashCommandBuilder()
    .setName('mvp-list')
    .setDescription('Lista todos os MVPs cadastrados')
    .addBooleanOption(option =>
      option
        .setName('apenas-ativos')
        .setDescription('Mostrar apenas MVPs ativos')
    ) as SlashCommandBuilder,

  async execute(interaction: CommandInteraction) {
    await interaction.deferReply();

    try {
      const apenasAtivos = (interaction.options.get('apenas-ativos')?.value as boolean) ?? false;
      
      const mvps = await mvpService.getAllMVPs(apenasAtivos);

      if (mvps.length === 0) {
        await interaction.followUp({
          content: '📋 Nenhum MVP cadastrado ainda.',
          ephemeral: true,
        });
        return;
      }

      const lines = mvps.map((mvp, idx) => {
        const status = mvp.isActive ? '✅' : '❌';
        const priority = '⭐'.repeat(Math.min(mvp.priority, 5));
        return (
          `${idx + 1}. ${status} **${mvp.name}** ${priority}\n` +
          `   📍 ${mvp.map} | ⏱️ ${mvp.respawnTimeMinutes}min`
        );
      });

      const chunks: string[] = [];
      let currentChunk = `📋 **MVPs Cadastrados (${mvps.length})**\n\n`;

      for (const line of lines) {
        if ((currentChunk + line).length > 1900) {
          chunks.push(currentChunk);
          currentChunk = '';
        }
        currentChunk += line + '\n';
      }

      if (currentChunk) {
        chunks.push(currentChunk);
      }

      for (const chunk of chunks) {
        await interaction.followUp(chunk);
      }
    } catch (error) {
      console.error('Erro ao listar MVPs:', error);
      await replyError(interaction, 'Erro ao listar MVPs. Tente novamente.');
    }
  },
};

