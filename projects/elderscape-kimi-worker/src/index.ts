import { Router } from 'itty-router';
import queryRouter from './ai/query'; // Import the query router
import transcribeRouter from './ai/transcribe'; // Import the transcribe router
import { Env } from './types'; // Import Env from types

const router = Router();

// Mount the query router
router.use(queryRouter.routes);
// Mount the transcribe router
router.use(transcribeRouter.routes);

// 404 handler for all other routes
router.all('*', () => new Response('Not Found.', { status: 404 }));

export default {
	fetch: router.handle,
};
