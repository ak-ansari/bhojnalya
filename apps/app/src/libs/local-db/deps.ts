// Time and ids for local writes, injected so tests pin them (invariant 8).
import { newId, type Uuidv7 } from '@bhojnalya/contracts';

export interface LocalDeps {
  now: () => Date;
  newId: () => Uuidv7;
}

export const realDeps: LocalDeps = {
  now: () => new Date(),
  newId: () => newId(),
};
