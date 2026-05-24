@echo off
setlocal EnableDelayedExpansion

:: ── Elevation (necesaire pour la regle pare-feu) ──────────────────────────
net session >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [INFO] Demande d'elevation des privileges pour le pare-feu...
    powershell -Command "Start-Process cmd -ArgumentList '/c \"%~f0\"' -Verb RunAs -Wait"
    exit /b
)

:: ── Ollama ─────────────────────────────────────────────────────────────────
where ollama >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERREUR] Ollama n'est pas installe. Telecharge-le sur https://ollama.com
    pause
    exit /b 1
)

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

:: ── Pare-feu : ouvrir le port 8080 ────────────────────────────────────────
netsh advfirewall firewall show rule name="EspanolAI HTTP" >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [INFO] Ajout de la regle pare-feu pour le port 8080...
    netsh advfirewall firewall add rule name="EspanolAI HTTP" protocol=TCP dir=in localport=8080 action=allow >nul
    echo [OK] Regle pare-feu ajoutee.
) else (
    echo [OK] Regle pare-feu deja presente.
)

:: ── Serveur HTTP (PowerShell natif, aucune installation requise) ────────────
netstat -an | findstr ":8080" | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [OK] Serveur HTTP deja actif sur le port 8080.
    goto :open
)

echo [INFO] Demarrage du serveur HTTP...
start "EspanolAI - Serveur" powershell -ExecutionPolicy Bypass -File "%~dp0serveur.ps1"
timeout /t 2 /nobreak >nul

:open
echo [INFO] Ouverture de l'application...
start "" "http://localhost:8080"
echo.
echo  [OK] Application lancee. Tu peux fermer cette fenetre.
pause >nul

endlocal
