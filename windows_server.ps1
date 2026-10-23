$ErrorActionPreference = "Stop"
$root = [System.IO.Path]::GetFullPath((Split-Path -Parent $MyInvocation.MyCommand.Path))
$port = 9300
$url = "http://localhost:$port/"
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $port)

function Get-ContentType([string]$path) {
    switch ([System.IO.Path]::GetExtension($path).ToLowerInvariant()) {
        ".html" { "text/html; charset=utf-8"; break }
        ".htm"  { "text/html; charset=utf-8"; break }
        ".js"   { "text/javascript; charset=utf-8"; break }
        ".css"  { "text/css; charset=utf-8"; break }
        ".json" { "application/json; charset=utf-8"; break }
        ".xlsx" { "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"; break }
        ".png"  { "image/png"; break }
        ".jpg"  { "image/jpeg"; break }
        ".jpeg" { "image/jpeg"; break }
        ".svg"  { "image/svg+xml"; break }
        ".ico"  { "image/x-icon"; break }
        default  { "application/octet-stream" }
    }
}

function Send-Response($stream, [int]$status, [string]$reason, [byte[]]$body, [string]$contentType, [bool]$headOnly) {
    $header = "HTTP/1.1 $status $reason`r`nContent-Type: $contentType`r`nContent-Length: $($body.Length)`r`nConnection: close`r`nCache-Control: no-cache`r`n`r`n"
    $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
    $stream.Write($headerBytes, 0, $headerBytes.Length)
    if (-not $headOnly -and $body.Length -gt 0) {
        $stream.Write($body, 0, $body.Length)
    }
}

try {
    $listener.Start()
} catch {
    Start-Process $url
    exit 0
}

Write-Host "上野清掃2.3を起動しました: $url"
Write-Host "この画面を閉じると停止します。"
Start-Process $url

try {
    while ($true) {
        $client = $listener.AcceptTcpClient()
        try {
            $stream = $client.GetStream()
            $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::ASCII, $false, 1024, $true)
            $requestLine = $reader.ReadLine()
            if ([string]::IsNullOrWhiteSpace($requestLine)) { continue }

            while ($true) {
                $line = $reader.ReadLine()
                if ([string]::IsNullOrEmpty($line)) { break }
            }

            $parts = $requestLine.Split(' ')
            $method = $parts[0]
            if ($parts.Length -lt 2 -or ($method -ne "GET" -and $method -ne "HEAD")) {
                $body = [System.Text.Encoding]::UTF8.GetBytes("Method Not Allowed")
                Send-Response $stream 405 "Method Not Allowed" $body "text/plain; charset=utf-8" ($method -eq "HEAD")
                continue
            }

            $requestPath = [System.Uri]::UnescapeDataString(($parts[1] -split '\?')[0])
            if ($requestPath -eq "/") { $requestPath = "/index.html" }
            $relative = $requestPath.TrimStart('/').Replace('/', [System.IO.Path]::DirectorySeparatorChar)
            $fullPath = [System.IO.Path]::GetFullPath((Join-Path $root $relative))

            if (-not $fullPath.StartsWith($root, [System.StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path -LiteralPath $fullPath -PathType Leaf)) {
                $body = [System.Text.Encoding]::UTF8.GetBytes("Not Found")
                Send-Response $stream 404 "Not Found" $body "text/plain; charset=utf-8" ($method -eq "HEAD")
                continue
            }

            $body = [System.IO.File]::ReadAllBytes($fullPath)
            Send-Response $stream 200 "OK" $body (Get-ContentType $fullPath) ($method -eq "HEAD")
        } catch {
            Write-Host "通信エラー: $($_.Exception.Message)"
        } finally {
            $client.Close()
        }
    }
} finally {
    $listener.Stop()
}
