# CHAINTRACE AI — Data Flow & Investigation Lifecycle

## 1. Request Submission

**Endpoint:** `POST /api/investigate/wallet`

**Request Body:**
```json
{
  "address": "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
  "network": "bitcoin"
}
```

**Validation:**
- `address` and `network` are required
- `address` validated against network-specific regex (Bitcoin: Bech32 + legacy/P2SH; Ethereum: `ethers.isAddress`)
- `network` normalized to lowercase

## 2. Investigation Record Creation

`InvestigationService.createInvestigation` creates:
```javascript
{
  investigation_id: uuidv4(),
  user_id: req.user?.id || null,
  wallet_address: address,
  network: normalizedNetwork,
  status: 'queued',
  progress: 0,
  current_step: 'VALIDATING WALLET',
  created_at: ISO timestamp,
  synthetic: Boolean(config.DEMO_MODE),
  mode: config.DEMO_MODE ? 'DEMO' : 'LIVE',
  // ... timestamps, retry metadata
}
```

## 3. Job Processing

`InvestigationJobService.processInvestigation` runs in-process:

```
queued → running → completed
                → failed (with retry)
```

**States:**
- `queued`: Initial state or retry-queued state
- `running`: Active processing
- `completed`: Success
- `failed`: Permanent failure after max retries
- `retrying`: Intermediate retry state

**Progress:**
- 0%: Queued
- 10%: FETCHING_WALLET_TRANSACTIONS
- 20%: NORMALIZING_TRANSACTIONS
- 80%: BUILDING_TRACE
- 100%: COMPLETED

**Retry Logic:**
- Retryable errors: `ETIMEDOUT`, `ECONNRESET`, `EAI_AGAIN`, `RATE_LIMITED`, `PROVIDER_UNAVAILABLE`, `TRANSIENT_FAILURE`
- Exponential backoff: 1s → 2s → 4s → ... up to 30s
- Max retries: `INVESTIGATION_MAX_RETRIES` (default 3)

**Stale Recovery:**
- On server startup, `recoverStaleJobs()` finds investigations in `running` or `retrying` state older than `INVESTIGATION_STALE_TIMEOUT_MS` (default 15 minutes)
- Retryable stale jobs are re-queued; exhausted jobs are marked `failed`

## 4. Transaction Retrieval

### Bitcoin (Blockstream)
```
GET https://blockstream.info/api/address/{address}/txs
```
- Returns array of transactions
- No API key required

### Ethereum (Etherscan)
```
GET https://api.etherscan.io/v2/api?chainid=1&module=account&action=txlist&address={address}&startblock=0&endblock=99999999&page={page}&offset={pageSize}&sort=desc&apikey={key}
```
- Paginated by `page` and `offset`
- Requires `ETHERSCAN_API_KEY`

### Response Normalization
Each transaction is normalized to:
```javascript
{
  transactionId, from, to, value, timestamp, hash, network,
  blockNumber, raw, transaction_id, amount, asset, block_height,
  synthetic, demo, direction, status, fee
}
```

**Direction:**
- `self-transfer`: from === to
- `outgoing`: from === wallet
- `incoming`: to === wallet
- `unknown`: neither matches

## 5. Multi-Hop Tracing

`traceWallet` performs BFS traversal:

```
queue = [{ address: root, key: rootKey, hop: 0 }]
visitedWallets = { rootKey }
walletHops = { rootKey: 0 }

while queue not empty:
  current = queue.shift()
  if current.hop >= MAX_HOPS: continue

  transactions = provider.getWalletTransactions(current.address, network)
  
  for each transaction:
    if transaction already seen: continue
    if MAX_TOTAL_TRANSACTIONS reached: break
    
    record transaction with hop = current.hop + 1
    if direction === 'outgoing' or demo mode:
      nextHop = transaction.to
      if nextHop not visited and wallet limit not reached:
        visitedWallets.add(nextHop)
        queue.push({ address: nextHop, key: nextKey, hop: current.hop + 1 })
```

**Limits:**
- `MAX_HOPS` (default 6): Maximum traversal depth
- `MAX_WALLETS_PER_INVESTIGATION` (default 50): Unique wallets cap
- `MAX_TRANSACTIONS_PER_WALLET` (default 100): Transactions per wallet fetch
- `MAX_TOTAL_TRANSACTIONS` (default 500): Total transactions cap

**Partial Traces:**
- If a provider fails mid-traversal, `firstError` is recorded
- `trace_summary.partial = true`
- `trace_summary.provider_error = firstError.code`
- Processing continues with already-collected data

## 6. Graph Construction

`buildGraphFromTrace` creates:

```javascript
{
  nodes: [
    {
      id, label, address, type: 'suspect' | 'wallet',
      network, hop, synthetic, mode
    }
  ],
  edges: [
    {
      id, source, target, transactionId, hash, value, timestamp,
      hop, transaction_id, amount, synthetic, mode, direction
    }
  ],
  trace_summary: {
    transactions_analyzed, wallets_discovered, max_hops, max_hops_reached,
    limits_reached, synthetic, mode, total_outgoing_value, total_incoming_value,
    traced_outgoing_value, asset, funds_traced
  }
}
```

**Value Accounting:**
- `total_outgoing_value`: includes outgoing + self-transfer
- `total_incoming_value`: includes incoming + self-transfer
- `traced_outgoing_value`: excludes self-transfer

## 7. Risk Analysis

`analyzeEvidenceRisk` computes:

```javascript
{
  riskScore: 0-100,
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
  riskFactors: [...],
  patterns: [...],
  evidence: { signals: [...] },
  confidence: 0-100,
  graph_analysis: {
    provider: 'memory' | 'neo4j',
    status: 'ACTIVE' | 'AVAILABLE' | 'FALLBACK',
    reason: string
  }
}
```

## 8. Destination Attribution

### attributeDestination
- Extracts unique destinations from graph nodes and outgoing edges
- Queries `attributionRegistry` for each destination
- Returns first non-UNKNOWN result, or demo label if in demo mode, or UNKNOWN

### attributeExchange
- Extracts terminal destination addresses
- Runs conflict detection across providers
- Returns:
  - `VERIFIED` / `SUPPORTED` if attribution found
  - `CONFLICTING` if providers disagree
  - `UNAVAILABLE` if provider fails
  - `UNKNOWN` if no attribution found

## 9. Compliance Screening

`screenInvestigation`:
- Collects root address + terminal destinations
- Screens each via `HttpSanctionsProvider` or `UnconfiguredSanctionsProvider`
- Normalizes results to `CLEAR`, `MATCH`, `POSSIBLE_MATCH`, `UNKNOWN`
- Returns `compliance_screening` with `summary` and `results`

## 10. Intelligence Building

`buildInvestigationIntelligence`:
- Bounds wallet profiles to 100 wallets
- Bounds patterns to 50
- Bounds summary arrays to 20 (50 for terminal destinations)
- Always returns a valid structure, even for empty traces
- Status: `COMPLETED` or `PARTIAL`

## 11. Graph Storage (Neo4j)

If Neo4j is enabled and available:
- `storeInvestigationGraph` creates `Investigation` and `Wallet` nodes
- Creates `CONTAINS` and `TRANSFER` relationships
- All queries parameterized by `$investigationId`

If unavailable:
- `graphAnalysis.provider = 'memory'`
- Processing continues without graph persistence

## 12. Response Assembly

`analyzeWallet` assembles the final response:
```javascript
{
  address, network, caseId, timestamp,
  riskScore, riskLevel, fundsTraced, hopCount, transactionsAnalyzed,
  clusteringTag, peelingChains, destinationExchange, confidence,
  ofacMatch, synthetic, mode,
  destination, attribution, patterns, nodes, edges,
  trace_summary, risk_factors, evidence, graph_analysis,
  investigation_intelligence, destination_intelligence, compliance_screening
}
```

## 13. Frontend Consumption

- `LiveInvestigationSearch` submits the investigation and displays the dossier
- `TransactionNetworkGraph` renders the interactive graph via `react-force-graph-2d`
- `InvestigationReportPreview` displays a formatted report and triggers PDF export
- `publishInvestigation` updates the global investigation store
