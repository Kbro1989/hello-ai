# Set environment variables for development
$env:NODE_TLS_REJECT_UNAUTHORIZED = "0"
$env:WRANGLER_LOG = "debug"

# Clean wrangler temporary files
Remove-Item -Path ".wrangler" -Recurse -Force -ErrorAction SilentlyContinue

# Start development server
Write-Host "?? Starting development server..."
wrangler dev
