import { CacheFileSource } from '../rsmv/cache';
import { Env } from '../index';

export class WorkerCacheFileSource implements CacheFileSource {
    private env: Env;

    constructor(env: Env) {
        this.env = env;
    }

    getDecodeArgs(): Record<string, any> {
        // For now, return a dummy clientVersion. This might need to be dynamic later.
        return { clientVersion: 999 }; 
    }
}