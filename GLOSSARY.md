# Bhojnalya

A restaurant operating system for Indian cafés: the till, the kitchen screen, QR table ordering and aggregator orders, for one café or a chain.

## Orders and the kitchen

**Order**:
What a table, a counter guest, a QR guest or an aggregator asks for, from the first item until it is invoiced or cancelled. It is the running tab, never the financial record.
_Avoid_: Bill, tab, ticket

**KOT**:
Kitchen Order Ticket: the items sent to the kitchen in one "send to kitchen" from an Order. One Order can have several KOTs.
_Avoid_: Ticket, kitchen order

**KOT number**:
A KOT's number from the till that sent it, counting from 1 each business day, so two offline tills never give the same number.
_Avoid_: Ticket number, order number

**Missed order**:
An aggregator Order that was not accepted before the platform's accept deadline. It is kept and reported, but it never gets a KOT or an Invoice.
_Avoid_: Expired order, timed-out order

## Billing

**Invoice**:
The append-only financial record of a sale, numbered from a device series. It comes in two kinds, Tax Invoice and Bill of Supply.
_Avoid_: Bill (UI copy only), receipt

**Tax Invoice**:
An Invoice from a GST-registered regular outlet, showing CGST and SGST.

**Bill of Supply**:
An Invoice from a composition or unregistered outlet, with no tax lines.

**Service charge**:
An optional charge the outlet adds to an Invoice as its own line. The guest can always have it removed, and by default it is taxed at the same rate as the items.
_Avoid_: Tip, service tax

## Platform

**Suspension**:
The platform stops an outlet from trading. The outlet can make no new sales, but Invoices it already made are always accepted.
_Avoid_: Deactivation, block
