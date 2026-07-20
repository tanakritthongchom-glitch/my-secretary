$http = New-Object System.Net.HttpListener
$http.Prefixes.Add("http://192.168.1.142:8080/")
$http.Prefixes.Add("http://localhost:8080/")
try {
    $http.Start()
    Write-Host "Server running successfully!"
    Write-Host "Open on mobile: http://192.168.1.142:8080/"
    while ($http.IsListening) {
        $context = $http.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        $localPath = $request.Url.LocalPath
        if ($localPath -eq '/') { $localPath = '/index.html' }
        
        $filePath = Join-Path (Get-Location) ($localPath -replace '^/','')
        if ((Test-Path $filePath) -and -not (Test-Path $filePath -PathType Container)) {
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            if ($filePath.EndsWith('.html')) { $response.ContentType = 'text/html; charset=utf-8' }
            elseif ($filePath.EndsWith('.css')) { $response.ContentType = 'text/css; charset=utf-8' }
            elseif ($filePath.EndsWith('.js')) { $response.ContentType = 'application/javascript; charset=utf-8' }
            elseif ($filePath.EndsWith('.json')) { $response.ContentType = 'application/json; charset=utf-8' }
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
        }
        $response.Close()
    }
} catch {
    Write-Host "HttpListener error: $_"
} finally {
    if ($http.IsListening) { $http.Stop() }
}
