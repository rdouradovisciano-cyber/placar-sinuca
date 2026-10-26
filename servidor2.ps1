# Servidor TCP/HTTP simples (sem elevacao) para o Placar de Sinuca
$port = 8081
$root = $PSScriptRoot
$ip = "192.168.0.6"

$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $port)
$listener.Start()
"http://$ip`:$port" | Out-File -FilePath (Join-Path $root "url-cel.txt") -Encoding utf8
Write-Host "Servidor rodando em http://$ip`:$port"

$mimes = @{
  '.html'='text/html; charset=utf-8'; '.css'='text/css'; '.js'='application/javascript';
  '.json'='application/json'; '.svg'='image/svg+xml'; '.png'='image/png';
  '.webmanifest'='application/manifest+json'
}

while ($true) {
    $client = $listener.AcceptTcpClient()
    $stream = $client.GetStream()
    $reader = New-Object System.IO.StreamReader($stream, [System.Text.Encoding]::ASCII, $false, 1024, $true)
    $requestLine = $reader.ReadLine()
    # consume headers
    while ($reader.ReadLine() -ne '') { }
    if ($requestLine) {
        $parts = $requestLine.Split(' ')
        $path = $parts[1].Split('?')[0].TrimStart('/')
        if ($path -eq '') { $path = 'index.html' }
        $file = Join-Path $root $path
        if (Test-Path $file -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($file)
            $ext = [System.IO.Path]::GetExtension($file).ToLower()
            $mime = if ($mimes.ContainsKey($ext)) { $mimes[$ext] } else { 'application/octet-stream' }
            $header = "HTTP/1.1 200 OK`r`nContent-Type: $mime`r`nContent-Length: $($bytes.Length)`r`nConnection: close`r`n`r`n"
            $hbytes = [System.Text.Encoding]::ASCII.GetBytes($header)
            $stream.Write($hbytes, 0, $hbytes.Length)
            $stream.Write($bytes, 0, $bytes.Length)
        } else {
            $b = [System.Text.Encoding]::UTF8.GetBytes('404 Not Found')
            $header = "HTTP/1.1 404 Not Found`r`nContent-Length: $($b.Length)`r`nConnection: close`r`n`r`n"
            $hbytes = [System.Text.Encoding]::ASCII.GetBytes($header)
            $stream.Write($hbytes, 0, $hbytes.Length)
            $stream.Write($b, 0, $b.Length)
        }
    }
    $stream.Close()
    $client.Close()
}