export type PlanState = 'Pending' | 'Confirmed' | 'Failed';

export type DisputeStatus =
  | 'voting'
  | 'awaiting_submission'
  | 'under_review'
  | 'upheld'
  | 'rejected'
  | 'withdrawn';

export interface DisputeVote {
  voter: string;
  support: boolean;
  votedAt: number;
}

export interface Dispute {
  id: string;
  planId: number;
  filedBy: string;
  filedAt: number;
  reason: string;
  evidence: string;
  votes: DisputeVote[];
  voteDeadline: number;
  status: DisputeStatus;
  caseId?: string;
  arbitrationSubmittedAt?: number;
  arbitrationResolvedAt?: number;
  arbitrationVerdict?: string;
  arbitrator?: string;
}

export interface UserAccount {
  address: string;
  reputation: number;
  isFrozen: boolean;
  frozenAt?: number;
  frozenReason?: string;
  organizedCount: number;
  committedCount: number;
  disputesWon: number;
  disputesLost: number;
}

export interface Plan {
  id: number;
  organizer: string;
  title: string;
  description: string;
  costPerHead: number;
  threshold: number;
  deadline: number;
  committers: string[];
  hasClaimed: Record<string, boolean>;
  state: PlanState;
  createdAt: number;
  organizerClaimedAt?: number;
  disputeIds: string[];
  disputeWindowEnds: number;
}

export interface Wallet {
  address: string;
  usdcBalance: number;
  usdcAllowance: number;
}

export interface AppState {
  wallet: Wallet | null;
  plans: Plan[];
  nextId: number;
  accounts: Record<string, UserAccount>;
  disputes: Record<string, Dispute>;
}
