# CHAINTRACE AI — Limitations & Honest Constraints

## 1. Deterministic Heuristics, Not ML

The risk detection engine (`analyzeEvidenceRisk`) uses fixed, rule-based signals:
- Rapid forwarding detection
- Multi-hop chain thresholds
- Fan-in/fan-out counts
- Value fragmentation ratios
- Repeated forwarding counts
- Velocity calculations

There is **no machine learning model**, no statistical classification, and no anomaly detection beyond these deterministic thresholds.

## 2. Provider Limitations

### Bitcoin (Blockstream)
- No API key required, but subject to rate limiting
- Returns transaction lists without full script/input-output mapping
- **Change outputs cannot be distinguished from true outgoing transfers** without additional heuristics
- This means some traced "outgoing" transactions may actually be wallet self-change

### Ethereum (Etherscan)
- Requires valid `ETHERSCAN_API_KEY` for live mode
- Subject to Etherscan rate limits (5 requests/second for free tier)
- Pagination required for wallets with many transactions
- API downtime or key invalidation causes investigation failure or partial traces

### General
- Provider timeouts (`BLOCKCHAIN_PROVIDER_TIMEOUT`, default 10s) may truncate data collection
- Network failures produce partial traces with `partial: true` flag

## 3. Unknown Attribution

- In the default configuration, **no live attribution provider is configured**
- Most real addresses return `UNKNOWN` / `UNVERIFIED`
- Demo mode returns synthetic labels (`DEMO Exchange Cluster`) for UI demonstration only
- These demo labels are explicitly marked as synthetic and should not be interpreted as real intelligence

## 4. Neo4j Availability

- **Disabled by default** (`NEO4J_ENABLED=false`)
- When disabled, graph-level analytics are skipped:
  - Cycle detection (circular flows)
  - Convergence detection (multiple sources → one destination)
- All intelligence computation still runs in memory
- No graph persistence between server restarts

## 5. MongoDB Availability

- **Disabled by default** (`MONGODB_URI` is empty)
- When disabled, investigations are stored in `MemoryRepository`
- Data is lost on server restart
- Not suitable for production persistence

## 6. Live Provider Requirements

- Ethereum live mode requires a valid Etherscan API key
- Bitcoin live mode requires reachable Blockstream API
- If providers are unreachable, investigations may:
  - Fail entirely (if no transactions retrieved)
  - Produce partial traces (if failure occurs mid-traversal)
  - Fall back to demo data if `DEMO_MODE=true`

## 7. Trace Depth & Scope Limits

Default limits (configurable via environment):
- `MAX_HOPS`: 6
- `MAX_WALLETS_PER_INVESTIGATION`: 50
- `MAX_TRANSACTIONS_PER_WALLET`: 100
- `MAX_TOTAL_TRANSACTIONS`: 500

Complex money-laundering chains exceeding these limits will be **truncated**, not fully analyzed.

## 8. Authentication

- **Disabled by default** (`AUTH_REQUIRED=false`)
- When disabled, any unauthenticated user can:
  - Create investigations
  - View all investigations
  - Delete investigations
  - Generate PDF reports
- When enabled, JWT authentication and ownership checks are correctly implemented

## 9. Frontend Limitations

- Graph rendering requires `react-force-graph-2d` canvas; very large graphs (hundreds of nodes) may impact performance
- No offline mode; frontend requires backend API availability
- Report preview is client-side only; PDF export requires backend endpoint

## 10. Compliance Screening Limitations

- Default: `SANCTIONS_ENABLED=false`
- When disabled, all addresses return `UNKNOWN` with "Sanctions screening source is not configured"
- No built-in sanctions list; requires external provider configuration
- Compliance results are indicators, not definitive legal determinations

## 11. Address Validation Limitations

- Bitcoin validation covers Bech32 and legacy/P2SH formats
- Does not validate against Bitcoin script semantics or witness versions
- Ethereum validation uses `ethers.isAddress()` which checks checksum validity
- Invalid or malformed addresses are rejected at the API layer

## 12. Investigation State Machine

- States are simple strings; no formal state machine validation
- Race conditions are possible if multiple requests target the same investigation simultaneously
- `claimInvestigation` provides basic optimistic locking but is not distributed-transaction safe

## 13. No Audit Logging

- Request/response bodies are not logged
- Investigation changes are not versioned
- No immutable audit trail for forensic integrity

## 14. Case ID Generation

```javascript
caseId: `CASE-SIH-${Math.floor(1000 + Math.random() * 9000)}`
```

- Case IDs are randomly generated 4-digit suffixes
- Not sequential, not guaranteed unique across restarts
- Not suitable as legal case identifiers without external coordination
