// A labelled input whose error replaces its hint in the same fixed-height
// line, so the form never jumps.
import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes } from 'react';

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint: string;
  error?: string | undefined;
};

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, hint, error, ...input },
  ref,
) {
  const id = useId();
  const messageId = `${id}-message`;
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <input
        {...input}
        ref={ref}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={messageId}
        className="min-h-11 rounded-lg border border-slate-300 px-3 aria-[invalid=true]:border-red-700"
      />
      <p id={messageId} className={`min-h-10 text-xs ${error ? 'text-red-700' : 'text-slate-500'}`}>
        {error ?? hint}
      </p>
    </div>
  );
});
