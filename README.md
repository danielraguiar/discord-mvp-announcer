# 🎮 Discord MVP Announcer

Bot de Discord multi-servidor para anunciar MVPs de Ragnarok Online por voz com sistema de horários.

## ✨ Funcionalidades

- 🔊 Anúncios de voz em PT-BR (TTS)
- 🎤 Mensagens customizadas ou padrão
- 🌍 Suporta múltiplos servidores
- 🎯 Entra automaticamente no canal com mais usuários
- 🕐 Sistema de horários (ex: 21:30)
- ⏰ Anúncio automático 5 minutos antes do respawn
- 📝 Mensagens em canal de texto (opcional)
- 🔄 Criação automática de MVPs
- 📊 Histórico e status de MVPs

## 🚀 Instalação Rápida

### Windows
```bash
setup.bat
```

### Linux/Mac
```bash
chmod +x setup.sh
./setup.sh
```

## ⚙️ Configuração

### 1. Obter Token do Discord

1. Acesse https://discord.com/developers/applications
2. Crie uma aplicação → Bot → Copie o Token
3. Em "Privileged Gateway Intents" ative:
   - ✅ PRESENCE INTENT
   - ✅ SERVER MEMBERS INTENT
   - ✅ MESSAGE CONTENT INTENT

### 2. Adicionar Bot aos Servidores

1. OAuth2 → URL Generator
2. Marque: `bot` e `applications.commands`
3. Permissões: View Channels, Send Messages, Connect, Speak
4. Cole a URL no navegador e adicione aos servidores desejados

### 3. Configurar .env

```env
DISCORD_TOKEN=seu_token_aqui
TEXT_CHANNEL_ID=id_do_canal_texto_opcional
DATABASE_URL="file:./dev.db"
TIMEZONE=America/Sao_Paulo
```

**TIMEZONE (Obrigatório):**
- Define o fuso horário usado pelo bot
- Local: `America/Sao_Paulo` (Brasília)
- Render: `America/Sao_Paulo` (mesmo que local)
- Padrão se não configurado: `America/Sao_Paulo`

**Opcional - TEXT_CHANNEL_ID:**
- Se configurado: mensagens vão para esse canal específico
- Se vazio: mensagens não são enviadas em texto (só voz)

**Como obter ID do canal:**
- Ative Modo Desenvolvedor no Discord (Configurações → Avançado)
- Clique direito no canal → Copiar ID

### 4. Instalar FFmpeg

**Windows (Chocolatey):**
```bash
choco install ffmpeg
```

**Linux:**
```bash
sudo apt install ffmpeg
```

**Mac:**
```bash
brew install ffmpeg
```

### 5. Iniciar

```bash
npm install
npm run db:generate
npm run db:push
npm run dev
```

## 📝 Comandos

### Agendamento de MVP (Principal)
```bash
/mvp-announce nome:Baphomet horario:21:30
/mvp-announce nome:Gryphon horario:14:45 mensagem:Atenção! Gryphon vai nascer em 5 minutos!
```
- Cria MVP automaticamente se não existir
- Bot encontra canal de voz com mais usuários
- Agenda anúncio para 5 minutos antes (21:25)
- **NÃO anuncia imediatamente**, só agenda
- **mensagem** (opcional): Mensagem customizada para o TTS

**Mensagem Padrão (se não especificar):**
> "Daqui 5 minutos o MVP [nome] vai nascer!"

### Gerenciamento (Opcional)
```bash
/mvp-add nome:Gryphon mapa:Prontera prioridade:10 mensagem:Gryphon está chegando!
/mvp-edit nome:Gryphon prioridade:8 mensagem:Nova mensagem!
/mvp-remove nome:Gryphon
/mvp-list
```
- **mensagem** (opcional em ambos): Mensagem personalizada para o TTS

### Consultas
```bash
/mvp-status
/mvp-timers
/mvp-history
```

## 🎯 Fluxo de Uso

```
1. /mvp-announce nome:Baphomet horario:21:30 mensagem:Atenção! Baphomet vai nascer!
2. Bot agenda o anúncio (não anuncia agora)
3. Às 21:25: Bot procura canal com mais usuários
4. Bot entra no canal e anuncia 1x por voz (mensagem customizada ou padrão)
5. Mensagem enviada no canal de texto (se TEXT_CHANNEL_ID configurado)
```

**Se não especificar mensagem, usa o padrão:**
> "Daqui 5 minutos o MVP Baphomet vai nascer!"

## 🎤 Sistema de Canais de Voz

O bot procura canal nesta ordem:
1. **Canal com MAIS usuários online** (prioridade)
2. Se nenhum canal tiver usuários: **primeiro canal disponível**
3. Funciona em **qualquer servidor** onde o bot esteja

**Não precisa:**
- ❌ Estar em canal de voz
- ❌ Ter usuários online
- ❌ Configurar canal específico

## 🌍 Multi-Servidor

- Bot funciona em **todos os servidores** simultaneamente
- Cada servidor tem seus próprios MVPs e timers
- Comandos aparecem **automaticamente** em todos os servidores

## 🔧 Troubleshooting

### Bot não conecta
- Verifique `DISCORD_TOKEN` no .env

### Comandos não aparecem
- Comandos globais levam **até 1 hora** para aparecer
- Recarregue Discord (Ctrl+R)
- Aguarde e tente novamente

### Sem áudio
- Verifique se FFmpeg está instalado: `ffmpeg -version`
- Certifique-se que o bot tem permissão "Connect" e "Speak"

### Bot não entra no canal
- Verifique permissões do bot no servidor
- Certifique-se que há pelo menos 1 canal de voz disponível

### Erro de criptografia
- Execute: `npm install @discordjs/voice@0.18.0 sodium-native`

## 📦 Tecnologias

- TypeScript
- Discord.js v14
- Prisma + SQLite
- @discordjs/voice
- FFmpeg
- Google TTS API

## 📄 Licença

MIT License

---

**Desenvolvido para a comunidade de Ragnarok Online**
