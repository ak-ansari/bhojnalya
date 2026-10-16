# App test cases

What the POS and KDS app promises, stated as Given / When / Then, with the
tests that check it. Cited as `app NNNN`. Numbers are stable and never
reused. How to read a case, and what Proposed / Accepted / Superseded and
**GAP** mean: [the platform catalogue](../../../../docs/test-cases/index.md).

Write one with the `test-case` skill.

## Shell, connection and device role

- [0101 An offline device says so and says what still works](./0101-an-offline-device-says-so-and-says-what-still-works.md)
- [0102 Every staff socket connection refetches what is on screen](./0102-every-staff-socket-connection-refetches-what-is-on-screen.md)
- [0103 A device shows only the screens of the role it was registered for](./0103-a-device-shows-only-the-screens-of-the-role-it-was-registered-for.md)

## Local store, invoice series and sync

- [0201 An invoice, its number and its sync change are saved together or not at all](./0201-an-invoice-its-number-and-its-sync-change-are-saved-together-or-not-at-all.md)
- [0202 A device numbers its invoices in one unbroken series per financial year](./0202-a-device-numbers-its-invoices-in-one-unbroken-series-per-financial-year.md)
- [0203 A till whose clock is behind its last bill does not bill](./0203-a-till-whose-clock-is-behind-its-last-bill-does-not-bill.md)
- [0204 Every till change reaches the server in order, and leaves the device only when acknowledged](./0204-every-till-change-reaches-the-server-in-order-and-leaves-the-device-only-when-acknowledged.md)
- [0205 A till with unsynced changes cannot be cleared, and always says how many](./0205-a-till-with-unsynced-changes-cannot-be-cleared-and-always-says-how-many.md)
- [0206 The till asks to keep its storage and warns when bills could be evicted](./0206-the-till-asks-to-keep-its-storage-and-warns-when-bills-could-be-evicted.md)

## Shell robustness and download size

- [0301 A screen that fails to load offers a reload and loses nothing saved on the device](./0301-a-screen-that-fails-to-load-offers-a-reload-and-loses-nothing-saved-on-the-device.md)
- [0302 A kitchen display never downloads the till's local database](./0302-a-kitchen-display-never-downloads-the-tills-local-database.md)
