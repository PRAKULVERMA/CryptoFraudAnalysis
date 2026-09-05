import React, { useEffect, useState, useRef } from 'react';
import { motion, useInView } from 'motion/react';
import {
  Wallet,
  GitFork,
  ShieldAlert,
  Building2,
  TrendingUp,
  ArrowUpRight,
  Radar,
  CheckCircle2,
} from 'lucide-react';

interface StatItemProps {
  id: string;
  step: string;
  title: string;
  targetValue: number;
  suffix: string;
  decimals?: number;
  icon: React.ElementType;
  description: string;
  changeRate: string;
}

const AnimatedCounterCard: React.FC<StatItemProps> = ({
  step,
  title,
  targetValue,
  suffix,
  decimals = 0,
  icon: Icon,
  description,
  changeRate,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const [displayVal, setDisplayVal] = useState(0);

  useEffect(() => {
    if (!isInView) return;

    let start = 0;
    const duration = 1800; // ms
    const startTime = performance.now();

    const update = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = start + (targetValue - start) * ease;
      setDisplayVal(current);

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        setDisplayVal(targetValue);
      }
    };

    requestAnimationFrame(update);
  }, [isInView, targetValue]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="glass-card rounded-2xl p-7 glass-border relative overflow-hidden group hover:border-[#A58B6F]/40 transition-all duration-300 shadow-xl"
    >
      {/* Background Subtle Grid */}
      <div className="absolute inset-0 cyber-grid-bg opacity-20 group-hover:opacity-40 transition-opacity" />

      {/* Top Bar with Number & Icon */}
      <div className="relative z-10 flex items-center justify-between mb-5">
        <span className="font-mono text-xs text-[#A58B6F] tracking-widest uppercase font-semibold">
          {step}
        </span>
        <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-[#A58B6F] group-hover:border-[#A58B6F]/50 group-hover:bg-[#A58B6F]/10 transition-all">
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {/* Title */}
      <div className="relative z-10 font-inter text-xs uppercase tracking-[0.2em] text-neutral-400 opacity-80 mb-2">
        {title}
      </div>

      {/* Animated Big Number */}
      <div className="relative z-10 font-playfair text-3xl sm:text-4xl lg:text-5xl font-light text-white mb-2 tracking-tight">
        {decimals > 0
          ? displayVal.toFixed(decimals)
          : Math.floor(displayVal).toLocaleString()}
        <span className="text-[#A58B6F] font-normal text-2xl sm:text-3xl ml-0.5">
          {suffix}
        </span>
      </div>

      {/* Description & Change Tag */}
      <div className="relative z-10 flex items-center justify-between text-xs font-inter pt-3 border-t border-white/5">
        <span className="text-neutral-400 opacity-70 text-[11px] leading-tight">
          {description}
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-mono shrink-0 ml-2">
          <TrendingUp className="w-3 h-3" />
          {changeRate}
        </span>
      </div>
    </motion.div>
  );
};

export const LiveAnalyticsStats: React.FC = () => {
  const [stats, setStats] = useState([
    {
      id: 'stat-wallets',
      step: '01',
      title: 'WALLETS ANALYZED',
      targetValue: 12847,
      suffix: '+',
      decimals: 0,
      icon: Wallet,
      description: 'Active suspect addresses ingested & clustered',
      changeRate: '+18.4% MoM',
    },
    {
      id: 'stat-paths',
      step: '02',
      title: 'TRANSACTION PATHS',
      targetValue: 85000,
      suffix: '+',
      decimals: 0,
      icon: GitFork,
      description: 'Cross-block UTXO & token transfer hops mapped',
      changeRate: '+34.2% peak',
    },
    {
      id: 'stat-fraud',
      step: '03',
      title: 'FRAUD NETWORKS DETECTED',
      targetValue: 1240,
      suffix: '+',
      decimals: 0,
      icon: ShieldAlert,
      description: 'Syndicates, peeling chains & mixer rings unmasked',
      changeRate: '99.4% precision',
    },
    {
      id: 'stat-exchanges',
      step: '04',
      title: 'EXCHANGE DESTINATIONS IDENTIFIED',
      targetValue: 94.7,
      suffix: '%',
      decimals: 1,
      icon: Building2,
      description: 'Successful off-ramp attribution rate for legal seizure',
      changeRate: '+4.8% delta',
    },
  ]);

  useEffect(() => {
    fetch('/api/analytics/overview')
      .then((res) => res.json())
      .then((data) => {
        if (!data) return;
        setStats((prev) =>
          prev.map((item) => {
            if (item.id === 'stat-wallets') return { ...item, targetValue: data.addressesTracked || item.targetValue, changeRate: `+${data.alertsToday || 0} alerts today` };
            if (item.id === 'stat-paths') return { ...item, targetValue: data.totalCases || item.targetValue };
            if (item.id === 'stat-fraud') return { ...item, targetValue: data.activeInvestigations || item.targetValue };
            if (item.id === 'stat-exchanges') return { ...item, targetValue: data.successRate ? parseFloat(data.successRate) : item.targetValue };
            return item;
          })
        );
      })
      .catch((err) => console.error('Analytics fetch failed:', err));
  }, []);

  return (
    <section id="analytics" className="relative z-10 py-20 px-6 sm:px-10 max-w-7xl mx-auto">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-border text-[#A58B6F] text-[10px] font-mono uppercase tracking-[0.25em] mb-4">
            <Radar className="w-3.5 h-3.5" />
            <span>Real-Time Forensics Performance</span>
          </div>
          <h2 className="font-playfair text-3xl sm:text-4xl md:text-5xl font-light text-white tracking-tight">
            Live Analytics & Global Forensics Scale
          </h2>
        </div>
        <p className="font-inter text-neutral-400 opacity-80 text-xs sm:text-sm max-w-md leading-relaxed">
          Continuously aggregating on-chain telemetry, sanction lists, and exchange hot-wallet clusters for national cybercrime divisions and financial intelligence units.
        </p>
      </div>

      {/* 4 Premium Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((item) => (
          <AnimatedCounterCard key={item.id} {...item} />
        ))}
      </div>
    </section>
  );
};
