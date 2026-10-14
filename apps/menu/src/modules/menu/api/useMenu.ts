// The seam the menu API will fill (reading the route's QR token); today it is the placeholder menu.
import type { GuestMenu } from '../domain/menu.js';
import { PLACEHOLDER_MENU } from './placeholderMenu.js';

export function useMenu(): GuestMenu {
  return PLACEHOLDER_MENU;
}
