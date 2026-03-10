import crypto from 'crypto';
import { getConfig } from '../config.js';
import logger from '../utils/logger.js';

export function verifyWebhookSignature(
  payload: string,
  signature: string | undefined
): boolean {
  if (!signature) {
    logger.warn('Missing webhook signature');
    return false;
  }

  const config = getConfig();
  const hash = crypto
    .createHmac('sha256', config.GITHUB_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  const expectedSignature = `sha256=${hash}`;

  // Use timing-safe comparison to prevent timing attacks
  const isValid = crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(signature)
  );

  if (!isValid) {
    logger.error('Invalid webhook signature', {
      expected: expectedSignature.substring(0, 20) + '...',
      received: signature.substring(0, 20) + '...',
    });
  }

  return isValid;
}

export function validateWebhookEvent(
  event: string | undefined,
  action: string | undefined
): boolean {
  const supportedEvents = ['pull_request'];
  const supportedActions = ['opened', 'synchronize', 'edited', 'reopened'];

  if (!event || !supportedEvents.includes(event)) {
    logger.debug('Unsupported webhook event', { event });
    return false;
  }

  if (!action || !supportedActions.includes(action)) {
    logger.debug('Unsupported webhook action', { event, action });
    return false;
  }

  return true;
}
