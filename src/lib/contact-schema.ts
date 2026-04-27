import { z } from 'astro/zod';

/** Returns true if the string contains no CR, LF, or NUL characters. */
export function isCRLFFree(s: string): boolean {
  return !/[\r\n\0]/.test(s);
}

const noCRLF = (fieldName: string) =>
  z.string().refine(isCRLFFree, {
    message: `${fieldName}: Invalid characters`,
  });

export const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or fewer')
    .refine(isCRLFFree, { message: 'name: Invalid characters' }),

  email: z
    .string()
    .trim()
    .email('A valid email address is required')
    .max(254, 'Email must be 254 characters or fewer (RFC 5321)')
    .refine(isCRLFFree, { message: 'email: Invalid characters' }),

  subject: z
    .string()
    .trim()
    .min(1, 'Subject is required')
    .max(200, 'Subject must be 200 characters or fewer')
    .refine(isCRLFFree, { message: 'subject: Invalid characters' }),

  // Newlines are intentionally allowed in the message body.
  message: z
    .string()
    .trim()
    .min(1, 'Message is required')
    .max(5000, 'Message must be 5000 characters or fewer'),

  // Honeypot — must be absent or empty; bots fill this in.
  website: z
    .string()
    .optional()
    .refine((val) => !val || val === '', {
      message: 'website: must be empty',
    }),

  'cf-turnstile-response': z.string().min(1, 'Turnstile token is required'),
});

export type ContactInput = z.infer<typeof contactSchema>;
