@echo off
echo ========================================
echo Discord MVP Announcer - Setup Windows
echo ========================================
echo.

echo [1/5] Instalando dependencias...
call npm install
if errorlevel 1 (
    echo ERRO: Falha ao instalar dependencias!
    pause
    exit /b 1
)
echo.

echo [2/5] Configurando arquivo .env...
if not exist .env (
    echo DATABASE_URL="file:./dev.db" > .env
    echo DISCORD_TOKEN= >> .env
    echo GUILD_ID= >> .env
    echo VOICE_CHANNEL_ID= >> .env
    echo ANNOUNCEMENT_REPEAT_COUNT=3 >> .env
    echo ANNOUNCEMENT_REPEAT_DELAY_MS=2000 >> .env
    echo ANNOUNCEMENT_VOICE_DELAY_MS=5000 >> .env
    echo Arquivo .env criado!
    echo.
    echo IMPORTANTE: Edite o arquivo .env e preencha:
    echo - DISCORD_TOKEN (obtenha em https://discord.com/developers/applications)
    echo - GUILD_ID (ID do seu servidor Discord)
    echo.
    echo Pressione qualquer tecla para abrir o .env no Notepad...
    pause >nul
    notepad .env
) else (
    echo Arquivo .env ja existe, pulando...
)
echo.

echo [3/5] Gerando Prisma Client...
call npm run db:generate
if errorlevel 1 (
    echo ERRO: Falha ao gerar Prisma Client!
    pause
    exit /b 1
)
echo.

echo [4/5] Criando banco de dados...
call npm run db:push
if errorlevel 1 (
    echo ERRO: Falha ao criar banco de dados!
    pause
    exit /b 1
)
echo.

echo [5/5] Verificando FFmpeg...
where ffmpeg >nul 2>&1
if errorlevel 1 (
    echo.
    echo AVISO: FFmpeg nao encontrado!
    echo O bot precisa do FFmpeg para funcionalidades de voz.
    echo.
    echo Instale com Chocolatey:
    echo   choco install ffmpeg
    echo.
    echo Ou baixe manualmente de:
    echo   https://www.gyan.dev/ffmpeg/builds/
    echo.
) else (
    echo FFmpeg encontrado!
)
echo.

echo ========================================
echo Setup concluido!
echo ========================================
echo.
echo Proximos passos:
echo 1. Certifique-se de que o arquivo .env esta configurado
echo 2. Execute: npm run dev
echo 3. O bot deve conectar e registrar os comandos!
echo.
echo Documentacao:
echo - README.md - Guia completo
echo - QUICKSTART.md - Comandos basicos
echo - SETUP.md - Guia detalhado de setup
echo.
pause


