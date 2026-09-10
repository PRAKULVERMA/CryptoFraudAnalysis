# CHAINTRACE AI — SIH Technical Explanation

## Problem Statement
Cryptocurrency investigations face a critical bottleneck: tracing illicit funds across Bitcoin and Ethereum requires manual correlation of transactions, identification of destination services, and detection of suspicious patterns — all within bounded time and resource constraints. Existing tools are often fragmented, require deep expertise, and lack automated evidence packaging suitable for legal proceedings.

## Our Solution
CHAINTRACE AI is an end-to-end automated blockchain intelligence platform that takes a suspect wallet address and produces a complete investigation dossier in minutes, including:
- Multi-hop fund-flow tracing
- Deterministic risk scoring from transaction evidence
- Exchange/service attribution with conflict detection
- Compliance screening
- Interactive graph visualization
- Exportable PDF report

## Technical Architecture

### 1. Ingestion Layer
The system supports Bitcoin (via Blockstream API) and Ethereum (via Etherscan API). A provider factory selects the appropriate data source based on the selected network. Transactions are normalized into a unified schema with direction (`incoming`/`outgoing`/`self-transfer`), value, timestamp, and hop metadata.

### 2. Tracing Engine
A bounded breadth-first search traces outgoing transactions hop-by-hop:
- Root wallet → outgoing transactions → discovered wallets → their outgoing transactions
- Enforced limits: `MAX_HOPS` (default 6), `MAX_WALLETS` (50), `MAX_TRANSACTIONS` (500)
- Produces a directed graph of wallets (nodes) and transactions (edges)
- Handles partial traces gracefully when providers fail mid-traversal

### 3. Risk Engine
A deterministic, evidence-based scoring system evaluates:
- Rapid forwarding (incoming → outgoing within 1 hour)
- Multi-hop chains (depth >= 3)
- High outflow ratio (>= 80% of incoming value forwarded)
- High fan-in/fan-out (>= 4 unique sources/destinations)
- Value fragmentation and repeated forwarding
- Graph-level signals via Neo4j: circular flows and flow convergence

Risk score ranges from 0 to 100, mapped to LOW/MEDIUM/HIGH/CRITICAL. Confidence is computed separately from data completeness and trace depth.

### 4. Attribution System
Terminal destinations are matched against a registry of known exchanges and services:
- Supports multiple attribution providers with conflict detection
- If providers return conflicting entities, the result is flagged `CONFLICTING` — no entity is auto-selected
- Unknown destinations are explicitly labeled `UNKNOWN` and never auto-identified
- Each attribution includes typed evidence with source and strength

### 5. Compliance Screening
Addresses are screened against a configurable sanctions provider:
- Supports HTTP-based providers with Bearer authentication
- Results normalized to `CLEAR`, `MATCH`, `POSSIBLE_MATCH`, `UNKNOWN`
- Positive results without evidence are automatically downgraded to `UNKNOWN`

### 6. Intelligence Enrichment
The system builds comprehensive wallet profiles and behavioral analysis:
- **Wallet profiles**: fan-in, fan-out, forwarding behavior, activity duration, transaction frequency
- **Behavioral patterns**: rapid forwarding, repeated destinations, divergence chains
- **Convergence analysis**: multiple sources funneling to one destination
- **Terminal destinations**: wallets with no further outgoing edges
- **Timeline**: temporally ordered transaction events
- **Path intelligence**: up to 50 reconstructed fund-flow paths with hop counts and values

### 7. Graph Storage & Analytics
Optional Neo4j integration enables:
- Persistent graph storage scoped by investigation ID
- Cycle detection (circular fund flows)
- Convergence detection
- Graph metrics (node count, edge count, average degree)
- Automatic fallback to in-memory analysis when Neo4j is unavailable

### 8. Visualization
The frontend renders an interactive force-directed graph using `react-force-graph-2d`:
- Filters: All, Root, High Risk, Incoming, Outgoing, Verified, Unknown
- Layouts: Flow, Radial, Force
- Node/edge click reveals detailed intelligence panels
- Responsive design with Tailwind CSS and Motion animations

### 9. Reporting
A subpoena-ready PDF report is generated server-side with `pdfkit`, documenting:
- Executive summary
- Risk assessment with evidence
- Fund-flow analysis
- Destination attribution
- Detected patterns
- Compliance screening
- Methodology and limitations disclaimer
- Clear marking of synthetic vs. live data

## Novelty & Innovation

1. **Bounded Graph Traversal with Graceful Degradation**
   - Unlike open-source block explorers that only show first-hop transactions, CHAINTRACE AI performs bounded multi-hop BFS tracing
   - Partial traces are handled gracefully with explicit `partial` flags

2. **Deterministic Evidence-Based Risk Scoring**
   - No black-box ML; every score contribution is traceable to a specific transaction pattern
   - Supports auditability and legal defensibility

3. **Registry-Based Attribution with Conflict Detection**
   - First-match wins is replaced with multi-provider conflict detection
   - Conflicting attributions are surfaced rather than silently overwritten

4. **Transparent Reporting**
   - Reports explicitly distinguish synthetic demo data from live blockchain data
   - Include methodology disclaimers and independent verification recommendations

5. **Optional Graph Database with Memory Fallback**
   - Neo4j enables advanced analytics without requiring it
   - System degrades gracefully when graph DB is unavailable

## Impact
- **Time reduction**: Manual tracing (hours) → Automated analysis (minutes)
- **Consistency**: Deterministic scoring across cases
- **Scalability**: Bounded traversal handles complex chains without resource exhaustion
- **Admissibility**: Structured PDF reports with methodology documentation
- **Accessibility**: Demo mode enables training and prototyping without live API dependencies

## Scalability & Production Readiness

### Current State
- In-memory persistence by default (suitable for prototyping and single-user demos)
- Optional MongoDB for multi-user persistence
- Optional Neo4j for graph analytics
- Rate limiting and request size limits protect against abuse

### Production Requirements
- Enable MongoDB for persistent storage
- Enable Neo4j for graph analytics at scale
- Enable JWT authentication (`AUTH_REQUIRED=true`)
- Configure sanctions provider for compliance screening
- Deploy behind reverse proxy with TLS termination
- Use process manager for backend high availability
- Set `NODE_ENV=production` to enable security checks and disable debug logging

## Conclusion
CHAINTRACE AI demonstrates that automated blockchain intelligence can be both powerful and principled — providing rapid, evidence-based analysis while maintaining transparency about its limitations and data provenance.
