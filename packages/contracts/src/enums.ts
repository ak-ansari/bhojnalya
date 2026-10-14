// The closed vocabularies the apps, the API and the database share (TRD §5.3, §13).
// Values are snake_case literals because they are stored and sent as-is.
import { z } from 'zod';

/** Where an order came from. */
export const OrderChannel = z.enum(['pos', 'qr', 'swiggy', 'zomato']);
export type OrderChannel = z.infer<typeof OrderChannel>;

/** How the order is served. */
export const OrderType = z.enum(['dine_in', 'takeaway', 'delivery']);
export type OrderType = z.infer<typeof OrderType>;

/** A kitchen order ticket moves new → preparing → ready. */
export const KotStatus = z.enum(['new', 'preparing', 'ready']);
export type KotStatus = z.infer<typeof KotStatus>;

/** The outlet's GST registration; composition and unregistered print a Bill of Supply. */
export const TaxMode = z.enum(['regular', 'composition', 'unregistered']);
export type TaxMode = z.infer<typeof TaxMode>;

/** Whether menu prices include GST. */
export const PriceMode = z.enum(['inclusive', 'exclusive']);
export type PriceMode = z.infer<typeof PriceMode>;

/** What a registered device is for. */
export const DeviceRole = z.enum(['pos', 'kds']);
export type DeviceRole = z.infer<typeof DeviceRole>;

/** How a payment was received at the counter (PRD P6); recorded, never processed. */
export const PaymentMethod = z.enum(['cash', 'upi', 'card', 'other']);
export type PaymentMethod = z.infer<typeof PaymentMethod>;
