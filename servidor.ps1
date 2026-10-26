# Servidor HTTP local para o Placar de Sinuca (abrir no celular)
$port = 8080
$root = "C:\Users\rvisc\OneDrive\Documentos\Projeto Padrão\placar-sinuca"
$ip = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" -and $_.PrefixOrigin -ne "Suffix" } | Select-Object -First 1).IPAddress
if (-not $ip) { $ip = "127.0.0.1" }
"http://$ip`:$port" | Out-File -FilePath (Join-Path $root "url-cel.txt") -Encoding utf8

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://+:$port/")
$listener.Start()
Write-Host "Servidor rodando!"
Write-Host "No celular (mesma rede Wi-Fi): http://$ip`:$port"
Write-Host "No PC: http://localhost:$port"
Write-Host "Pressione Ctrl+C para parar."

while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $req = $ctx.Request
    $res = $ctx.Response
    $path = $req.Url.LocalPath.TrimStart('/')
    if ($path -eq '') { $path = 'index.html' }
    $file = Join-Path $root $path
    if (Test-Path $file -PathType Leaf) {
        $bytes = [System.IO.File]::ReadAllBytes($file)
        $ext = [System.IO.Path]::GetExtension($file).ToLower()
        $mime = switch ($ext) {
            '.html' { 'text/html; charset=utf-8' }
            '.css'  { 'text/css' }
            '.js'   { 'application/javascript' }
            '.json' { 'application/json' }
            '.svg'  { 'image/svg+xml' }
            '.png'  { 'image/png' }
            '.webmanifest' { 'application/manifest+json' }
            default { 'application/octet-stream' }
        }
        $res.ContentType = $mime
        $res.ContentLength64 = $bytes.Length
        $res.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
        $res.StatusCode = 404
        $b = [System.Text.Encoding]::UTF8.GetBytes('404 Not Found')
        $res.OutputStream.Write($b, 0, $b.Length)
    }
    $res.Close()
}