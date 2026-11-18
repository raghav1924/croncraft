import { EventEmitter } from 'node:events';

export function createVirtualTransport(handler: (req: any, res: any) => void) {
  return (_url: any, _options: any, callback?: (res: any) => void) => {
    const clientReq = new EventEmitter() as any;
    let written = '';
    clientReq.write = (chunk: any) => {
      written += chunk ? chunk.toString() : '';
      return true;
    };
    clientReq.setTimeout = () => clientReq;
    clientReq.abort = () => {};
    clientReq.destroy = () => {};

    clientReq.end = (data?: any) => {
      if (data) written += data.toString();

      const serverReq = new EventEmitter() as any;
      serverReq.method = _options?.method || 'GET';
      serverReq.url = _url?.pathname || '/';
      serverReq.headers = _options?.headers || {};

      const serverRes = new EventEmitter() as any;
      serverRes.statusCode = 200;
      serverRes.headers = {};
      serverRes.writeHead = (code: number, headers?: any) => {
        serverRes.statusCode = code;
        if (headers) {
          for (const [k, v] of Object.entries(headers)) {
            serverRes.headers[k.toLowerCase()] = v;
          }
        }
      };
      serverRes.setHeader = (k: string, v: any) => {
        serverRes.headers[k.toLowerCase()] = v;
      };
      serverRes.end = (payload?: any) => {
        const clientRes = new EventEmitter() as any;
        clientRes.statusCode = serverRes.statusCode;
        clientRes.headers = serverRes.headers;

        if (callback) {
          callback(clientRes);
        }

        setImmediate(() => {
          if (payload) {
            clientRes.emit('data', payload);
          }
          clientRes.emit('end');
        });
      };

      setImmediate(() => {
        handler(serverReq, serverRes);
        if (written.length > 0) {
          serverReq.emit('data', written);
        }
        serverReq.emit('end');
      });
    };

    return clientReq;
  };
}
