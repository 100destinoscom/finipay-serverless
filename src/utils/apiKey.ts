import { nanoid } from 'nanoid';
import { env } from '../config/env';

export const generateApiKey = (): string => {
  const randomPart = nanoid(32);
  return `${env.API_KEY_PREFIX}${randomPart}`;
};
