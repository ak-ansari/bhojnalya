// Sign-in stub: the form validates, but there is no auth API to call yet, so
// a valid submit says plainly that nothing was sent.
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { TextField } from '../components/TextField';
import { LoginSchema } from '../schemas/loginSchema';
import type { LoginInput, LoginValues } from '../schemas/loginSchema';

export function LoginPage() {
  const { t } = useTranslation();
  const [notice, setNotice] = useState<string | null>(null);
  const { register, handleSubmit, formState } = useForm<LoginInput, unknown, LoginValues>({
    resolver: zodResolver(LoginSchema),
    mode: 'onTouched',
    defaultValues: { identifier: '', password: '' },
  });
  const { errors, isSubmitting } = formState;
  const errorText = (key: string | undefined) => (key ? t(key) : undefined);

  const onSubmit = handleSubmit(() => {
    setNotice(t('auth.login.notConnected'));
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 p-6">
      <h1 className="text-2xl font-bold">{t('auth.login.title')}</h1>
      <p className="text-fg-body">{t('auth.login.subtitle')}</p>
      <form noValidate onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-2">
        <TextField
          label={t('auth.login.identifier')}
          hint={t('auth.login.identifierHint')}
          error={errorText(errors.identifier?.message)}
          autoComplete="username"
          {...register('identifier')}
        />
        <TextField
          type="password"
          label={t('auth.login.password')}
          hint={t('auth.login.passwordHint')}
          error={errorText(errors.password?.message)}
          autoComplete="current-password"
          {...register('password')}
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="min-h-11 rounded-lg bg-saffron px-4 font-semibold text-white disabled:opacity-60"
        >
          {isSubmitting ? t('auth.login.submitting') : t('auth.login.submit')}
        </button>
      </form>
      {notice && <p role="status">{notice}</p>}
    </main>
  );
}
