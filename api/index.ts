import { handle } from 'hono/vercel';
import { app } from './_app.js';

const handler = handle(app);

const wrapHandler = (originalHandler: any, method: string) => {
  return async (req: any, res?: any) => {
    let url = 'unknown';
    let headersObj: any = {};
    if (req) {
      if (typeof req.url === 'string') {
        url = req.url;
      } else if (req.url && typeof req.url.toString === 'function') {
        url = req.url.toString();
      }
      
      if (req.headers) {
        if (typeof req.headers.forEach === 'function') {
          req.headers.forEach((val: string, key: string) => {
            headersObj[key] = val;
          });
        } else {
          headersObj = req.headers;
        }
      }
    }
    
    console.log(`[VERCEL-API] [${method}] Path: ${url}`);
    console.log(`[VERCEL-API] [${method}] Headers:`, JSON.stringify(headersObj));
    
    try {
      const result = await originalHandler(req, res);
      if (result instanceof Response) {
        console.log(`[VERCEL-API] [${method}] Web Response Status:`, result.status);
      } else {
        console.log(`[VERCEL-API] [${method}] Node Finished, res.statusCode:`, res?.statusCode);
      }
      return result;
    } catch (err) {
      console.error(`[VERCEL-API] [${method}] Error:`, err);
      throw err;
    }
  };
};

export const GET = wrapHandler(handler, 'GET');
export const POST = wrapHandler(handler, 'POST');
export const PUT = wrapHandler(handler, 'PUT');
export const DELETE = wrapHandler(handler, 'DELETE');
export const PATCH = wrapHandler(handler, 'PATCH');
export const OPTIONS = wrapHandler(handler, 'OPTIONS');

export default wrapHandler(handler, 'DEFAULT');


