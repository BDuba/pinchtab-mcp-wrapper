/**
 * Transport utilities
 */

import { randomBytes } from 'crypto';

/**
 * Generate a unique session ID
 */
export function generateId(): string {
  return randomBytes(16).toString('hex');
}

/**
 * Get request body as buffer
 */
export async function getRequestBody(req: import('http').IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    
    req.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });
    
    req.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    
    req.on('error', (error) => {
      reject(error);
    });
  });
}
