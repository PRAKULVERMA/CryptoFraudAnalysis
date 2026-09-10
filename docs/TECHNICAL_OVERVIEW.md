# CHAINTRACE AI — Technical Documentation

## 1. Project Overview

### Problem
Cryptocurrency investigations require correlating wallet addresses across blockchain transactions, identifying destination services, detecting suspicious fund-flow patterns, and producing admissible evidence. Manual tracing is slow, error-prone, and difficult to scale across Bitcoin and Ethereum.

### Target Users
- Law enforcement analysts
- Compliance teams
- Fraud investigators
- Intelligence units

### Solution
CHAINTRACE AI automates blockchain wallet investigation by:
1. Retrieving live or demo transactions for a target wallet
2. Tracing multi-hop fund flows with bounded depth
3. Computing deterministic risk signals from transaction evidence
4. Attempting exchange/service attribution via a registry-based provider
5. Screening addresses against a configurable sanctions provider
6. Building wallet profiles, behavioral patterns, convergence/divergence analysis, and timeline reconstruction
7. Rendering an interactive investigation graph and exporting a PDF report

### Major Capabilities
- Bitcoin and Ethereum investigation support
- Multi-hop transaction tracing with configurable limits
- Evidence-based risk scoring (deterministic heuristics, not ML inference)
- Exchange/service attribution via registry providers with conflict detection
- Compliance screening with configurable sanctions sources
- Graph visualization with filters, layouts, and node/edge intelligence panels
- PDF report generation
- Investigation persistence (in-memory by default; MongoDB optional)
- Graph storage and graph-level analytics via Neo4j (optional, with memory fallback)

## 2. Architecture

```
Frontend (React + Vite)
  ↓ HTTP/JSON
Backend API (Express)
  ↓
Investigation Engine (analyzeWallet)
  ↓
Blockchain Providers (Bitcoin, Ethereum)
  ↓
Tracing Service (multi-hop BFS)
  ↓
Graph Builder (nodes, edges, trace_summary)
  ↓
Risk Detection (evidence-based signals)
  ↓
Attribution (registry + exchange matching)
  ↓
Compliance (sanctions screening)
  ↓
Intelligence (profiles, patterns, convergence, divergence, timeline)
  ↓
Neo4j (optional graph persistence)
  ↓
MongoDB (optional investigation persistence)
  ↓
Reporting (PDF generation)
```

### Frontend
- React 19 with TypeScript
- Vite dev server
- Tailwind CSS for styling
- `react-force-graph-2d` for interactive network visualization
- Lucide icons and Motion for UI animations
- Proxies `/api` requests to the backend

### Backend API
- Express.js server
- `helmet` for security headers
- `cors` with configurable origins
- `express-rate-limit` (120 requests/minute)
- Request ID middleware
- JSON body limit: 1 MB

### Investigation Engine
- Entry point: `POST /api/investigate/wallet`
- Validates wallet address and network
- Creates an investigation record
- Delegates to `InvestigationJobService` for async processing
- Returns the final investigation result synchronously (job runs in-process)

### Blockchain Providers
- `ProviderManager` selects provider by network
- Bitcoin: Blockstream API (`https://blockstream.info/api`)
- Ethereum: Etherscan API (`https://api.etherscan.io/v2/api`) with `ETHERSCAN_API_KEY`
- Demo provider for synthetic data when `DEMO_MODE=true`

### Investigation Persistence
- Default: in-memory repository (`MemoryRepository`)
- Optional: MongoDB via Mongoose when `MONGODB_URI` is configured
- Records store `investigation_id`, `wallet_address`, `network`, `status`, `results`, `synthetic`, `mode`, timestamps, retry metadata

### Neo4j
- Optional graph database for investigation graphs and analytics
- Disabled by default (`NEO4J_ENABLED=false`)
- Falls back to in-memory graph analysis when unavailable

## 3. Data Flow

### Investigation Lifecycle

1. **User submits request**
   - Frontend sends `POST /api/investigate/wallet` with `{ address, network }`
   - Backend validates the wallet format

2. **Investigation record created**
   - `InvestigationService.createInvestigation` generates a UUID `investigation_id`
   - Status: `queued`

3. **Job processing starts**
   - `InvestigationJobService.processInvestigation` claims the investigation
   - Status: `running`

4. **Transaction retrieval**
   - Provider fetches wallet transactions for the root address
   - Pagination respects `MAX_TRANSACTIONS_PER_WALLET` and `MAX_TOTAL_TRANSACTIONS`

5. **Tracing (multi-hop BFS)**
   - `traceWallet` explores outgoing transactions hop-by-hop
   - Each discovered wallet is queued for the next hop
   - Enforces `MAX_HOPS`, `MAX_WALLETS_PER_INVESTIGATION`, `MAX_TOTAL_TRANSACTIONS`

6. **Graph construction**
   - `buildGraphFromTrace` creates nodes (wallets) and edges (transactions)
   - Computes `trace_summary` with `funds_traced`, `transactions_analyzed`, `wallets_discovered`

7. **Risk analysis**
   - `analyzeEvidenceRisk` evaluates signals: rapid forwarding, multi-hop chains, high fan-out, high fan-in, value fragmentation, repeated forwarding, high velocity
   - Also queries Neo4j for cycles and convergence when available
   - Returns `riskScore`, `riskLevel`, `patterns`, `confidence`

8. **Destination attribution**
   - `attributeDestination` checks graph nodes/edges against the attribution registry
   - `attributeExchange` processes terminal destinations with conflict detection
   - Returns `VERIFIED`, `SUPPORTED`, `UNKNOWN`, `CONFLICTING`, or `UNAVAILABLE`

9. **Compliance screening**
   - `screenInvestigation` sends root and terminal addresses to the sanctions provider
   - Returns `CLEAR`, `MATCH`, `POSSIBLE_MATCH`, or `UNKNOWN`

10. **Intelligence enrichment**
    - `buildInvestigationIntelligence` computes:
      - Wallet profiles (fan-in, fan-out, forwarding behavior, timestamps)
      - Behavioral patterns (rapid forwarding, repeated destinations, divergence)
      - Convergence points
      - Terminal destinations
      - Timeline
      - Path intelligence (up to 50 paths)
      - Investigation summary

11. **Graph storage**
    - Attempts to store nodes/edges in Neo4j with `investigation_id` scoping
    - Falls back to memory if Neo4j is unavailable

12. **Persistence**
    - Final result saved to investigation record
    - Status: `completed` or `failed`

13. **Frontend rendering**
    - Graph displayed with filters (All, Root, High Risk, Incoming, Outgoing, Verified, Unknown)
    - Layout modes: Flow, Radial, Force
    - Node/edge panels show intelligence details
    - Report preview available for PDF export

## 4. Technology Stack

### Backend
- **Runtime:** Node.js (ES modules)
- **Framework:** Express 4.21
- **Language:** JavaScript (no TypeScript in backend source)
- **Security:** `helmet`, `cors`, `express-rate-limit`
- **Auth:** `jsonwebtoken`, `bcryptjs`
- **Database (optional):** `mongoose` (MongoDB), `neo4j-driver` (Neo4j)
- **PDF:** `pdfkit`
- **Utilities:** `dotenv`, `uuid`, `ethers` (Ethereum address validation)

### Frontend
- **Runtime:** Node.js
- **Framework:** React 19
- **Language:** TypeScript
- **Bundler:** Vite 6
- **Styling:** Tailwind CSS 4
- **Graph:** `react-force-graph-2d`
- **Animation:** `motion` (Framer Motion)
- **Icons:** `lucide-react`
- **3D:** `three` (present in dependencies; usage in project scope not verified as core feature)

## 5. Blockchain Tracing

### Transaction Retrieval
- Bitcoin: `GET https://blockstream.info/api/address/{address}/txs`
- Ethereum: `GET https://api.etherscan.io/v2/api?chainid=1&module=account&action=txlist&address={address}&startblock=0&endblock=99999999&page={page}&offset={pageSize}&sort=desc&apikey={key}`
- Pagination controlled by `MAX_TRANSACTIONS_PER_WALLET` and `MAX_TOTAL_TRANSACTIONS`
- Timeout enforced via `AbortController` with `BLOCKCHAIN_PROVIDER_TIMEOUT` (default 10000 ms)

### Normalization
- Addresses are lowercased and trimmed via `normalizeWalletAddress`
- Bitcoin addresses validated against Bech32 (`bc1`, `tb1`, `bcrt1`) and legacy/P2SH (`1`, `3`, `m`, `n`) regex patterns
- Ethereum addresses validated via `ethers.isAddress`

### Outgoing Tracing
- Breadth-first search from root wallet
- Only **outgoing** transactions are followed to the next hop in live mode
- In demo mode, both directions may be followed (`followBothDirections = synthetic === true`)

### Hops
- Each wallet discovered via outgoing transaction becomes a hop
- Hop depth recorded per wallet and per edge
- `max_hops_reached` reflects the deepest traversal

### Graph Generation
- Nodes: unique wallets discovered during tracing
- Edges: individual transactions with `source`, `target`, `value`, `timestamp`, `direction`, `hop`
- `trace_summary` aggregates counts, values, limits reached, and mode/synthetic flags

### Limitations
- Bitcoin change outputs are indistinguishable from true outgoing transfers without additional heuristics
- Tracing is bounded by `MAX_HOPS` (default 6), `MAX_WALLETS_PER_INVESTIGATION` (50), and `MAX_TOTAL_TRANSACTIONS` (500)
- No address clustering or co-spend heuristics beyond explicit transaction graph edges
- Provider failures may produce partial traces (`partial: true`)

## 6. Risk Detection

### Evidence-Based Signals
The risk engine (`analyzeEvidenceRisk`) computes a deterministic `riskScore` (0–100) from the following signals:

| Signal | Code | Max Score | Trigger |
|--------|------|-----------|---------|
| Rapid Forwarding | `RAPID_FORWARDING` | 25 | Incoming followed by outgoing within 1 hour |
| Multi-Hop Chain | `MULTI_HOP_CHAIN` | 20 | Trace depth >= 3 |
| High Outflow Ratio | `HIGH_OUTFLOW_RATIO` | 20 | Outgoing / incoming >= 0.8 |
| High Fan-Out | `HIGH_FAN_OUT` | 15 | >= 4 distinct outgoing targets |
| High Fan-In | `HIGH_FAN_IN` | 10 | >= 4 distinct incoming sources |
| Value Fragmentation | `VALUE_FRAGMENTATION` | 10 | >= 5 outgoing txs with average value < 10% of total |
| Repeated Forwarding | `REPEATED_FORWARDING` | 10 | Same destination >= 3 times |
| High Velocity | `HIGH_VELOCITY` | 10 | Transaction frequency exceeds threshold |

When Neo4j is available, two additional signals may be added:
- **Circular Flow** (`CIRCULAR_FLOW`): cycles of 1–10 hops
- **Flow Convergence** (`FLOW_CONVERGENCE`): multiple sources converging to one destination within 1–6 hops

### Risk Levels
- CRITICAL: score >= 75
- HIGH: score >= 50
- MEDIUM: score >= 25
- LOW: score < 25

### Confidence
A separate `confidence` metric (0–100) is computed from transaction count, trace depth, timestamp completeness, value completeness, and whether the trace was partial.

### Important Note
This is a deterministic, rule-based heuristic engine. It does **not** use machine learning or statistical models.

## 7. Attribution

### Verification Levels
- `VERIFIED`: Strong evidence from a configured source
- `SUPPORTED` / `PROBABLE`: Moderate evidence
- `UNVERIFIED`: Weak or demo evidence
- `UNKNOWN`: No attribution evidence found
- `CONFLICTING`: Multiple providers returned different entities

### Evidence
Each attribution result includes an `evidence` array with typed entries:
- `type`: e.g., `DEMO_LABEL`, `CONFIGURED_DATASET`, `PROVIDER_CONFLICT`
- `description`: Human-readable explanation
- `source`: Data source identifier
- `strength`: `STRONG`, `MODERATE`, or `WEAK`

### Confidence
Attribution confidence is bounded 0–100 and derived from evidence strength and count. It is independent of the risk score.

### Conflicts
When multiple attribution providers return different entities for the same address, the result is marked `CONFLICTING`. The conflicting parties and their sources are recorded. No entity is auto-selected in conflict scenarios.

### Unknown Destinations
- Addresses without registry matches return `UNKNOWN` / `UNVERIFIED`
- `UNKNOWN` destinations are never auto-labeled as exchanges or services
- Frontend explicitly states: "Unknown destinations are never auto-labeled"

## 8. Compliance

### Architecture
- Sanctions provider interface (`createSanctionsProvider`)
- Two implementations:
  - `UnconfiguredSanctionsProvider`: Returns `UNKNOWN` when `SANCTIONS_ENABLED=false` or `SANCTIONS_PROVIDER !== 'http'`
  - `HttpSanctionsProvider`: Queries `SANCTIONS_API_URL` with `address` and `network` parameters; supports `Bearer` auth via `SANCTIONS_API_KEY`

### Screening Flow
1. Root address and terminal destinations are collected
2. Each address is screened via the configured provider
3. Results are normalized to: `CLEAR`, `MATCH`, `POSSIBLE_MATCH`, `UNKNOWN`
4. Positive results without evidence are downgraded to `UNKNOWN`
5. Summary counts `checked`, `matches`, `possible_matches`, `unknown`, `clear`

### Important Note
In the current default configuration (`SANCTIONS_ENABLED=false`), all screening results return `UNKNOWN` with reason "Sanctions screening source is not configured."

## 9. Advanced Intelligence

### Wallet Profiles
For each wallet in the trace, `buildWalletProfile` computes:
- `incoming_transaction_count`, `outgoing_transaction_count`
- `incoming_value`, `outgoing_value`
- `unique_incoming_sources`, `unique_outgoing_destinations`
- `fan_in`, `fan_out`
- `first_seen`, `last_seen`, `activity_duration_minutes`
- `transaction_frequency_per_hour`
- `forwarding_behavior`, `repeated_destination_behavior`, `fragmentation_behavior`
- `hop_depth`

### Behavioral Patterns
Detected patterns include:
- `RAPID_FORWARDING`: incoming followed by outgoing within 1 hour
- `HIGH_FAN_IN`: >= 4 unique incoming sources
- `HIGH_FAN_OUT`: >= 4 unique outgoing destinations
- `REPEATED_DESTINATION`: same target >= 3 times
- `DIVERGENCE`: root splits to >= 2 distinct destinations

### Convergence
- Multiple source wallets send funds to the same destination wallet
- Detected via graph analysis in `intelligenceService.js` and Neo4j

### Divergence
- Root wallet distributes funds to multiple distinct destinations
- Recorded as `divergence_chains` with evidence transactions

### Repeated Destinations
- Same destination wallet receives multiple transactions from the same source
- Tracked per source-target pair

### Timeline
- All edges sorted by timestamp
- `temporal_ordering_complete` indicates whether every event has a valid timestamp
- Each event includes hash, from/to, value, asset, hop, direction

### Path Intelligence
- Up to 50 paths reconstructed from outgoing edges
- Each path records: root, destination, hop count, wallets in path, transactions, total value, timestamps, whether it contains a known attributed entity, and whether it is incomplete

### Terminal Destinations
- Wallets with outgoing transactions but no further outgoing edges
- Termination reason: `NO_OUTGOING_TRANSACTIONS`, `MAX_HOPS_REACHED`, `MAX_WALLETS_REACHED`, or `MAX_TRANSACTIONS_REACHED`

### Investigation Summary
Aggregated summary with bounded slices:
- `behavioral_patterns` (max 20)
- `convergence_points` (max 20)
- `fan_in_wallets` (max 20)
- `fan_out_wallets` (max 20)
- `divergence_chains` (max 20)
- `repeated_destinations` (max 20)
- `terminal_destinations` (max 50)

## 10. Neo4j

### Nodes
- `Investigation`: root-level container with `id`, `network`, `root_address`, `created_at`
- `Wallet`: `normalized_address` (lowercase, trimmed), `network`, `address`, `node_type`, `first_seen`, `last_seen`

### Relationships
- `(:Investigation)-[:CONTAINS]->(:Wallet)`: scopes wallets to an investigation
- `(:Wallet)-[:TRANSFER {transaction_id, network, investigation_id, hash, value, timestamp, fee, status, direction, hop, block_number}]->(:Wallet)`: represents a transaction

### Investigation Scoping
- All queries filter by `investigationId` through the `CONTAINS` relationship
- Prevents cross-investigation data leakage
- Constraints: `CREATE CONSTRAINT wallet_unique IF NOT EXISTS FOR (w:Wallet) REQUIRE (w.normalized_address, w.network) IS UNIQUE`

### Fallback Mode
- When Neo4j is unavailable or disabled, `graph_analysis.provider` is set to `memory`
- All intelligence computation still runs in memory
- Graph-level analytics that require Neo4j (cycles, convergence) are skipped or fall back gracefully

### Cypher Security
- All queries use parameterized parameters (`$investigationId`, `$sourceKey`, `$targetKey`, `$network`, etc.)
- No string concatenation in query construction
- Traversal bounds: `*1..10` for cycles/shortest paths, `*1..6` for convergence
- Result limits: `LIMIT 25` to `LIMIT 50`

## 11. Authentication

### JWT Authentication
- `POST /api/auth/register` and `POST /api/auth/login` issue JWTs
- Tokens signed with `JWT_SECRET` (24h expiry)
- Payload: `{ sub: user.id, email: user.email }`

### Protected Routes
- `authenticate` middleware checks `Authorization: Bearer <token>`
- When `AUTH_REQUIRED=true`:
  - Missing/invalid/expired tokens return 401
  - Valid tokens populate `req.user`
- When `AUTH_REQUIRED=false`:
  - Requests pass through without authentication
  - `req.user` remains undefined

### Investigation Ownership
- `authorizeInvestigation` middleware enforces ownership
- If `investigation.user_id` is set and does not match `req.user.id`, access is denied (404)
- `user_id` is sourced from the JWT `sub` claim, not the request body
- Cross-user access is blocked when authentication is enabled

### Important Note
Authentication is **disabled by default** (`AUTH_REQUIRED=false`). When disabled, all endpoints are publicly accessible.

## 12. Reporting

### PDF Generation
- Endpoint: `GET /api/investigations/:id/report`
- Requires authentication when `AUTH_REQUIRED=true`
- Uses `pdfkit` to generate an A4 PDF

### Report Sections
1. Executive Summary
2. Target Wallet (address, network, timestamp)
3. Risk Assessment (score, level, confidence, risk factors)
4. Transaction & Fund-Flow Analysis (transactions analyzed, funds traced, max hops)
5. Destination Attribution (entity, type, confidence)
6. Detected Fraud Patterns
7. Blockchain Trace Summary
8. Compliance Screening (OFAC match status)
9. Investigation Timeline
10. Automated Investigation Conclusion
11. Evidence & Limitations

### Key Behaviors
- Reports explicitly state whether data is synthetic/demo or live
- Includes disclaimer that risk scores are analytical indicators, not legal conclusions
- Filename: `chaintrace-investigation-{investigation_id}.pdf`

## 13. Limitations

### Deterministic Heuristics
- Risk detection uses fixed, rule-based signals; it does not employ machine learning
- Signals are evidence-based and deterministic given the same input

### Provider Limitations
- Bitcoin provider (Blockstream) does not return full transaction scripts; change outputs cannot be distinguished from true external outputs without additional heuristics
- Ethereum provider depends on Etherscan API rate limits and key validity
- Provider timeouts may produce partial traces

### Unknown Attribution
- Most real addresses return `UNKNOWN` attribution because no live exchange/service provider is configured by default
- Demo mode returns synthetic labels for UI demonstration only

### Neo4j Availability
- Disabled by default; graph analytics beyond memory fallback require manual configuration
- Cycles, convergence, and graph metrics are unavailable when Neo4j is disabled

### MongoDB Availability
- Optional persistence layer; disabled by default
- Without MongoDB, investigations are stored in memory and lost on restart

### Live Provider Requirements
- Live mode requires valid `ETHERSCAN_API_KEY` (for Ethereum) and reachable provider endpoints
- Bitcoin live mode uses Blockstream without an API key but is subject to rate limiting

### Authentication
- Disabled by default; any user can access all endpoints
- When enabled, users can only access their own investigations

### Trace Depth
- Limited to `MAX_HOPS` (default 6) and `MAX_WALLETS_PER_INVESTIGATION` (default 50)
- Complex money-laundering chains exceeding these limits will be truncated

## 14. Installation

### Prerequisites
- Node.js (version compatible with React 19 and Express 4.21)
- npm

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env and set required variables:
# - DEMO_MODE=true (default) or false
# - ETHERSCAN_API_KEY (required for Ethereum live mode)
# - JWT_SECRET (required if AUTH_REQUIRED=true)
# - MONGODB_URI (optional)
# - NEO4J_ENABLED, NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD (optional)
npm start
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Environment Variables
| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 4000 | Backend listen port |
| `NODE_ENV` | development | Environment mode |
| `DEMO_MODE` | true | Use synthetic/demo data |
| `AUTH_REQUIRED` | false | Enable JWT authentication |
| `JWT_SECRET` | development-secret-change-me | JWT signing secret |
| `ETHERSCAN_API_KEY` | (empty) | Etherscan API key for Ethereum |
| `BLOCKCHAIN_PROVIDER_TIMEOUT` | 10000 | Provider request timeout (ms) |
| `MAX_HOPS` | 6 | Maximum trace depth |
| `MAX_WALLETS_PER_INVESTIGATION` | 50 | Maximum wallets per investigation |
| `MAX_TRANSACTIONS_PER_WALLET` | 100 | Transactions per wallet fetch |
| `MAX_TOTAL_TRANSACTIONS` | 500 | Total transactions cap |
| `INVESTIGATION_MAX_RETRIES` | 3 | Retry attempts for failed jobs |
| `INVESTIGATION_STALE_TIMEOUT_MS` | 900000 | Stale job recovery threshold |
| `MONGODB_URI` | (empty) | MongoDB connection string |
| `NEO4J_ENABLED` | false | Enable Neo4j graph storage |
| `NEO4J_URI` | (empty) | Neo4j connection URI |
| `NEO4J_USERNAME` | (empty) | Neo4j username |
| `NEO4J_PASSWORD` | (empty) | Neo4j password |
| `SANCTIONS_ENABLED` | false | Enable sanctions screening |
| `SANCTIONS_PROVIDER` | none | Sanctions provider type (`http`) |
| `SANCTIONS_API_URL` | (empty) | Sanctions API endpoint |
| `SANCTIONS_API_KEY` | (empty) | Sanctions API key |

### Development Commands
```bash
# Backend
cd backend
npm start        # Start server
npm run dev      # Start with tsx watch (if configured)

# Frontend
cd frontend
npm run dev      # Start Vite dev server on port 3000
npm run build    # Production build
npm run preview  # Preview production build
npm run lint     # TypeScript type check (tsc --noEmit)
```

## 15. Demo Instructions

### Default Mode
The application runs in **DEMO_MODE=true** by default, which means:
- Synthetic transaction data is generated
- No real blockchain API keys are required
- Attribution returns synthetic labels

### Step-by-Step Demo
1. Start the backend: `cd backend && npm start`
2. Start the frontend: `cd frontend && npm run dev`
3. Open `http://localhost:3000`
4. Select a network (Bitcoin or Ethereum)
5. Enter a wallet address or click a demo wallet preset
6. Click **ANALYZE WALLET**
7. Wait for the investigation to complete (progress steps shown)
8. View the investigation dossier with risk score, funds traced, hop depth, and destination
9. Click **Inspect Graph Flow** to view the interactive transaction graph
10. Use graph filters (All, Root, High Risk, Incoming, Outgoing, Verified, Unknown)
11. Switch layouts (Flow, Radial, Force)
12. Click nodes or edges to view intelligence panels
13. Click **Generate Report** to preview and export a PDF

### Demo Wallets
The frontend includes preset demo wallets:
- `bc1q8x9l4h9g2e75kdf8wqp39nm7x4f9` — "LockBit Ransomware Extortion Wallet"
- `0xA120B48F705B35C1580A7712E11608d087B89` — "Tornado.Cash Multi-Hop Layering Ring"

## 16. SIH Technical Explanation

### Concept
CHAINTRACE AI is an automated blockchain intelligence platform designed to assist law enforcement and compliance teams in tracing illicit cryptocurrency funds.

### How It Works
1. **Input**: An investigator provides a suspect wallet address and selects a blockchain network (Bitcoin or Ethereum).
2. **Tracing**: The system automatically retrieves the wallet's transaction history and performs a bounded multi-hop traversal, following the money through intermediate wallets up to a configurable depth.
3. **Graph Construction**: All discovered wallets and transactions are organized into a directed graph with normalized addresses and hop-level metadata.
4. **Risk Analysis**: Deterministic heuristics evaluate transaction patterns such as rapid forwarding, high fan-in/fan-out, value fragmentation, and circular flows. These produce a 0–100 risk score and severity classification.
5. **Attribution**: Terminal destinations are matched against a registry of known exchanges and services. Conflict detection ensures contradictory attributions are flagged rather than silently overwritten.
6. **Compliance**: Addresses are screened against a configurable sanctions source, returning clear/match/unknown results with evidence.
7. **Intelligence**: Wallet profiles, behavioral patterns, convergence/divergence points, timelines, and path intelligence are computed to give investigators contextual understanding.
8. **Visualization**: An interactive force-directed graph renders the fund flow with filters for risk, direction, and entity type. Clicking any node or edge reveals detailed intelligence.
9. **Reporting**: A subpoena-ready PDF report is generated, documenting the investigation methodology, findings, risk assessment, and limitations.

### Novelty
- Combines bounded graph traversal with deterministic evidence-based risk scoring in a single automated pipeline
- Graph-level analytics (cycles, convergence) via optional Neo4j integration with automatic memory fallback
- Registry-based attribution with explicit conflict detection rather than first-match wins
- Transparent reporting that clearly distinguishes synthetic demo data from live blockchain data

### Impact
- Reduces investigation time from hours to minutes
- Provides consistent, repeatable scoring across cases
- Produces structured, exportable evidence suitable for legal review
- Operates in demo mode for training and prototyping without live API dependencies
