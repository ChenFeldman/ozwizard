import { describe, expect, it } from 'vitest';
import { mapLimit } from '../src/util/collections.js';

const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 1));

describe('mapLimit', () => {
  it('returns results in input order and never exceeds the limit in flight', async () => {
    let inFlight = 0;
    let peak = 0;

    const out = await mapLimit([1, 2, 3, 4, 5, 6, 7], 2, async (n) => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await tick();
      inFlight -= 1;
      return n * 10;
    });

    expect(out).toEqual([10, 20, 30, 40, 50, 60, 70]);
    expect(peak).toBe(2);
  });

  it('propagates the first rejection and rejects an invalid limit', async () => {
    await expect(
      mapLimit([1, 2, 3], 2, async (n) => {
        if (n === 2) throw new Error('boom');
        return n;
      })
    ).rejects.toThrow('boom');

    await expect(mapLimit([1], 0, async (n) => n)).rejects.toThrow(RangeError);
  });
});
