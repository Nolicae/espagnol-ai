@echo off
setlocal EnableDelayedExpansion

:: Check Ollama is installed
where ollama >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERREUR] Ollama n'est pas installe. Telecharge-le sur https://ollama.com
    pause
    exit /b 1
)

:: Check if Ollama is already running on port 11434
netstat -an | findstr ":11434" | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [OK] Ollama est deja en cours d'execution.
) else (
    echo [INFO] Demarrage d'Ollama...
    set OLLAMA_ORIGINS=*
    start "" /B ollama serve
    timeout /t 3 /nobreak >nul
    echo [OK] Ollama demarre.
)

:: Get local IP address
set LOCAL_IP=localhost
for /f "tokens=2 delims=:" %%A in ('ipconfig ^| findstr /c:"Adresse IPv4" /c:"IPv4 Address"') do (
    set RAW=%%A
    set RAW=!RAW: =!
    if not "!RAW!"=="" set LOCAL_IP=!RAW!
)

:: Try to start HTTP server for mobile access (requires Python)
netstat -an | findstr ":8080" | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [OK] Serveur HTTP deja actif sur le port 8080.
    goto :open
)

python --version >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [INFO] Demarrage du serveur HTTP sur le port 8080...
    start "" /B python -m http.server 8080 --directory "%~dp0"
    timeout /t 1 /nobreak >nul
    echo [OK] Serveur demarre.
    echo.
    echo  ============================================================
    echo   Acces depuis ce PC    : http://localhost:8080
    echo   Acces depuis telephone: http://%LOCAL_IP%:8080
    echo   (telephone et PC doivent etre sur le meme Wi-Fi)
    echo  ============================================================
    echo.
    goto :open
)

python3 --version >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [INFO] Demarrage du serveur HTTP sur le port 8080...
    start "" /B python3 -m http.server 8080 --directory "%~dp0"
    timeout /t 1 /nobreak >nul
    echo [OK] Serveur demarre.
    echo.
    echo  ============================================================
    echo   Acces depuis ce PC    : http://localhost:8080
    echo   Acces depuis telephone: http://%LOCAL_IP%:8080
    echo   (telephone et PC doivent etre sur le meme Wi-Fi)
    echo  ============================================================
    echo.
    goto :open
)

echo [INFO] Python non detecte - ouverture locale uniquement (sans acces mobile).
echo [INFO] Pour activer l'acces mobile, installe Python sur https://python.org
start "" "%~dp0index.html"
goto :end

:open
start "" "http://localhost:8080"

:end
endlocal
