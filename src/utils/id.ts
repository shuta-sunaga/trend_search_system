import { randomBytes } from 'crypto';

/** Generate a short unique ID */
export function generateId(): string {
  return randomBytes(12).toString('hex');
}
