// Inline stroke-based SVG icons. No external deps.
// All icons inherit currentColor and accept className + size.

import type { SVGProps } from 'react';

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'fill' | 'stroke'> {
  size?: number;
}

const base = ({ size = 16, className = '', ...rest }: IconProps) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  className,
  ...rest,
});

export const Check = (p: IconProps) => (
  <svg {...base(p)}><path d="M5 12l5 5 9-13" /></svg>
);

export const CheckCircle = (p: IconProps) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></svg>
);

export const X = (p: IconProps) => (
  <svg {...base(p)}><path d="M18 6 6 18M6 6l12 12" /></svg>
);

export const XCircle = (p: IconProps) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6m0-6 6 6" /></svg>
);

export const ArrowLeft = (p: IconProps) => (
  <svg {...base(p)}><path d="M19 12H5m7-7-7 7 7 7" /></svg>
);

export const ArrowRight = (p: IconProps) => (
  <svg {...base(p)}><path d="M5 12h14m-7-7 7 7-7 7" /></svg>
);

export const ChevronRight = (p: IconProps) => (
  <svg {...base(p)}><path d="m9 18 6-6-6-6" /></svg>
);

export const Plus = (p: IconProps) => (
  <svg {...base(p)}><path d="M12 5v14M5 12h14" /></svg>
);

export const Wallet = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
    <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
    <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
  </svg>
);

export const User = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

export const Users = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export const Shield = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
  </svg>
);

export const ShieldCheck = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

export const ShieldAlert = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
    <path d="M12 8v4M12 16h.01" />
  </svg>
);

export const AlertTriangle = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
    <path d="M12 9v4M12 17h.01" />
  </svg>
);

export const Gavel = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m14 13-7.5 7.5a2.12 2.12 0 0 1-3-3L11 10" />
    <path d="m16 16 6-6" />
    <path d="m8 8 6-6" />
    <path d="m9 7 8 8" />
    <path d="m21 11-8-8" />
  </svg>
);

export const Lock = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

export const Sparkles = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.6 5.6l2.1 2.1m8.6 8.6 2.1 2.1m0-12.8-2.1 2.1M7.7 16.3l-2.1 2.1" />
  </svg>
);

export const FastForward = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M13 19l9-7-9-7v14ZM2 19l9-7-9-7v14Z" />
  </svg>
);

export const Clock = (p: IconProps) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
);

export const TrendingUp = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M22 7 13.5 15.5 8.5 10.5 2 17" />
    <path d="M16 7h6v6" />
  </svg>
);

export const Star = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2Z" />
  </svg>
);

export const Calendar = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);

export const DollarSign = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

export const Eye = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M2 12s3-8 10-8 10 8 10 8-3 8-10 8-10-8-10-8Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const Send = (p: IconProps) => (
  <svg {...base(p)}><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7Z" /></svg>
);

export const ThumbsUp = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M7 10v12M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H7c-1.1 0-2-.9-2-2v-8c0-1.1.9-2 2-2h2.76a2 2 0 0 0 1.79-1.11L15 2a3.13 3.13 0 0 1 0 3.88Z" />
  </svg>
);

export const ThumbsDown = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M17 14V2M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2H17c1.1 0 2 .9 2 2v8c0 1.1-.9 2-2 2h-2.76a2 2 0 0 0-1.79 1.11L9 22a3.13 3.13 0 0 1 0-3.88Z" />
  </svg>
);

export const ExternalLink = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <path d="M15 3h6v6M10 14 21 3" />
  </svg>
);

export const Loader = (p: IconProps) => (
  <svg {...base(p)} className={`${p.className ?? ''} animate-spin`}>
    <path d="M21 12a9 9 0 1 1-6.22-8.56" opacity="0.25" />
    <path d="M21 12a9 9 0 0 0-6.22-8.56" />
  </svg>
);

export const FileSearch = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
    <circle cx="11.5" cy="14.5" r="2.5" />
    <path d="m13.5 16.5 2 2" />
  </svg>
);

export const Hash = (p: IconProps) => (
  <svg {...base(p)}><path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18" /></svg>
);

export const Briefcase = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="2" y="7" width="20" height="14" rx="2" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </svg>
);

export const Diamond = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 2 4 12l8 10 8-10z" />
    <path d="M12 2 8 12l4 10M12 2l4 10-4 10M4 12h16" />
  </svg>
);

export const Refresh = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" />
  </svg>
);
