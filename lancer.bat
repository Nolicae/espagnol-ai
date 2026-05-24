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

:: ── IP locale ──────────────────────────────────────────────────────────────
set LOCAL_IP=localhost
for /f "tokens=2 delims=:" %%A in ('ipconfig ^| findstr /c:"Adresse IPv4" /c:"IPv4 Address"') do (
    set RAW=%%A
    set RAW=!RAW: =!
    if not "!RAW!"=="" set LOCAL_IP=!RAW!
)

:: ── Serveur HTTP Python ────────────────────────────────────────────────────
netstat -an | findstr ":8080" | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [OK] Serveur HTTP deja actif sur le port 8080.
    goto :show_urls
)

python --version >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [INFO] Demarrage du serveur HTTP sur le port 8080...
    start "" /B python -m http.server 8080 --directory "%~dp0"
    timeout /t 1 /nobreak >nul
    goto :show_urls
)

python3 --version >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [INFO] Demarrage du serveur HTTP sur le port 8080...
    start "" /B python3 -m http.server 8080 --directory "%~dp0"
    timeout /t 1 /nobreak >nul
    goto :show_urls
)

echo [INFO] Python non detecte - ouverture locale uniquement (sans acces mobile).
echo [INFO] Pour activer l'acces mobile, installe Python sur https://python.org
start "" "%~dp0index.html"
goto :end

:show_urls
echo.
echo  ============================================================
echo   Ce PC         : http://localhost:8080
echo   Telephone     : http://%LOCAL_IP%:8080
echo   (meme Wi-Fi requis)
echo  ============================================================
echo.
start "" "http://localhost:8080"
echo  Appuie sur une touche pour fermer cette fenetre.
echo  (l'app continue de tourner en arriere-plan)
pause >nul

:end
endlocal
