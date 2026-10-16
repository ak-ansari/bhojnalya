import { render, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import { describe, expect, it } from 'vitest';

import { LOCAL_DB_NAME, PosDb, readMeta, writeMeta } from './db';
import { LocalDbContext, useLocalDb } from './LocalDbContext';
import { LocalDbScope } from './LocalDbScope';

import { createTestDb } from '@/testing/localDb';

/** Writes on mount, as a POS screen does, and reports the database it wrote to. */
function WritesOnMount({ onWrite }: { onWrite: (db: PosDb) => void }) {
  const db = useLocalDb();
  useEffect(() => {
    void writeMeta(db, 'pullCursor', 'c1').then(() => {
      onWrite(db);
    });
  }, [db, onWrite]);
  return null;
}

describe('LocalDbScope', () => {
  it("opens this device's database for the first screen's write when none is provided", async () => {
    const written: PosDb[] = [];
    render(
      <LocalDbScope>
        <WritesOnMount onWrite={(db) => written.push(db)} />
      </LocalDbScope>,
    );

    await waitFor(() => {
      expect(written).toHaveLength(1);
    });
    expect(written[0]?.name).toBe(LOCAL_DB_NAME);
    expect(await readMeta(new PosDb(), 'pullCursor')).toBe('c1');
  });

  it('gives every POS screen on the page the same instance', () => {
    const seen: PosDb[] = [];
    function Capture() {
      seen.push(useLocalDb());
      return null;
    }
    render(
      <>
        <LocalDbScope>
          <Capture />
        </LocalDbScope>
        <LocalDbScope>
          <Capture />
        </LocalDbScope>
      </>,
    );

    expect(seen[0]).toBeInstanceOf(PosDb);
    expect(seen[1]).toBe(seen[0]);
  });

  it('uses a database provided above it instead', () => {
    const provided = createTestDb();
    let seen: PosDb | undefined;
    function Capture() {
      seen = useLocalDb();
      return null;
    }
    render(
      <LocalDbContext.Provider value={provided}>
        <LocalDbScope>
          <Capture />
        </LocalDbScope>
      </LocalDbContext.Provider>,
    );

    expect(seen).toBe(provided);
  });
});
