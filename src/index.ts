import { validateConfig } from './config';
import { connectDatabase, disconnectDatabase } from './database/client';
import { DiscordBot } from './bot/client';

async function main() {
  console.log('🚀 Iniciando Discord MVP Announcer...\n');

  try {
    console.log('🔍 Validando configuração...');
    validateConfig();
    console.log('✅ Configuração válida\n');

    console.log('🔌 Conectando ao banco de dados...');
    await connectDatabase();
    console.log('');

    console.log('🤖 Inicializando bot do Discord...');
    const bot = new DiscordBot();
    await bot.start();
    console.log('');

    const shutdown = async (signal: string) => {
      console.log(`\n📡 Sinal ${signal} recebido. Encerrando gracefully...`);
      
      try {
        await bot.stop();
        await disconnectDatabase();
        console.log('👋 Aplicação encerrada com sucesso');
        process.exit(0);
      } catch (error) {
        console.error('❌ Erro ao encerrar:', error);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    process.on('unhandledRejection', (error) => {
      console.error('❌ Promise rejection não tratada:', error);
    });

    process.on('uncaughtException', (error) => {
      console.error('❌ Exception não capturada:', error);
      shutdown('UNCAUGHT_EXCEPTION');
    });

    console.log('✅ Bot está online e pronto para uso!\n');
    console.log('📋 Comandos disponíveis:');
    console.log('   • /mvp-add - Adiciona um novo MVP');
    console.log('   • /mvp-edit - Edita um MVP existente');
    console.log('   • /mvp-remove - Remove um MVP');
    console.log('   • /mvp-list - Lista todos os MVPs');
    console.log('   • /mvp-announce - Anuncia um MVP vivo');
    console.log('   • /mvp-status - Mostra MVPs ativos');
    console.log('   • /mvp-history - Histórico de spawns');
    console.log('   • /mvp-timers - Timers ativos');
    console.log('');

  } catch (error) {
    console.error('❌ Erro fatal ao iniciar aplicação:', error);
    process.exit(1);
  }
}

main();

