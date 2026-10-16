// Outgoing email behind one interface (TRD §13: email OTP for password reset,
// no paid provider). Development prints each message to stderr, outside the
// request logs; production has no transport yet and drops the message with a
// warning that names no recipient and no content.
import { Logger } from '@nestjs/common';

import type { ApiConfig } from '../config.js';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

export interface MailTransport {
  send(message: MailMessage): Promise<void>;
}

export const MAIL_TRANSPORT = Symbol('MAIL_TRANSPORT');

export function mailTransportFor(config: ApiConfig): MailTransport {
  return config.NODE_ENV === 'production'
    ? new UnconfiguredMailTransport()
    : new ConsoleMailTransport();
}

// The dev transport: the message is for the developer on their own machine, so
// it goes to stderr directly and never into the JSON logs.
export class ConsoleMailTransport implements MailTransport {
  send(message: MailMessage): Promise<void> {
    process.stderr.write(`\n--- mail to ${message.to}: ${message.subject}\n${message.text}\n---\n`);
    return Promise.resolve();
  }
}

class UnconfiguredMailTransport implements MailTransport {
  private readonly logger = new Logger('Mail');

  send(): Promise<void> {
    this.logger.warn('No mail transport is configured; an email was not sent.');
    return Promise.resolve();
  }
}
