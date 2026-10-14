import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/testing/renderWithProviders';

describe('LoginPage', () => {
  it('shows the sign-in form with a hint under each field', () => {
    renderWithProviders('/login');
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email or mobile number')).toHaveAccessibleDescription(
      'The email or 10-digit mobile number you signed up with.',
    );
    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription('At least 8 characters.');
  });

  it('replaces each hint with the rule it broke and focuses the first invalid field on a failed submit', async () => {
    const user = userEvent.setup();
    renderWithProviders('/login');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    const identifier = screen.getByLabelText('Email or mobile number');
    expect(identifier).toHaveAccessibleDescription(
      'Enter an email address, or a 10-digit mobile number starting with 6, 7, 8 or 9.',
    );
    expect(identifier).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription(
      'Password is at least 8 characters.',
    );
    expect(identifier).toHaveFocus();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('checks a field when it loses focus, before any submit', async () => {
    const user = userEvent.setup();
    renderWithProviders('/login');
    await user.type(screen.getByLabelText('Email or mobile number'), '12345');
    await user.tab();
    expect(screen.getByLabelText('Email or mobile number')).toHaveAttribute('aria-invalid', 'true');
  });

  it('says plainly that nothing was sent when a valid form is submitted', async () => {
    const user = userEvent.setup();
    renderWithProviders('/login');
    await user.type(screen.getByLabelText('Email or mobile number'), '9876543210');
    await user.type(screen.getByLabelText('Password'), 'correct horse');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Sign-in is not connected to the server yet, so nothing was sent.',
    );
  });
});
