$port = 8080
$dir  = $PSScriptRoot

$mimeTypes = @{
    '.html' = 'text/html; charset=utf-8'
    '.js'   = 'application/javascript'
    '.css'  = 'text/css'
    '.json' = 'application/json'
    '.svg'  = 'image/svg+xml'
    '.png'  = 'image/png'
    '.ico'  = 'image/x-icon'
    '.webmanifest' = 'application/manifest+json'
}

$ip = (Get-NetIPAddress -AddressFamily IPv4 |
       Where-Object { $_.InterfaceAlias -notlike '*Loopback*' -and
                      $_.IPAddress -notlike '169.*' } |
       Select-Object -First 1).IPAddress

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://+:${port}/")
try { $listener.Start() }
catch {
    Write-Host "[ERREUR] Impossible de demarrer le serveur sur le port $port." -ForegroundColor Red
    Write-Host "         Essaie de fermer les autres instances de lancer.bat." -ForegroundColor Yellow
    Read-Host "Appuie sur Entree pour quitter"
    exit 1
}

Write-Host ""
Write-Host "  ============================================================" -ForegroundColor Cyan
Write-Host "   EspanolAI - Serveur actif" -ForegroundColor Cyan
Write-Host "  ============================================================" -ForegroundColor Cyan
Write-Host "   Ce PC       : http://localhost:$port" -ForegroundColor Green
Write-Host "   Telephone   : http://${ip}:$port" -ForegroundColor Yellow
Write-Host "   (telephone et PC sur le meme Wi-Fi)" -ForegroundColor Gray
Write-Host "  ============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Ferme cette fenetre pour arreter le serveur." -ForegroundColor Gray
Write-Host ""

while ($listener.IsListening) {
    $context  = $listener.GetContext()
    $request  = $context.Request
    $response = $context.Response

    $path = $request.Url.LocalPath.TrimStart('/')
    if ($path -eq '') { $path = 'index.html' }
    $filePath = Join-Path $dir $path

    if (Test-Path $filePath -PathType Leaf) {
        $ext  = [System.IO.Path]::GetExtension($filePath).ToLower()
        $mime = if ($mimeTypes[$ext]) { $mimeTypes[$ext] } else { 'application/octet-stream' }
        $content = [System.IO.File]::ReadAllBytes($filePath)
        $response.ContentType     = $mime
        $response.ContentLength64 = $content.Length
        $response.OutputStream.Write($content, 0, $content.Length)
    } else {
        $response.StatusCode = 404
    }
    $response.OutputStream.Close()
}
