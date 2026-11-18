declare namespace NodeJS {
  interface Process {
    argv: string[];
    version: string;
    cwd(): string;
    exit(code?: number): never;
    env: Record<string, string | undefined>;
    platform: string;
    stdout: {
      write(str: string): boolean;
    };
    stderr: {
      write(str: string): boolean;
    };
    on(event: string, listener: (...args: any[]) => void): this;
  }
  interface Timeout {}
  interface Immediate {}
}

declare const process: NodeJS.Process;

declare const Buffer: {
  from(str: string, encoding?: string): any;
  byteLength(string: string | any, encoding?: string): number;
};

declare function setTimeout(callback: (...args: any[]) => void, ms?: number, ...args: any[]): NodeJS.Timeout;
declare function clearTimeout(timeoutId: NodeJS.Timeout): void;
declare function setInterval(callback: (...args: any[]) => void, ms?: number, ...args: any[]): NodeJS.Timeout;
declare function clearInterval(intervalId: NodeJS.Timeout): void;
declare function setImmediate(callback: (...args: any[]) => void, ...args: any[]): NodeJS.Immediate;
declare function clearImmediate(immediateId: NodeJS.Immediate): void;

declare module 'node:path' {
  export function join(...paths: string[]): string;
  export function dirname(p: string): string;
  export function resolve(...paths: string[]): string;
  export function relative(from: string, to: string): string;
  export function basename(p: string, ext?: string): string;
  export function extname(p: string): string;
}

declare module 'node:fs' {
  export function existsSync(p: string): boolean;
  export function readFileSync(p: string, options?: any): string;
  export function writeFileSync(p: string, data: string, options?: any): void;
  export function mkdirSync(p: string, options?: { recursive?: boolean }): string | undefined;
  export function readdirSync(p: string, options?: { recursive?: boolean; withFileTypes?: boolean }): string[];
  export function statSync(p: string): { isDirectory(): boolean; isFile(): boolean; size: number };
}

declare module 'node:crypto' {
  export function randomUUID(): string;
}

declare module 'node:url' {
  export class URL {
    constructor(input: string, base?: string | URL);
    href: string;
    origin: string;
    protocol: string;
    username: string;
    password: string;
    host: string;
    hostname: string;
    port: string;
    pathname: string;
    search: string;
    searchParams: {
      get(name: string): string | null;
      set(name: string, value: string): void;
      has(name: string): boolean;
    };
    hash: string;
  }
  export function parse(urlStr: string): any;
  export function fileURLToPath(url: string | URL): string;
}

declare module 'node:events' {
  export class EventEmitter {
    on(event: string, listener: (...args: any[]) => void): this;
    once(event: string, listener: (...args: any[]) => void): this;
    emit(event: string, ...args: any[]): boolean;
    removeListener(event: string, listener: (...args: any[]) => void): this;
  }
}

declare module 'node:http' {
  import { EventEmitter } from 'node:events';
  import { URL } from 'node:url';

  export interface IncomingMessage extends EventEmitter {
    url?: string;
    method?: string;
    statusCode?: number;
    statusMessage?: string;
    headers: Record<string, string | string[] | undefined>;
    on(event: 'data', listener: (chunk: any) => void): this;
    on(event: 'end', listener: () => void): this;
    on(event: 'error', listener: (err: any) => void): this;
    resume(): this;
  }

  export interface ServerResponse extends EventEmitter {
    statusCode: number;
    writeHead(statusCode: number, headers?: Record<string, string | number>): void;
    setHeader(name: string, value: string | number): void;
    end(data?: string | any): void;
  }

  export interface ClientRequest extends EventEmitter {
    write(chunk: any, callback?: () => void): boolean;
    end(data?: any, callback?: () => void): void;
    abort(): void;
    destroy(err?: Error): void;
    setTimeout(msecs: number, callback?: () => void): this;
  }

  export interface Server extends EventEmitter {
    listen(port?: number, hostname?: string, callback?: () => void): this;
    listen(port?: number, callback?: () => void): this;
    close(callback?: (err?: Error) => void): this;
    address(): any;
  }

  export function createServer(requestListener?: (req: IncomingMessage, res: ServerResponse) => void): Server;
  export function get(url: string | URL, callback?: (res: IncomingMessage) => void): ClientRequest;
}

declare module 'node:test' {
  export function test(name: string, fn: (t?: any) => void | Promise<void>): void;
  export function describe(name: string, fn: () => void): void;
  export function it(name: string, fn: (t?: any) => void | Promise<void>): void;
  export function before(fn: () => void | Promise<void>): void;
  export function after(fn: () => void | Promise<void>): void;
}

declare module 'node:assert' {
  export function strictEqual(actual: any, expected: any, message?: string | Error): void;
  export function notStrictEqual(actual: any, expected: any, message?: string | Error): void;
  export function deepStrictEqual(actual: any, expected: any, message?: string | Error): void;
  export function ok(value: any, message?: string | Error): void;
  export function match(value: string, regExp: RegExp, message?: string | Error): void;
}
