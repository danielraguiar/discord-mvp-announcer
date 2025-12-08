import { SlashCommandBuilder, ChatInputCommandInteraction, PermissionFlagsBits } from 'discord.js';

export interface Command {
  data: SlashCommandBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

export class CommandRegistry {
  private commands = new Map<string, Command>();

  register(command: Command): void {
    this.commands.set(command.data.name, command);
  }

  get(name: string): Command | undefined {
    return this.commands.get(name);
  }

  getAll(): Command[] {
    return Array.from(this.commands.values());
  }

  getAllData() {
    return this.getAll().map(cmd => cmd.data.toJSON());
  }
}

export const commandRegistry = new CommandRegistry();

export async function replyError(
  interaction: ChatInputCommandInteraction,
  message: string
): Promise<void> {
  const content = `❌ **Erro:** ${message}`;
  
  if (interaction.replied || interaction.deferred) {
    await interaction.followUp({ content, ephemeral: true });
  } else {
    await interaction.reply({ content, ephemeral: true });
  }
}

export async function replySuccess(
  interaction: ChatInputCommandInteraction,
  message: string,
  ephemeral = false
): Promise<void> {
  const content = `✅ ${message}`;
  
  if (interaction.replied || interaction.deferred) {
    await interaction.followUp({ content, ephemeral });
  } else {
    await interaction.reply({ content, ephemeral });
  }
}

