import type { UserAccount } from '../lib/types';
import { Star, Lock, ShieldCheck } from './icons';

interface Props {
  account: UserAccount | null;
  size?: 'sm' | 'md' | 'lg';
}

export function ReputationBadge({ account, size = 'sm' }: Props) {
  if (!account) return null;

  const rep = account.reputation;
  const frozen = account.isFrozen;

  const tier =
    frozen ? 'frozen' :
    rep >= 90 ? 'high' :
    rep >= 70 ? 'mid' :
    rep >= 40 ? 'low' :
    'critical';

  const styles: Record<typeof tier, string> = {
    high:     'bg-signal-500/15 text-signal-400 ring-1 ring-signal-500/30',
    mid:      'bg-warn-500/15 text-warn-400 ring-1 ring-warn-500/30',
    low:      'bg-orange-500/15 text-orange-400 ring-1 ring-orange-500/30',
    critical: 'bg-danger-500/15 text-danger-400 ring-1 ring-danger-500/30',
    frozen:   'bg-danger-500/20 text-danger-400 ring-1 ring-danger-500/40',
  };

  const sizing = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-sm px-2.5 py-1 gap-1.5',
    lg: 'text-base px-3 py-1.5 gap-2',
  }[size];

  const iconSize = size === 'lg' ? 16 : size === 'md' ? 14 : 12;

  return (
    <span
      className={`inline-flex items-center rounded-md font-medium font-mono ${styles[tier]} ${sizing}`}
      title={
        frozen
          ? `Account frozen — ${account.frozenReason ?? 'arbitration'}`
          : `Reputation: ${rep}/100`
      }
    >
      {frozen ? (
        <>
          <Lock size={iconSize} />
          FROZEN
        </>
      ) : tier === 'high' ? (
        <>
          <ShieldCheck size={iconSize} />
          {rep}
        </>
      ) : (
        <>
          <Star size={iconSize} />
          {rep}
        </>
      )}
    </span>
  );
}
