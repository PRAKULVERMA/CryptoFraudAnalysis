# CHAINTRACE AI — Demo Guide

## Overview
This guide walks through demonstrating CHAINTRACE AI's capabilities using the default demo mode (no API keys required).

## Prerequisites
- Backend running on port 4000
- Frontend running on port 3000
- Both in default configuration (`DEMO_MODE=true`)

## Step-by-Step Demo

### 1. Open the Application
Navigate to `http://localhost:3000` in your browser.

### 2. Start an Investigation
- Select **Bitcoin** or **Ethereum** from the network dropdown
- Enter a wallet address, or click a **demo wallet** preset:
  - `bc1q8...x4f9` — "LockBit Ransomware Extortion Wallet"
  - `0xA12...7B89` — "Tornado.Cash Multi-Hop Layering Ring"
- Click **ANALYZE WALLET**

### 3. Observe Loading States
The UI shows a 4-step progress indicator:
1. Mempool & UTXO Ingestion
2. Multi-Hop Graph Traversal
3. Heuristic Clustering & AI
4. Exchange Destination Match

*Note: In demo mode, these steps are simulated with timeouts for UX purposes.*

### 4. Review Investigation Dossier
After loading, the top section displays:
- **Risk Level** badge (LOW/MEDIUM/HIGH/CRITICAL)
- **Case ID** (e.g., `CASE-SIH-4837`)
- **Target** wallet address
- **Risk Score** (0–100)
- **Funds Traced** amount
- **Hop Depth** (intermediary hops)
- **Wallet Cluster** classification
- **Exchange Destination** attribution

### 5. Inspect the Graph
Scroll to the **Money Trail** section:
- The transaction network graph renders with nodes and edges
- **Filters**: All, Root, High Risk, Incoming, Outgoing, Verified Entities, Unknown, Exchanges, Services
- **Layouts**: Flow, Radial, Force
- **Actions**: Zoom In, Zoom Out, Fit Graph, Center Root, Reset View, Fullscreen

### 6. Explore Node/Edge Intelligence
- **Click a node** (wallet) to open the `NodeIntelligencePanel`
  - View wallet profile, fan-in/fan-out, activity duration, forwarding behavior
- **Click an edge** (transaction) to open the `EdgeIntelligencePanel`
  - View transaction details, hop count, direction, value

### 7. Generate Report
- Click **Generate Report** in the investigation dossier
- A full-screen report preview opens with:
  - Risk Overview
  - Destination Attribution
  - Detected Fraud Patterns
  - Risk Factors
  - Blockchain Trace Summary
  - Compliance & Screening
  - Evidence & Methodology
- Click **Export as PDF** to download the report

### 8. Try Different Addresses
Repeat with different networks and addresses to see how the system handles:
- Wallets with no outgoing transactions → "No Transactions" state
- Wallets with high fan-out → "High Risk" classification
- Wallets with rapid forwarding → `RAPID_FORWARDING` pattern

## Demo Mode Behavior

When `DEMO_MODE=true`:
- Blockchain providers return synthetic transaction data
- All records have `synthetic: true` and `mode: "DEMO"`
- Attribution returns synthetic labels
- Reports include a disclaimer: "This investigation used synthetic/demo blockchain data"
- No real API keys are required

## Switching to Live Mode

To demonstrate live blockchain data:
1. Stop the backend
2. Set `DEMO_MODE=false` in `backend/.env`
3. Add `ETHERSCAN_API_KEY=your_key` for Ethereum support
4. Restart backend
5. Enter a real Bitcoin or Ethereum address
6. Observe `synthetic: false` and `mode: "LIVE"` in the response

*Note: Bitcoin live mode uses Blockstream API without a key. Ethereum requires an Etherscan API key.*

## Talking Points for Demonstrations

1. **Multi-hop tracing**: The system follows fund flows through multiple intermediary wallets, not just the first hop.
2. **Deterministic risk scoring**: Risk is computed from evidence-based signals, not black-box ML.
3. **Evidence-backed attribution**: Attribution results include typed evidence with sources and strength levels.
4. **Conflict detection**: If multiple providers disagree on an entity, the result is flagged as `CONFLICTING`.
5. **Transparent limitations**: Reports explicitly state whether data is synthetic or live, and include methodology disclaimers.
6. **Optional graph database**: Neo4j enables advanced analytics (cycles, convergence) with automatic memory fallback.
7. **Bounded traversal**: Configurable limits prevent runaway resource usage during tracing.
