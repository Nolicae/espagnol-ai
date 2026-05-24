@echo off
setlocal

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

:: Open the app in the default browser
echo [INFO] Ouverture de l'application...
start "" "%~dp0index.html"

endlocal
