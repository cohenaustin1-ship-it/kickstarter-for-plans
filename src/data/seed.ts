import type { Plan, UserAccount } from '../lib/types';

const DAY = 24 * 60 * 60 * 1000;

// Bumped storage version to invalidate v1 caches that don't have accounts/disputes.
export const STORAGE_VERSION = 'v2';

// Demo addresses we control across seeded plans, so we can simulate other
// committers voting on disputes. Stable across reloads.
export const DEMO_ADDRS = {
  ateraOrganizer:    '0xA73E4f9C8d2E1B7a5C9F2D8e4B1a6C3f5D8e2B1a',
  ateraCommitterB:   '0xB12c4e8F9a3D5b7C2e9F1a8D6c3B5e7F1a4D9c2E',
  ateraCommitterC:   '0xC34D5e9A1b8F2c7E4d6B9F3a1C8e5D2b7F4a1C9E',
  ateraCommitterD:   '0xD56e7F1c4B9a2E8d5C7F3b1a9D6e4C2f8B5a3D1F',
  knicksOrganizer:   '0xE78f9A2b5C7e1D4f8B2c6E9a3F5b1C8d4E7a2F9C',
  knicksCommitter:   '0xF89A1b3D6e8C2f5A7d9E4b1c6F3a8D5e2C7f4B1A',
  skiOrganizer:      '0x1A2b3C4d5E6f7A8b9C0d1E2f3A4b5C6d7E8f9A0B',
  skiCommitterA:     '0x2B3c4D5e6F7a8B9c0D1e2F3a4B5c6D7e8F9a0B1C',
  skiCommitterB:     '0x3C4d5E6f7A8b9C0d1E2f3A4b5C6d7E8f9A0b1C2D',
  skiCommitterC:     '0x4D5e6F7a8B9c0D1e2F3a4B5c6D7e8F9a0B1c2D3E',
  skiCommitterD:     '0x5E6f7A8b9C0d1E2f3A4b5C6d7E8f9A0b1C2d3E4F',
};

export function seedPlans(now: number): Plan[] {
  return [
    {
      id: 1,
      organizer: DEMO_ADDRS.ateraOrganizer,
      title: 'Dinner at Atera',
      description:
        'Tasting menu at Atera in Tribeca. Two Michelin stars. Reservation locked for 6:00 PM Wednesday — only fires if at least 4 people commit.',
      costPerHead: 300,
      threshold: 4,
      deadline: now + 2 * DAY + 6 * 60 * 60 * 1000,
      committers: [
        DEMO_ADDRS.ateraCommitterB,
        DEMO_ADDRS.ateraCommitterC,
        DEMO_ADDRS.ateraCommitterD,
      ],
      hasClaimed: {},
      state: 'Pending',
      createdAt: now - 2 * DAY,
      disputeIds: [],
      disputeWindowEnds: now + 2 * DAY + 6 * 60 * 60 * 1000 + 7 * DAY,
    },
    {
      id: 2,
      organizer: DEMO_ADDRS.knicksOrganizer,
      title: 'Knicks vs Celtics — Lower Bowl',
      description:
        'Section 113, Row 18. Game is Saturday night. Need 4 to make the buy worth it.',
      costPerHead: 450,
      threshold: 4,
      deadline: now + 5 * DAY,
      committers: [DEMO_ADDRS.knicksCommitter],
      hasClaimed: {},
      state: 'Pending',
      createdAt: now - 1 * DAY,
      disputeIds: [],
      disputeWindowEnds: now + 5 * DAY + 7 * DAY,
    },
    {
      id: 3,
      organizer: DEMO_ADDRS.skiOrganizer,
      title: 'Group Ski Trip — Hunter Mountain',
      description:
        'Saturday lift tickets + bus from Manhattan. Priced for a group of 12; refunds if we cannot fill it.',
      costPerHead: 180,
      threshold: 12,
      deadline: now + 10 * DAY,
      committers: [
        DEMO_ADDRS.skiCommitterA,
        DEMO_ADDRS.skiCommitterB,
        DEMO_ADDRS.skiCommitterC,
        DEMO_ADDRS.skiCommitterD,
      ],
      hasClaimed: {},
      state: 'Pending',
      createdAt: now - 3 * DAY,
      disputeIds: [],
      disputeWindowEnds: now + 10 * DAY + 7 * DAY,
    },
  ];
}

export function seedAccounts(): Record<string, UserAccount> {
  const accts: Record<string, UserAccount> = {};
  const fresh = (address: string, reputation = 95): UserAccount => ({
    address,
    reputation,
    isFrozen: false,
    organizedCount: 0,
    committedCount: 0,
    disputesWon: 0,
    disputesLost: 0,
  });
  // Organizers start with rep 92-98 to look like established users
  accts[DEMO_ADDRS.ateraOrganizer]  = { ...fresh(DEMO_ADDRS.ateraOrganizer,  96), organizedCount: 4 };
  accts[DEMO_ADDRS.knicksOrganizer] = { ...fresh(DEMO_ADDRS.knicksOrganizer, 92), organizedCount: 2 };
  accts[DEMO_ADDRS.skiOrganizer]    = { ...fresh(DEMO_ADDRS.skiOrganizer,    98), organizedCount: 7 };

  // Committers
  for (const a of [
    DEMO_ADDRS.ateraCommitterB,
    DEMO_ADDRS.ateraCommitterC,
    DEMO_ADDRS.ateraCommitterD,
    DEMO_ADDRS.knicksCommitter,
    DEMO_ADDRS.skiCommitterA,
    DEMO_ADDRS.skiCommitterB,
    DEMO_ADDRS.skiCommitterC,
    DEMO_ADDRS.skiCommitterD,
  ]) {
    accts[a] = { ...fresh(a, 90 + Math.floor(Math.random() * 8)), committedCount: 1 + Math.floor(Math.random() * 3) };
  }
  return accts;
}

// Each demo committer has a baseline mock balance for asset-seizure to come from.
export function seedBalances(): Record<string, number> {
  return {
    [DEMO_ADDRS.ateraOrganizer]:    8500,
    [DEMO_ADDRS.knicksOrganizer]:   3200,
    [DEMO_ADDRS.skiOrganizer]:     12000,
    [DEMO_ADDRS.ateraCommitterB]:   4200,
    [DEMO_ADDRS.ateraCommitterC]:   6000,
    [DEMO_ADDRS.ateraCommitterD]:   2800,
    [DEMO_ADDRS.knicksCommitter]:   3500,
    [DEMO_ADDRS.skiCommitterA]:     5000,
    [DEMO_ADDRS.skiCommitterB]:     4500,
    [DEMO_ADDRS.skiCommitterC]:     3700,
    [DEMO_ADDRS.skiCommitterD]:     2900,
  };
}
