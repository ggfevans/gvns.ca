import type { ContactInput } from './contact-schema';

const FROM_ADDRESS = 'noreply@gvns.ca';
const FROM_NAME = 'gvns.ca contact';
const TO_ADDRESS = 'hi@gvns.ca';
const SUBJECT_PREFIX = '[contact]';

export interface ResendPayload {
  from: string;
  to: string[];
  reply_to: string;
  subject: string;
  text: string;
}

function quoteDisplayName(name: string): string {
  if (/[",<>@]/.test(name)) return `"${name.replace(/(["\\])/g, '\\$1')}"`;
  return name;
}

export function buildResendPayload(input: ContactInput): ResendPayload {
  const text = [
    `From: ${input.name} <${input.email}>`,
    `Subject: ${input.subject}`,
    '',
    '----',
    '',
    input.message,
  ].join('\n');

  return {
    from: `${quoteDisplayName(FROM_NAME)} <${FROM_ADDRESS}>`,
    to: [TO_ADDRESS],
    reply_to: `${quoteDisplayName(input.name)} <${input.email}>`,
    subject: `${SUBJECT_PREFIX} ${input.subject}`,
    text,
  };
}
