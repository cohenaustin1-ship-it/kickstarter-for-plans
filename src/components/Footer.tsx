export function Footer() {
  return (
    <footer className="border-t border-ink-700/60 mt-16">
      <div className="max-w-6xl mx-auto px-6 py-8 grid sm:grid-cols-3 gap-6 text-xs">
        <div>
          <div className="font-display font-semibold text-white text-sm mb-1.5">
            Kickstarter for Plans
          </div>
          <div className="text-slate-500">
            Mentee Capstone · Dev Track · NYU Stern Blockchain &amp; Fintech Club
          </div>
        </div>
        <div>
          <div className="text-slate-400 font-semibold mb-1.5 uppercase tracking-wider">
            Stack
          </div>
          <div className="text-slate-500 font-mono">
            React · Vite · TypeScript · Tailwind · Solidity
          </div>
        </div>
        <div>
          <div className="text-slate-400 font-semibold mb-1.5 uppercase tracking-wider">
            Target Network
          </div>
          <div className="text-slate-500 font-mono">Base Sepolia · USDC (6 decimals)</div>
        </div>
      </div>
    </footer>
  );
}
