// Owners sign in with an email or a mobile number, plus a password (TRD §13).
// Messages are i18n keys; the form translates them.
import { z } from 'zod';

const INDIAN_MOBILE = /^[6-9]\d{9}$/;

export const LoginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .refine((value) => INDIAN_MOBILE.test(value) || z.email().safeParse(value).success, {
      message: 'auth.login.errors.identifier',
    }),
  password: z.string().min(8, { message: 'auth.login.errors.password' }),
});

export type LoginInput = z.input<typeof LoginSchema>;
export type LoginValues = z.output<typeof LoginSchema>;
