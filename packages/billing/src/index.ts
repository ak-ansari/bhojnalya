// Pure, deterministic billing and GST engine shared by the POS and the API (TRD §6.1).
// Scaffold only (ticket 01): the real public surface lands with later tickets.
export const workspace = '@bhojnalya/billing';

// Invoice numbering, financial year, business date and the clock guard (ticket 04).
export * from './numbering/index.js';
