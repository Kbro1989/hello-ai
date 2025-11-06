addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request))
})

async function handleRequest(req) {
    // Favicon handling
    if (new URL(req.url).pathname === '/favicon.ico') {
        // Serve a hosted favicon or return 204 if none
        return fetch('https://your-cdn.com/favicon.ico')
        // return new Response(null, { status: 204 })
    }

    try {
        // Your existing Worker logic here
        return new Response('Hello from Worker!', { status: 200 })
    } catch (err) {
        console.error('Worker error:', err)
        return new Response('Internal Server Error', { status: 500 })
    }
}
