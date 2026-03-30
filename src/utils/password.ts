import bcrypt from 'bcrypt';
import { env } from '../config/env';
import * as fernet from 'fernet';

const SALT_ROUNDS = 10;

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

export const comparePassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

export const encryptPdf = (pdfBuffer: Buffer): string => {
  const secret = new fernet.Secret(env.PYTHON_SERVICE_ENCRYPTION_KEY);
  const token = new fernet.Token({ secret, ttl: 0 }); // No TTL for now
  return token.encode(pdfBuffer.toString('base64'));
};
