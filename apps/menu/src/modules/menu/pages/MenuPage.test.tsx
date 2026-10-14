import { cleanup, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

import { renderAt } from '@/testing/renderWithProviders.js';

const QR_TOKEN = '4fK9qXbT2mLw8ZcR1sVyNp';

afterEach(cleanup);

function shownDishes(): string[] {
  return screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
}

function dishRow(name: string): HTMLElement {
  const row = screen
    .getAllByRole('listitem')
    .find((li) => within(li).queryByRole('heading', { name }) !== null);
  if (!row) throw new Error(`no dish row named ${name}`);
  return row;
}

describe('MenuPage', () => {
  it("opens a table's QR link on the outlet's menu for that table", () => {
    renderAt(`/t/${QR_TOKEN}`);

    expect(screen.getByRole('heading', { level: 1, name: 'Brew & Bun Café' })).toBeTruthy();
    expect(screen.getByText("You're at Table T9 · order here, pay at the counter")).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2, name: 'Cold coffee' })).toBeTruthy();
    expect(shownDishes()).toEqual([
      'Classic Cold Coffee',
      'Iced Americano',
      'Vietnamese Iced Coffee',
    ]);
  });

  it('shows each price in rupees from paise', () => {
    renderAt(`/t/${QR_TOKEN}`);

    expect(screen.getByText('₹150')).toBeTruthy();
    expect(screen.getByText('₹130.50')).toBeTruthy();
  });

  it('marks a sold-out dish unavailable instead of describing it', () => {
    renderAt(`/t/${QR_TOKEN}`);

    const row = dishRow('Vietnamese Iced Coffee');
    expect(within(row).getByText('Unavailable')).toBeTruthy();
    expect(within(row).getByText('Sold out for now. Check back soon.')).toBeTruthy();
    expect(within(row).queryByText('Strong drip with condensed milk.')).toBeNull();
  });

  it("sets the outlet's colour as the --brand CSS variable on the page", () => {
    const { container } = renderAt(`/t/${QR_TOKEN}`);

    const root = container.firstElementChild as HTMLElement;
    expect(root.style.getPropertyValue('--brand')).toBe('#6B3A1F');
  });

  it('switches dishes when the guest picks another category', async () => {
    const user = userEvent.setup();
    renderAt(`/t/${QR_TOKEN}`);

    await user.click(screen.getByRole('button', { name: 'Snacks' }));

    expect(screen.getByRole('button', { name: 'Snacks' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(shownDishes()).toEqual(['Vada Pav', 'Chicken Momos']);
  });

  it('hides egg and non-veg dishes under Veg only, and says so when nothing is left', async () => {
    const user = userEvent.setup();
    renderAt(`/t/${QR_TOKEN}`);

    await user.click(screen.getByRole('button', { name: /Veg only/ }));
    await user.click(screen.getByRole('button', { name: 'Snacks' }));
    expect(shownDishes()).toEqual(['Vada Pav']);

    await user.click(screen.getByRole('button', { name: 'Sandwiches' }));
    expect(
      screen.getByText('Nothing in this section is veg. Turn off Veg only to see everything.'),
    ).toBeTruthy();
  });

  it("tells the guest when the link is not a table's QR link", () => {
    renderAt('/menu');

    expect(screen.getByRole('heading', { name: "This link isn't a table's menu" })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Brew & Bun Café' })).toBeNull();
  });
});
