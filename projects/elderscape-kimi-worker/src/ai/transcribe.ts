// src/ai/transcribe.ts
import { Router, IRequest } from 'itty-router';
import { Env } from '../types';

const transcribeRouter = Router();
const MAX_AUDIO_SIZE_MB = 25; // Kimi's limit is 25MB

/**
 * Endpoint to handle audio transcription.
 * Receives an audio file and forwards it to the Kimi API for transcription.
 */
transcribeRouter.post('/ai/transcribe', async (req: IRequest, env: Env) => {
    try {
        const form = await req.formData();
        const audioFile = form.get('file') as File; // Assuming 'file' is the name of the audio file field
        const key = form.get('key') as string; // Authentication key

        // 1. Authenticate the request
        if (!key || key !== env.KIMI_KEY) {
            return new Response('Unauthorized. Invalid key.', { status: 401 });
        }

        if (!audioFile) {
            return new Response('Missing audio file.', { status: 400 });
        }

        // 2. Validate file size
        if (audioFile.size > MAX_AUDIO_SIZE_MB * 1024 * 1024) {
            if (env.DEBUG === "true") {
                console.log(`Audio file rejected. Size (${audioFile.size} bytes) exceeds limit of ${MAX_AUDIO_SIZE_MB}MB.`);
            }
            return new Response(`Audio file exceeds size limit of ${MAX_AUDIO_SIZE_MB}MB.`, { status: 413 }); // 413 Payload Too Large
        }

        // 3. Prepare the request for Kimi API
        const kimiFormData = new FormData();
        kimiFormData.append('file', audioFile);
        kimiFormData.append('model', 'whisper-1'); // Kimi's transcription model

        // 4. Call the Kimi API for transcription
        const kimiResponse = await fetch(`${env.KIMI_ENDPOINT}/v1/audio/transcriptions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${env.KIMI_KEY}`,
            },
            body: kimiFormData,
        });

        if (!kimiResponse.ok) {
            const errorText = await kimiResponse.text();
            console.error(`Kimi Transcription API error: ${kimiResponse.status} ${errorText}`);
            return new Response(`Kimi Transcription API error: ${errorText}`, { status: kimiResponse.status });
        }

        const kimiResult = await kimiResponse.json<{ text: string }>();
        const transcribedText = kimiResult.text;

        if (env.DEBUG === "true") {
            console.log(`Transcription successful for file: ${audioFile.name}, Text: "${transcribedText}"`);
        }

        // 5. Return the transcribed text to the client
        return new Response(JSON.stringify({ text: transcribedText }), {
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Error in /ai/transcribe:', error);
        return new Response('An internal error occurred during transcription.', { status: 500 });
    }
});

export default transcribeRouter;