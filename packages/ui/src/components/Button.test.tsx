import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Button } from './Button.js';

describe('Button', () => {
  it('is a plain button by default so it never submits a form by accident', () => {
    render(<Button>Send KOT</Button>);
    expect(screen.getByRole('button', { name: 'Send KOT' })).toHaveAttribute('type', 'button');
  });

  it('keeps the 48 px touch height whatever the variant', () => {
    render(<Button variant="primary">Bill ₹551.00</Button>);
    expect(screen.getByRole('button', { name: 'Bill ₹551.00' })).toHaveClass('min-h-touch');
  });

  it('lets a caller override the text colour without losing the font size', () => {
    render(
      <Button variant="primary" className="text-fg">
        Accept
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Accept' });
    expect(button).toHaveClass('text-fg', 'text-body');
    expect(button).not.toHaveClass('text-white');
  });
});
