#!/bin/bash

echo "========================================"
echo "Discord MVP Announcer - Setup Linux/Mac"
echo "========================================"
echo ""

echo "[1/5] Instalando dependências..."
npm install
if [ $? -ne 0 ]; then
    echo "ERRO: Falha ao instalar dependências!"
    exit 1
fi
echo ""

echo "[2/5] Configurando arquivo .env..."
if [ ! -f .env ]; then
    cat > .env << 'EOF'
DATABASE_URL="file:./dev.db"
DISCORD_TOKEN=
GUILD_ID=
VOICE_CHANNEL_ID=
ANNOUNCEMENT_REPEAT_COUNT=3
ANNOUNCEMENT_REPEAT_DELAY_MS=2000
ANNOUNCEMENT_VOICE_DELAY_MS=5000
EOF
    echo "Arquivo .env criado!"
    echo ""
    echo "IMPORTANTE: Edite o arquivo .env e preencha:"
    echo "- DISCORD_TOKEN (obtenha em https://discord.com/developers/applications)"
    echo "- GUILD_ID (ID do seu servidor Discord)"
    echo ""
    read -p "Pressione Enter para editar o .env..."
    ${EDITOR:-nano} .env
else
    echo "Arquivo .env já existe, pulando..."
fi
echo ""

echo "[3/5] Gerando Prisma Client..."
npm run db:generate
if [ $? -ne 0 ]; then
    echo "ERRO: Falha ao gerar Prisma Client!"
    exit 1
fi
echo ""

echo "[4/5] Criando banco de dados..."
npm run db:push
if [ $? -ne 0 ]; then
    echo "ERRO: Falha ao criar banco de dados!"
    exit 1
fi
echo ""

echo "[5/5] Verificando FFmpeg..."
if ! command -v ffmpeg &> /dev/null; then
    echo ""
    echo "AVISO: FFmpeg não encontrado!"
    echo "O bot precisa do FFmpeg para funcionalidades de voz."
    echo ""
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "Instale com:"
        echo "  sudo apt update && sudo apt install ffmpeg"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        echo "Instale com Homebrew:"
        echo "  brew install ffmpeg"
    fi
    echo ""
else
    echo "FFmpeg encontrado!"
fi
echo ""

echo "========================================"
echo "Setup concluído!"
echo "========================================"
echo ""
echo "Próximos passos:"
echo "1. Certifique-se de que o arquivo .env está configurado"
echo "2. Execute: npm run dev"
echo "3. O bot deve conectar e registrar os comandos!"
echo ""
echo "Documentação:"
echo "- README.md - Guia completo"
echo "- QUICKSTART.md - Comandos básicos"
echo "- SETUP.md - Guia detalhado de setup"
echo ""

