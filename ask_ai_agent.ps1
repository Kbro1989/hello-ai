param(
  [string]$prompt
)

$url = "https://hello-ai.kristain33rs.workers.dev"
$headers = @{
  "Content-Type" = "application/json"
}
$body = @{
  "prompt" = $prompt
} | ConvertTo-Json

try {
  $response = Invoke-WebRequest -Uri $url -Method Post -Headers $headers -Body $body -UseBasicParsing
  Write-Output "Status Code: $($response.StatusCode)"
  Write-Output "Headers: $($response.Headers | ConvertTo-Json -Compress)"
  Write-Output "Content: $($response.Content)"
} catch {
  Write-Output "An error occurred:"
  Write-Output $_.Exception.ToString()
  if ($_.Exception.Response) {
    $response = $_.Exception.Response
    $reader = New-Object System.IO.StreamReader($response.GetResponseStream())
    $content = $reader.ReadToEnd()
    Write-Output "Status Code: $($response.StatusCode)"
    Write-Output "Headers: $($response.Headers | ConvertTo-Json -Compress)"
    Write-Output "Content: $content"
  }
}