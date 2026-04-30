// Demo store + simulated on-chain logic + off-chain dispute resolution.
//
// The smart contract logic (createPlan / commit / finalize / claim) mirrors
// PlanEscrow.sol exactly. The dispute + arbitration logic is OFF-CHAIN:
// in production it would run as a centralized service the company operates,
// with on-chain hooks to slash organizer collateral and freeze accounts.

import type {
  AppState,
  Plan,
  PlanState,
  Wallet,
  Dispute,
  DisputeStatus,
  DisputeVote,
  UserAccount,
} from './types';
import {
  seedPlans,
  seedAccounts,
  seedBalances,
  STORAGE_VERSION,
} from '../data/seed';

const STORAGE_KEY = `kfp:state:${STORAGE_VERSION}`;

// --- Constants -----------------------------------------------------------

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const VOTE_WINDOW_MS = 48 * HOUR;       // dispute voting window
const DISPUTE_WINDOW_MS = 7 * DAY;      // window after deadline to file dispute
const STARTING_USDC = 5000;
const STARTING_REPUTATION = 100;

// Reputation deltas
const REP_ON_SUCCESSFUL_ORG = +5;
const REP_ON_LOSING_DISPUTE_AS_FILER = -8;  // filed a dispute that got rejected
const REP_ON_WINNING_DISPUTE = +3;           // your filed dispute was upheld

// --- Internal helpers ----------------------------------------------------

type Listener = (s: AppState) => void;

// Keyed map of off-chain mock balances for non-user wallets
let _externalBalances: Record<string, number> = {};

function ensureAccount(state: AppState, addr: string): AppState {
  if (state.accounts[addr]) return state;
  const acct: UserAccount = {
    address: addr,
    reputation: STARTING_REPUTATION,
    isFrozen: false,
    organizedCount: 0,
    committedCount: 0,
    disputesWon: 0,
    disputesLost: 0,
  };
  return { ...state, accounts: { ...state.accounts, [addr]: acct } };
}

function updateAccount(
  state: AppState,
  addr: string,
  patch: Partial<UserAccount>
): AppState {
  const existing = state.accounts[addr] ?? {
    address: addr,
    reputation: STARTING_REPUTATION,
    isFrozen: false,
    organizedCount: 0,
    committedCount: 0,
    disputesWon: 0,
    disputesLost: 0,
  };
  return {
    ...state,
    accounts: {
      ...state.accounts,
      [addr]: { ...existing, ...patch },
    },
  };
}

function updatePlan(state: AppState, planId: number, patch: Partial<Plan>): AppState {
  return {
    ...state,
    plans: state.plans.map((p) => (p.id === planId ? { ...p, ...patch } : p)),
  };
}

function updateDispute(
  state: AppState,
  disputeId: string,
  patch: Partial<Dispute>
): AppState {
  const existing = state.disputes[disputeId];
  if (!existing) return state;
  return {
    ...state,
    disputes: {
      ...state.disputes,
      [disputeId]: { ...existing, ...patch },
    },
  };
}

function randomAddress(): string {
  const hex = '0123456789abcdef';
  let out = '0x';
  for (let i = 0; i < 40; i++) out += hex[Math.floor(Math.random() * 16)];
  return out;
}

function randomCaseId(): string {
  // Looks like KFP-2026-0042
  const year = new Date().getFullYear();
  const n = String(Math.floor(Math.random() * 9000) + 1000);
  return `KFP-${year}-${n}`;
}

const ARBITRATORS = [
  'M. Patel · Senior Reviewer',
  'J. Okonkwo · Compliance Lead',
  'S. Rodriguez · Arbitration Counsel',
  'D. Chen · Senior Reviewer',
  'A. Sokolova · Lead Investigator',
];

function pickArbitrator(): string {
  return ARBITRATORS[Math.floor(Math.random() * ARBITRATORS.length)];
}

// --- Store class ---------------------------------------------------------

class Store {
  private state: AppState;
  private listeners = new Set<Listener>();

  constructor() {
    this.state = this.load();
  }

  private load(): AppState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { state: AppState; balances: Record<string, number> };
        if (parsed?.state?.plans && parsed?.state?.accounts && parsed?.state?.disputes) {
          _externalBalances = parsed.balances ?? seedBalances();
          return parsed.state;
        }
      }
    } catch {
      /* fall through */
    }
    const now = Date.now();
    _externalBalances = seedBalances();
    return {
      wallet: null,
      plans: seedPlans(now),
      nextId: 4,
      accounts: seedAccounts(),
      disputes: {},
    };
  }

  private persist() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ state: this.state, balances: _externalBalances })
    );
    this.listeners.forEach((l) => l(this.state));
  }

  subscribe(l: Listener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  get(): AppState {
    return this.state;
  }

  getDisputesForPlan(planId: number): Dispute[] {
    const plan = this.state.plans.find((p) => p.id === planId);
    if (!plan) return [];
    return plan.disputeIds
      .map((id) => this.state.disputes[id])
      .filter(Boolean);
  }

  getAccount(addr: string | null | undefined): UserAccount | null {
    if (!addr) return null;
    return this.state.accounts[addr] ?? null;
  }

  // --- Wallet (mocked Privy) ---------------------------------------------

  connect(): Wallet {
    if (this.state.wallet) return this.state.wallet;
    const address = randomAddress();
    const wallet: Wallet = {
      address,
      usdcBalance: STARTING_USDC,
      usdcAllowance: 0,
    };
    this.state = ensureAccount({ ...this.state, wallet }, address);
    this.persist();
    return wallet;
  }

  disconnect() {
    this.state = { ...this.state, wallet: null };
    this.persist();
  }

  // --- USDC --------------------------------------------------------------

  approve(amount: number) {
    if (!this.state.wallet) throw new Error('No wallet connected');
    const wallet: Wallet = { ...this.state.wallet, usdcAllowance: amount };
    this.state = { ...this.state, wallet };
    this.persist();
  }

  // --- Plan writes -------------------------------------------------------

  createPlan(input: {
    title: string;
    description: string;
    costPerHead: number;
    threshold: number;
    deadline: number;
  }): Plan {
    if (!this.state.wallet) throw new Error('No wallet connected');
    const myAcct = this.state.accounts[this.state.wallet.address];
    if (myAcct?.isFrozen)
      throw new Error('Account is frozen. You cannot create new plans.');
    if (input.costPerHead <= 0) throw new Error('costPerHead must be > 0');
    if (input.threshold <= 0) throw new Error('threshold must be > 0');
    if (input.deadline <= Date.now())
      throw new Error('deadline must be in the future');

    const plan: Plan = {
      id: this.state.nextId,
      organizer: this.state.wallet.address,
      title: input.title.trim(),
      description: input.description.trim(),
      costPerHead: input.costPerHead,
      threshold: input.threshold,
      deadline: input.deadline,
      committers: [],
      hasClaimed: {},
      state: 'Pending',
      createdAt: Date.now(),
      disputeIds: [],
      disputeWindowEnds: input.deadline + DISPUTE_WINDOW_MS,
    };

    let next: AppState = {
      ...this.state,
      plans: [plan, ...this.state.plans],
      nextId: this.state.nextId + 1,
    };
    next = updateAccount(next, this.state.wallet.address, {
      organizedCount: (myAcct?.organizedCount ?? 0) + 1,
    });
    this.state = next;
    this.persist();
    return plan;
  }

  commit(planId: number) {
    if (!this.state.wallet) throw new Error('No wallet connected');
    const me = this.state.wallet.address;
    const myAcct = this.state.accounts[me];
    if (myAcct?.isFrozen) throw new Error('Account is frozen.');

    const plan = this.state.plans.find((p) => p.id === planId);
    if (!plan) throw new Error('Plan not found');
    if (plan.state !== 'Pending') throw new Error('Plan is not Pending');
    if (Date.now() >= plan.deadline) throw new Error('Past deadline');
    if (plan.committers.includes(me)) throw new Error('Already committed');
    if (this.state.wallet.usdcAllowance < plan.costPerHead)
      throw new Error('Allowance too low — approve first');
    if (this.state.wallet.usdcBalance < plan.costPerHead)
      throw new Error('Insufficient USDC');

    const wallet: Wallet = {
      ...this.state.wallet,
      usdcBalance: this.state.wallet.usdcBalance - plan.costPerHead,
      usdcAllowance: this.state.wallet.usdcAllowance - plan.costPerHead,
    };

    let next: AppState = updatePlan(
      { ...this.state, wallet },
      planId,
      { committers: [...plan.committers, me] }
    );
    next = updateAccount(next, me, {
      committedCount: (myAcct?.committedCount ?? 0) + 1,
    });
    this.state = next;
    this.persist();
  }

  finalize(planId: number) {
    const plan = this.state.plans.find((p) => p.id === planId);
    if (!plan) throw new Error('Plan not found');
    if (plan.state !== 'Pending') throw new Error('Already finalized');
    if (Date.now() < plan.deadline) throw new Error('Deadline not reached');

    const newState: PlanState =
      plan.committers.length >= plan.threshold ? 'Confirmed' : 'Failed';

    let next = updatePlan(this.state, planId, { state: newState });

    // If failed: each committer's "committed but no event" doesn't change rep.
    // If confirmed: organizer gets rep boost when they actually claim
    //   (we only count successful events that complete cleanly).
    this.state = next;
    this.persist();
  }

  claim(planId: number) {
    if (!this.state.wallet) throw new Error('No wallet connected');
    const plan = this.state.plans.find((p) => p.id === planId);
    if (!plan) throw new Error('Plan not found');
    const me = this.state.wallet.address;
    if (plan.state === 'Pending') throw new Error('Plan not finalized');
    if (plan.hasClaimed[me]) throw new Error('Already claimed');

    let amount = 0;
    let isOrgClaim = false;
    if (plan.state === 'Confirmed') {
      if (plan.organizer !== me) throw new Error('Only organizer can claim');
      amount = plan.costPerHead * plan.committers.length;
      isOrgClaim = true;
    } else {
      if (!plan.committers.includes(me)) throw new Error('Not a committer');
      amount = plan.costPerHead;
    }

    const wallet: Wallet = {
      ...this.state.wallet,
      usdcBalance: this.state.wallet.usdcBalance + amount,
    };
    let next = updatePlan(
      { ...this.state, wallet },
      planId,
      {
        hasClaimed: { ...plan.hasClaimed, [me]: true },
        ...(isOrgClaim ? { organizerClaimedAt: Date.now() } : {}),
      }
    );
    if (isOrgClaim) {
      const acct = next.accounts[me];
      next = updateAccount(next, me, {
        reputation: Math.min(100, (acct?.reputation ?? STARTING_REPUTATION) + REP_ON_SUCCESSFUL_ORG),
      });
    }
    this.state = next;
    this.persist();
  }

  // --- Disputes (off-chain) ----------------------------------------------

  fileDispute(input: {
    planId: number;
    reason: string;
    evidence: string;
  }): Dispute {
    if (!this.state.wallet) throw new Error('No wallet connected');
    const me = this.state.wallet.address;
    const plan = this.state.plans.find((p) => p.id === input.planId);
    if (!plan) throw new Error('Plan not found');
    if (plan.state !== 'Confirmed')
      throw new Error('Disputes can only be filed on Confirmed plans.');
    if (!plan.committers.includes(me))
      throw new Error('Only committers can file disputes.');
    if (Date.now() > plan.disputeWindowEnds)
      throw new Error('Dispute window has closed (7 days after deadline).');
    if (input.reason.trim().length < 20)
      throw new Error('Reason must be at least 20 characters.');

    // Each committer can file at most one open dispute per plan
    const existingByMe = plan.disputeIds
      .map((id) => this.state.disputes[id])
      .find((d) => d?.filedBy === me && d.status !== 'rejected' && d.status !== 'withdrawn');
    if (existingByMe) throw new Error('You already have an open dispute on this plan.');

    const id = `disp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = Date.now();
    const dispute: Dispute = {
      id,
      planId: input.planId,
      filedBy: me,
      filedAt: now,
      reason: input.reason.trim(),
      evidence: input.evidence.trim(),
      votes: [
        // Filing implicitly counts as a support vote
        { voter: me, support: true, votedAt: now },
      ],
      voteDeadline: now + VOTE_WINDOW_MS,
      status: 'voting',
    };

    let next: AppState = {
      ...this.state,
      disputes: { ...this.state.disputes, [id]: dispute },
    };
    next = updatePlan(next, input.planId, { disputeIds: [...plan.disputeIds, id] });
    this.state = next;
    this.persist();
    return dispute;
  }

  voteOnDispute(disputeId: string, support: boolean) {
    if (!this.state.wallet) throw new Error('No wallet connected');
    const me = this.state.wallet.address;
    this._castVote(disputeId, me, support);
  }

  /** Demo affordance: simulate other committers voting. */
  simulateVotes(disputeId: string, opts: { allSupport?: boolean; mixed?: boolean } = {}) {
    const d = this.state.disputes[disputeId];
    if (!d) throw new Error('Dispute not found');
    const plan = this.state.plans.find((p) => p.id === d.planId);
    if (!plan) return;
    const remaining = plan.committers.filter(
      (c) => c !== this.state.wallet?.address && !d.votes.some((v) => v.voter === c)
    );
    remaining.forEach((addr, i) => {
      let support: boolean;
      if (opts.allSupport) support = true;
      else if (opts.mixed) support = i % 2 === 0;
      else support = Math.random() > 0.3;
      this._castVote(disputeId, addr, support);
    });
  }

  private _castVote(disputeId: string, voter: string, support: boolean) {
    const d = this.state.disputes[disputeId];
    if (!d) throw new Error('Dispute not found');
    if (d.status !== 'voting' && d.status !== 'awaiting_submission')
      throw new Error('Voting closed for this dispute');
    const plan = this.state.plans.find((p) => p.id === d.planId);
    if (!plan) throw new Error('Plan not found');
    if (plan.organizer === voter)
      throw new Error('The organizer cannot vote on disputes against them.');
    if (!plan.committers.includes(voter))
      throw new Error('Only committers may vote.');
    if (d.votes.some((v) => v.voter === voter))
      throw new Error('Already voted.');

    const vote: DisputeVote = { voter, support, votedAt: Date.now() };
    let next = updateDispute(this.state, disputeId, { votes: [...d.votes, vote] });

    // Auto-promote to awaiting_submission once a quorum + majority is reached.
    const dNext = next.disputes[disputeId];
    if (this._voteHasPassed(dNext, plan.committers.length)) {
      next = updateDispute(next, disputeId, { status: 'awaiting_submission' });
    }
    this.state = next;
    this.persist();
  }

  /** Quorum: at least 50% of non-organizer committers voted.
   *  Pass: > 50% support among voters. */
  private _voteHasPassed(d: Dispute, totalCommitters: number): boolean {
    const eligibleVoters = totalCommitters; // all committers (filer counts)
    const voted = d.votes.length;
    const support = d.votes.filter((v) => v.support).length;
    if (voted < Math.ceil(eligibleVoters / 2)) return false;
    return support * 2 > voted;
  }

  /** Send a passed-vote dispute to the external KFP Arbitration Service. */
  submitToArbitration(disputeId: string) {
    if (!this.state.wallet) throw new Error('No wallet connected');
    const d = this.state.disputes[disputeId];
    if (!d) throw new Error('Dispute not found');
    if (d.status !== 'awaiting_submission')
      throw new Error('Dispute is not eligible for arbitration yet.');

    const next = updateDispute(this.state, disputeId, {
      status: 'under_review',
      caseId: randomCaseId(),
      arbitrationSubmittedAt: Date.now(),
      arbitrator: pickArbitrator(),
    });
    this.state = next;
    this.persist();
  }

  /** Simulated team verdict. Auto-resolves based on vote weight + freshness.
   *  In production this is a manual review by the company's compliance team. */
  resolveArbitration(disputeId: string, forceVerdict?: 'uphold' | 'reject') {
    const d = this.state.disputes[disputeId];
    if (!d) throw new Error('Dispute not found');
    if (d.status !== 'under_review')
      throw new Error('Dispute is not under review.');
    const plan = this.state.plans.find((p) => p.id === d.planId);
    if (!plan) return;

    // Decide verdict
    let uphold: boolean;
    if (forceVerdict) {
      uphold = forceVerdict === 'uphold';
    } else {
      const support = d.votes.filter((v) => v.support).length;
      const supportRatio = support / d.votes.length;
      uphold = supportRatio >= 0.66; // strong majority -> uphold
    }

    const verdict = uphold
      ? buildUpholdVerdict(plan, d)
      : buildRejectVerdict(plan, d);

    let next: AppState = updateDispute(this.state, disputeId, {
      status: uphold ? 'upheld' : 'rejected',
      arbitrationResolvedAt: Date.now(),
      arbitrationVerdict: verdict,
    });

    if (uphold) {
      next = this._executeSeizureAndRefunds(next, plan, d);
    } else {
      // Filer's reputation drops slightly for losing
      const filerAcct = next.accounts[d.filedBy];
      if (filerAcct) {
        next = updateAccount(next, d.filedBy, {
          reputation: Math.max(0, filerAcct.reputation + REP_ON_LOSING_DISPUTE_AS_FILER),
          disputesLost: filerAcct.disputesLost + 1,
        });
      }
    }
    this.state = next;
    this.persist();
  }

  /** When dispute upheld: freeze organizer, slash their USDC balance,
   *  redistribute as refunds to ALL committers (filer included). */
  private _executeSeizureAndRefunds(
    state: AppState,
    plan: Plan,
    dispute: Dispute
  ): AppState {
    let next = state;
    const totalToRefund = plan.costPerHead * plan.committers.length;

    // Freeze organizer
    const orgAcct = next.accounts[plan.organizer];
    next = updateAccount(next, plan.organizer, {
      isFrozen: true,
      frozenAt: Date.now(),
      frozenReason: `KFP Arbitration upheld dispute #${dispute.caseId} on plan #${plan.id}.`,
      reputation: 0,
      disputesLost: (orgAcct?.disputesLost ?? 0) + 1,
    });

    // Slash organizer's USDC balance up to amount needed.
    // Real arbitration would use staked collateral. Here we just zero out their wallet.
    if (next.wallet?.address === plan.organizer) {
      const slash = Math.min(next.wallet.usdcBalance, totalToRefund);
      next = {
        ...next,
        wallet: {
          ...next.wallet,
          usdcBalance: Math.max(0, next.wallet.usdcBalance - slash),
        },
      };
    } else {
      const orgBal = _externalBalances[plan.organizer] ?? 0;
      _externalBalances[plan.organizer] = Math.max(0, orgBal - totalToRefund);
    }

    // Refund all committers their costPerHead
    for (const committer of plan.committers) {
      if (next.wallet?.address === committer) {
        next = {
          ...next,
          wallet: {
            ...next.wallet,
            usdcBalance: next.wallet.usdcBalance + plan.costPerHead,
          },
        };
      } else {
        _externalBalances[committer] =
          (_externalBalances[committer] ?? 0) + plan.costPerHead;
      }
    }

    // Filer rep boost
    const filerAcct = next.accounts[dispute.filedBy];
    if (filerAcct) {
      next = updateAccount(next, dispute.filedBy, {
        reputation: Math.min(100, filerAcct.reputation + REP_ON_WINNING_DISPUTE),
        disputesWon: filerAcct.disputesWon + 1,
      });
    }

    return next;
  }

  withdrawDispute(disputeId: string) {
    if (!this.state.wallet) throw new Error('No wallet connected');
    const d = this.state.disputes[disputeId];
    if (!d) throw new Error('Dispute not found');
    if (d.filedBy !== this.state.wallet.address)
      throw new Error('Only the filer can withdraw');
    if (d.status === 'upheld' || d.status === 'rejected' || d.status === 'withdrawn')
      throw new Error('Cannot withdraw a resolved dispute');
    this.state = updateDispute(this.state, disputeId, { status: 'withdrawn' });
    this.persist();
  }

  // --- Demo helpers ------------------------------------------------------

  reset() {
    localStorage.removeItem(STORAGE_KEY);
    _externalBalances = seedBalances();
    this.state = this.load();
    this.persist();
  }

  expirePlan(planId: number) {
    const plan = this.state.plans.find((p) => p.id === planId);
    if (!plan) return;
    this.state = updatePlan(this.state, planId, { deadline: Date.now() - 1000 });
    this.persist();
  }

  /** Demo: quickly fill a plan to threshold using fake committer addresses. */
  simulateCommits(planId: number) {
    const plan = this.state.plans.find((p) => p.id === planId);
    if (!plan) return;
    const need = plan.threshold - plan.committers.length;
    if (need <= 0) return;
    const newCommitters: string[] = [];
    for (let i = 0; i < need; i++) {
      newCommitters.push(randomAddress());
    }
    let next = updatePlan(this.state, planId, {
      committers: [...plan.committers, ...newCommitters],
    });
    // Seed accounts for them too
    for (const a of newCommitters) {
      next = updateAccount(next, a, {
        committedCount: 1,
        reputation: 90 + Math.floor(Math.random() * 8),
      });
    }
    this.state = next;
    this.persist();
  }
}

// --- Verdict builders ----------------------------------------------------

function buildUpholdVerdict(plan: Plan, d: Dispute): string {
  const support = d.votes.filter((v) => v.support).length;
  const total = d.votes.length;
  return [
    `After review of dispute ${d.caseId} concerning Plan #${plan.id} ("${plan.title}"),`,
    `the KFP Arbitration team has UPHELD the complaint filed by ${d.filedBy.slice(0, 10)}…`,
    ``,
    `Findings:`,
    `• Committer vote: ${support}/${total} supported the dispute (${Math.round((support / total) * 100)}%).`,
    `• The cited reason and supplied evidence indicate the organizer did not deliver`,
    `  the event as agreed, or did not refund committers when the event was cancelled.`,
    `• No counter-evidence was submitted by the organizer within the 24-hour response window.`,
    ``,
    `Remedy:`,
    `• Organizer ${plan.organizer.slice(0, 10)}… is FROZEN from creating new plans.`,
    `• ${plan.committers.length}× refunds of $${plan.costPerHead} USDC have been disbursed.`,
    `• Reputation set to 0; account flagged on the KFP registry.`,
  ].join('\n');
}

function buildRejectVerdict(plan: Plan, d: Dispute): string {
  const support = d.votes.filter((v) => v.support).length;
  const total = d.votes.length;
  return [
    `After review of dispute ${d.caseId} concerning Plan #${plan.id} ("${plan.title}"),`,
    `the KFP Arbitration team has REJECTED the complaint.`,
    ``,
    `Findings:`,
    `• Committer vote: ${support}/${total} supported the dispute (${Math.round((support / total) * 100)}%).`,
    `• The standard for a refund order (clear non-delivery, supported by evidence`,
    `  and a strong majority of committers) was not met.`,
    `• The plan remains Confirmed; no funds will be clawed back.`,
    ``,
    `Notes:`,
    `• The filer's reputation has been reduced by ${Math.abs(REP_ON_LOSING_DISPUTE_AS_FILER)} points.`,
    `• Filers may appeal once within 14 days with new evidence.`,
  ].join('\n');
}

// --- Exports -------------------------------------------------------------

export const store = new Store();

import { useEffect, useState } from 'react';

export function useStore(): AppState {
  const [s, setS] = useState(() => store.get());
  useEffect(() => store.subscribe(setS), []);
  return s;
}

export function useTick(intervalMs = 30_000) {
  const [, setT] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setT((t) => t + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
}

// Helpers exposed for components

export function voteSummary(d: Dispute, totalCommitters: number) {
  const support = d.votes.filter((v) => v.support).length;
  const oppose = d.votes.length - support;
  const pct = d.votes.length === 0 ? 0 : Math.round((support / d.votes.length) * 100);
  const quorumNeeded = Math.ceil(totalCommitters / 2);
  const quorumMet = d.votes.length >= quorumNeeded;
  return { support, oppose, total: d.votes.length, pct, quorumNeeded, quorumMet };
}

export function disputeStatusLabel(s: DisputeStatus): string {
  switch (s) {
    case 'voting': return 'Voting open';
    case 'awaiting_submission': return 'Vote passed · ready for arbitration';
    case 'under_review': return 'Under review by KFP Arbitration';
    case 'upheld': return 'Upheld · refunds disbursed';
    case 'rejected': return 'Rejected · plan stands';
    case 'withdrawn': return 'Withdrawn by filer';
  }
}
