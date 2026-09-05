import React from 'react';
import { motion } from 'motion/react';
import {
  Layers,
  Cpu,
  Database,
  Terminal,
  Activity,
  Network,
  Share2,
  ArrowDown,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

export const TechnologyArchitecture: React.FC = () => {
  const pipelineFlow = [
    { label: 'USER / INVESTIGATOR', role: 'Cybercrime Unit / LEA / SIH Evaluator', icon: Terminal },
    { label: 'REACT FRONTEND', role: 'Vite + Tailwind + WebGL 3D Visualization', icon: Layers },
    { label: 'PYTHON ANALYTICS ENGINE', role: 'FastAPI + NetworkX Multi-Hop Crawler', icon: Cpu },
    { label: 'BLOCKCHAIN DATA APIs', role: 'Full Nodes, Mempool RPC, UTXO & EVM Logs', icon: Activity },
    { label: 'GRAPH DATABASE', role: 'Neo4j Billion-Node Relationship Storage', icon: Database },
    { label: 'AI / ML RISK ANALYSIS', role: 'Graph Neural Networks & Structuring Models', icon: Network },
    { label: 'INVESTIGATION INTELLIGENCE', role: 'Actionable Court-Admissible Intelligence Dossier', icon: ShieldCheck },
  ];

  const techCards = [
    {
      name: 'React',
      version: 'React 19 + TypeScript',
      description: 'High-performance investigative UI, interactive graph topology canvas, and dark command-center ergonomics.',
      category: 'Client Presentation',
    },
    {
      name: 'Python',
      version: 'Python 3.11 + FastAPI',
      description: 'Asynchronous multi-chain data ingestion, transaction parsing, and high-concurrency micro-hop crawling.',
      category: 'Core Analytics Engine',
    },
    {
      name: 'Neo4j',
      version: 'Enterprise Graph DB',
      description: 'Native graph property database powering deep relationship traversal, betweenness centrality, and wallet clustering.',
      category: 'Graph Database',
    },
    {
      name: 'Blockchain APIs',
      version: 'RPC Nodes & WebSockets',
      description: 'Direct ingestion from Bitcoin, Ethereum, EVM, and Tron mempool listeners with historical archive lookups.',
      category: 'Data Feeds',
    },
    {
      name: 'Machine Learning',
      version: 'PyTorch Geometric & Scikit',
      description: 'Graph Neural Networks trained on known scam, ransomware, and mixer topologies for predictive risk classification.',
      category: 'Inference Engine',
    },
    {
      name: 'Graph Analytics',
      version: 'Louvain & Dijkstra Traversal',
      description: 'Algorithmic community clustering, entity resolution, and shortest-path identification to exchange deposit clusters.',
      category: 'Algorithmic Core',
    },
  ];

  return (
    <section id="tech-stack" className="relative z-10 py-24 px-6 sm:px-10 max-w-7xl mx-auto">
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass-border text-[#A58B6F] text-[10px] font-mono uppercase tracking-[0.25em] mb-4">
          <Layers className="w-3.5 h-3.5" />
          <span>Technical Blueprint & Stack</span>
        </div>
        <h2 className="font-playfair text-3xl sm:text-5xl font-light text-white tracking-tight mb-4">
          Built for Scalable Blockchain Intelligence
        </h2>
        <p className="font-inter text-neutral-400 opacity-80 text-sm sm:text-base leading-relaxed">
          Engineered as a distributed, high-throughput forensics pipeline capable of parsing multi-gigabyte block histories and resolving multi-hop money trails in real time.
        </p>
      </div>

      {/* Blueprint Architecture Flowchart */}
      <div className="glass-card rounded-3xl p-8 sm:p-12 glass-border mb-16 relative overflow-hidden bg-[#070707] shadow-2xl">
        {/* Subtle Blueprint Grid */}
        <div className="absolute inset-0 cyber-grid-bg opacity-30 pointer-events-none" />

        <div className="relative z-10 mb-8 flex items-center justify-between border-b border-white/10 pb-4">
          <div className="text-xs font-mono text-[#A58B6F] uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#A58B6F] animate-pulse" />
            <span>ARCHITECTURE SPECIFICATION // FORENSICS ENGINE v3.4</span>
          </div>
          <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest hidden sm:inline">
            END-TO-END DATAFLOW PIPELINE
          </span>
        </div>

        {/* Vertical/Flowchart Blueprint Nodes */}
        <div className="relative z-10 flex flex-col items-center space-y-3 max-w-2xl mx-auto">
          {pipelineFlow.map((node, index) => {
            const Icon = node.icon;
            const isFirst = index === 0;
            const isLast = index === pipelineFlow.length - 1;

            return (
              <React.Fragment key={node.label}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.08 }}
                  className={`w-full p-4 rounded-xl border flex items-center justify-between transition-all duration-300 ${
                    isFirst
                      ? 'bg-white/[0.04] border-white/20 text-white'
                      : isLast
                      ? 'bg-[#A58B6F]/15 border-[#A58B6F]/60 text-white shadow-lg shadow-[#A58B6F]/10'
                      : 'bg-black/60 border-white/10 hover:border-[#A58B6F]/40 text-neutral-200'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/10 flex items-center justify-center text-[#A58B6F] shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-inter text-xs font-bold tracking-wider text-white uppercase">
                        {node.label}
                      </div>
                      <div className="text-[12px] font-inter text-neutral-400">
                        {node.role}
                      </div>
                    </div>
                  </div>

                  <span className="font-mono text-[11px] font-semibold text-neutral-400 uppercase">
                    Stage {index + 1 < 10 ? `0${index + 1}` : index + 1}
                  </span>
                </motion.div>

                {/* Connecting Arrow Down */}
                {!isLast && (
                  <div className="flex flex-col items-center justify-center py-0.5 text-[#A58B6F]/60">
                    <div className="w-[1px] h-3 bg-[#A58B6F]/40" />
                    <ArrowDown className="w-3.5 h-3.5" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Technology Cards Grid (React, Python, Neo4j, Blockchain APIs, Machine Learning, Graph Analytics) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {techCards.map((tech, idx) => (
          <motion.div
            key={tech.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: idx * 0.1 }}
            className="glass-card rounded-2xl p-6 glass-border group hover:border-[#A58B6F]/50 transition-all duration-300 relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#A58B6F] font-semibold">
                {tech.category}
              </span>
              <span className="text-[10px] font-mono text-neutral-400">
                {tech.version}
              </span>
            </div>

            <h3 className="font-inter text-xl font-semibold tracking-tight text-white mb-2 group-hover:text-[#A58B6F] transition-colors">
              {tech.name}
            </h3>

            <p className="font-inter text-neutral-300 text-xs sm:text-[13px] leading-relaxed opacity-85">
              {tech.description}
            </p>
          </motion.div>
        ))}
      </div>
    </section>
  );
};
