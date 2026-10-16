// Argon2id password hashing (TRD §13), with OWASP's minimum settings:
// 19 MiB of memory, 2 passes, one lane. The hash string carries its own
// settings, so raising them later still verifies older hashes.
import { hash, verify } from '@node-rs/argon2';
import type { Options } from '@node-rs/argon2';
import { Injectable } from '@nestjs/common';

import type { PasswordHasher } from '../app/ports.js';

// The library's default algorithm is Argon2id; its `Algorithm` enum is an
// ambient const enum this build cannot import, so the unit test pins the variant.
const OPTIONS: Options = { memoryCost: 19_456, timeCost: 2, parallelism: 1 };

@Injectable()
export class Argon2PasswordHasher implements PasswordHasher {
  hash(password: string): Promise<string> {
    return hash(password, OPTIONS);
  }

  async verify(passwordHash: string, password: string): Promise<boolean> {
    try {
      return await verify(passwordHash, password);
    } catch {
      // A malformed stored hash never signs anyone in.
      return false;
    }
  }
}
