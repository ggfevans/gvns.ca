import { createMimeMessage } from 'mimetext';
import type { ContactInput } from './contact-schema';

const FROM_ADDRESS = 'noreply@gvns.ca';
const FROM_NAME = 'gvns.ca contact';
const TO_ADDRESS = 'hi@gvns.ca';
const SUBJECT_PREFIX = '[contact]';

export function buildContactEmail(input: ContactInput): {
  from: string;
  to: string;
  raw: string;
} {
  const msg = createMimeMessage();

  msg.setSender({ name: FROM_NAME, addr: FROM_ADDRESS });
  msg.setTo(TO_ADDRESS);
  msg.setHeader('Reply-To', { addr: input.email, name: input.name });
  msg.setSubject(`${SUBJECT_PREFIX} ${input.subject}`);

  const body = [
    `From: ${input.name} <${input.email}>`,
    `Subject: ${input.subject}`,
    '',
    '----',
    '',
    input.message,
  ].join('\n');

  msg.addMessage({
    contentType: 'text/plain',
    charset: 'utf-8',
    data: body,
  });

  return {
    from: FROM_ADDRESS,
    to: TO_ADDRESS,
    raw: msg.asRaw(),
  };
}
