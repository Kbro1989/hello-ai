# ===============================
# PowerShell: KV Upload & Verify
# ===============================

# Set your KV namespace ID here
$KV_NAMESPACE_ID = "328b510e11f94357b76bf7affa50830b" # Use the actual ID here, not the binding name

# Directory containing your JSON files
$JSON_DIR = ".\public"

# Step 1: Upload all JSON files to KV
Write-Host "Uploading JSON files to KV..."
Get-ChildItem -Path "$JSON_DIR\*.json" | ForEach-Object {
    $key = $_.BaseName
    $filePath = $_.FullName
    Write-Host "Uploading $key from $filePath..."
    # Use --namespace-id with the actual ID and --remote flag
    Invoke-Expression "npx wrangler kv key put --namespace-id $KV_NAMESPACE_ID $key --path $filePath --remote"
}
Write-Host "Upload complete.`n"

# Step 2: Verify KV keys
Write-Host "Verifying KV keys..."
# Corrected variable reference and added --remote flag
$kvKeys = Invoke-Expression "npx wrangler kv key list --namespace-id $KV_NAMESPACE_ID --remote"
Write-Host "`nKV Keys in namespace ${KV_NAMESPACE_ID}:`n" # Corrected variable reference
Write-Host $kvKeys

# Step 3: Optional: Favicon handling snippet for Worker
$FaviconSnippet = @"
addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request))
})

async function handleRequest(req) {
    // Favicon handling
    if (new URL(req.url).pathname === '/favicon.ico') {
        // Option 1: Serve your CDN/hosted favicon
        return fetch('https://your-cdn.com/favicon.ico')
        // Option 2: Or return 204 if no favicon
        // return new Response(null, { status: 204 })
    }

    // Normal request handling
    try {
        // Your existing Worker logic here
        return new Response('Hello from Worker!', { status: 200 })
    } catch (err) {
        console.error('Worker error:', err)
        return new Response('Internal Server Error', { status: 500 })
    }
}
"@ # Ensure this is at the very beginning of the line

$FaviconFile = ".\favicon-worker-snippet.js"
$FaviconSnippet | Out-File -FilePath $FaviconFile -Encoding utf8
Write-Host "`nFavicon snippet saved to $FaviconFile. Include or merge this into your Worker script."