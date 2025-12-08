import {
  Client,
  GatewayIntentBits,
  Events,
  REST,
  Routes,
  CommandInteraction,
  AutocompleteInteraction,
} from 'discord.js';
import { config } from '../config';
import { commandRegistry } from '../commands/registry';
import { mvpService } from '../services/mvp.service';
import { timerService } from '../services/timer.service';

import {
  mvpAddCommand,
  mvpEditCommand,
  mvpRemoveCommand,
  mvpListCommand,
} from '../commands/mvp-management';

import {
  mvpAnnounceCommand,
  mvpStatusCommand,
  mvpHistoryCommand,
  mvpTimersCommand,
} from '../commands/mvp-actions';

export class DiscordBot {
  public client: Client;
  private rest: REST;

  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
      ],
    });

    this.rest = new REST({ version: '10' }).setToken(config.discord.token);

    this.registerCommands();
    this.setupEventHandlers();
  }

  private registerCommands(): void {
    commandRegistry.register(mvpAddCommand);
    commandRegistry.register(mvpEditCommand);
    commandRegistry.register(mvpRemoveCommand);
    commandRegistry.register(mvpListCommand);

    commandRegistry.register(mvpAnnounceCommand);
    commandRegistry.register(mvpStatusCommand);
    commandRegistry.register(mvpHistoryCommand);
    commandRegistry.register(mvpTimersCommand);
  }

  private setupEventHandlers(): void {
    this.client.once(Events.ClientReady, async (client) => {
      console.log(`✅ Bot conectado como ${client.user.tag}`);
      
      timerService.setClient(this.client);
      
      await timerService.loadActiveTimers();
      
      await this.registerSlashCommands();
    });

    this.client.on(Events.InteractionCreate, async (interaction) => {
      if (interaction.isCommand()) {
        await this.handleCommand(interaction);
      } else if (interaction.isAutocomplete()) {
        await this.handleAutocomplete(interaction);
      }
    });

    this.client.on(Events.Error, (error) => {
      console.error('❌ Erro no cliente Discord:', error);
    });
  }

  private async registerSlashCommands(): Promise<void> {
    try {
      console.log('🔄 Registrando comandos slash globalmente...');

      const commands = commandRegistry.getAllData();

      await this.rest.put(
        Routes.applicationCommands(this.client.user!.id),
        { body: commands }
      );

      console.log(`✅ ${commands.length} comandos slash registrados globalmente!`);
    } catch (error) {
      console.error('❌ Erro ao registrar comandos slash:', error);
    }
  }

  private async handleCommand(interaction: CommandInteraction): Promise<void> {
    const command = commandRegistry.get(interaction.commandName);

    if (!command) {
      console.warn(`⚠️  Comando não encontrado: ${interaction.commandName}`);
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(`❌ Erro ao executar comando ${interaction.commandName}:`, error);

      const errorMessage = '❌ Ocorreu um erro ao executar este comando.';

      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ content: errorMessage, ephemeral: true });
        } else {
          await interaction.reply({ content: errorMessage, ephemeral: true });
        }
      } catch (replyError) {
        console.error('❌ Erro ao enviar mensagem de erro:', replyError);
      }
    }
  }

  private async handleAutocomplete(interaction: AutocompleteInteraction): Promise<void> {
    try {
      const focusedOption = interaction.options.getFocused(true);

      if (focusedOption.name === 'nome') {
        const mvps = await mvpService.getAllMVPs(true);
        const filtered = mvps
          .filter(mvp =>
            mvp.name.toLowerCase().includes(focusedOption.value.toLowerCase())
          )
          .slice(0, 25);

        await interaction.respond(
          filtered.map(mvp => ({
            name: `${mvp.name} (${mvp.map})`,
            value: mvp.name,
          }))
        );
      }
    } catch (error) {
      console.error('❌ Erro ao processar autocomplete:', error);
    }
  }

  async start(): Promise<void> {
    try {
      await this.client.login(config.discord.token);
    } catch (error) {
      console.error('❌ Erro ao conectar o bot:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    console.log('👋 Desconectando bot...');
    
    timerService.cancelAllTimers();
    
    await this.client.destroy();
    
    console.log('✅ Bot desconectado');
  }
}

