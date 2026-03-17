declare module 'sqlite3' {
  export class Database {
    constructor(filename: string, mode?: number, callback?: (err: Error | null) => void);
    close(callback?: (err: Error | null) => void): void;
    run(sql: string, params?: any, callback?: (err: Error | null) => void): this;
    get(sql: string, params?: any, callback?: (err: Error | null, row: any) => void): this;
    all(sql: string, params?: any, callback?: (err: Error | null, rows: any[]) => void): this;
    exec(sql: string, callback?: (err: Error | null) => void): this;
    on(event: "open" | "close" | "error", listener: (...args: any[]) => void): this;
    once(event: "open" | "close" | "error", listener: (...args: any[]) => void): this;
    wait(callback?: (err: Error | null) => void): this;
    interrupt(): void;
  }
  export const OPEN_READONLY: number;
  export const OPEN_READWRITE: number;
  export const OPEN_CREATE: number;
}
