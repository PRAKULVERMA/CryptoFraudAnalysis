# CHAINTRACE AI — Data Stores & Persistence

## 1. MemoryRepository (Default)

**File:** `backend/repositories/memoryRepository.js`

The default persistence layer stores investigations in process memory.

### Structure
```javascript
{
  investigation_id: string (UUID),
  user_id: string | null,
  wallet_address: string,
  network: string,
  status: 'queued' | 'running' | 'completed' | 'failed' | 'retrying',
  progress: number (0-100),
  current_step: string,
  created_at: ISO string,
  started_at: ISO string | null,
  completed_at: ISO string | null,
  failed_at: ISO string | null,
  retry_count: number,
  max_retries: number,
  last_error: object | null,
  error: string | null,
  results: object | null,
  synthetic: boolean,
  mode: 'DEMO' | 'LIVE'
}
```

### Methods
- `createInvestigation(record)` — inserts new record
- `getInvestigation(id)` — returns record by ID
- `updateInvestigation(id, updates)` — partial update
- `deleteInvestigation(id)` — removes record
- `listInvestigations(userId?)` — lists all, optionally filtered by user
- `claimInvestigation(id)` — atomically claims a queued/failed/retrying investigation for processing
- `findStaleRunning(thresholdMs)` — finds running/retrying jobs older than threshold
- `findRetryableFailed()` — finds failed jobs with remaining retries

### Limitations
- Data is lost when the process restarts
- Not suitable for multi-process or multi-instance deployments
- No query optimization or indexing

## 2. MongoDB (Optional)

**File:** `backend/config/mongodb.js`
**Model:** `backend/models/investigation.js`

Enabled when `MONGODB_URI` is configured.

### Connection
- Uses Mongoose to connect to MongoDB
- Connection string from `MONGODB_URI`
- Connection options include server selection timeout

### Schema
Mongoose model mirrors the investigation record structure with timestamps.

### Usage
- `InvestigationService` delegates to the active repository
- When `MONGODB_URI` is empty, `MemoryRepository` is used
- `getMongoDBStatus()` reports connection state

### Limitations
- Disabled by default
- No migration or schema versioning visible in source
- Connection errors fall back silently to memory in some paths

## 3. Neo4j (Optional)

**File:** `backend/services/graph/neo4jGraphService.js`
**Config:** `backend/config/neo4j.js`

Enabled when `NEO4J_ENABLED=true` and connection succeeds.

### Nodes

#### Investigation
```cypher
MERGE (inv:Investigation {id: $investigationId})
SET inv.network = $network,
    inv.root_address = $rootAddress,
    inv.created_at = datetime()
```

#### Wallet
```cypher
MERGE (w:Wallet {normalized_address: $normalizedAddress, network: $network})
SET w.address = $address,
    w.node_type = coalesce(w.node_type, $nodeType),
    w.first_seen = coalesce(w.first_seen, datetime()),
    w.last_seen = datetime()
```

### Relationships

#### CONTAINS
```cypher
MERGE (inv)-[:CONTAINS]->(w)
```
Scopes wallets to a specific investigation.

#### TRANSFER
```cypher
MERGE (src)-[r:TRANSFER {transaction_id, network, investigation_id, hash, value, timestamp, fee, status, direction, hop, block_number}]->(tgt)
SET r.hash = $hash,
    r.value = $value,
    ...
```

### Constraints
```cypher
CREATE CONSTRAINT wallet_unique IF NOT EXISTS
FOR (w:Wallet)
REQUIRE (w.normalized_address, w.network) IS UNIQUE
```

### Query Patterns

All queries are scoped by investigation:
```cypher
MATCH (inv:Investigation {id: $investigationId})-[:CONTAINS]->(w:Wallet)
```

### Analytics Methods

| Method | Purpose | Cypher Pattern |
|--------|---------|----------------|
| `detectCycles` | Circular fund flows | `(w)-[:TRANSFER*1..10]->(w)` with `LIMIT 50` |
| `detectConvergence` | Multiple sources → one destination | `(src)-[:TRANSFER*1..6]->(dest)` with `LIMIT 50` |
| `findHighFanOutWallets` | Wallets with many outgoing transfers | `MATCH (src)-[r:TRANSFER]->(tgt)` with `LIMIT 25` |
| `findHighFanInWallets` | Wallets with many incoming transfers | `MATCH (src)-[r:TRANSFER]->(tgt)` with `LIMIT 25` |
| `getTerminalDestinations` | Wallets with no outgoing edges | `WHERE NOT (dest)-[:TRANSFER]->(:Wallet)` with `LIMIT 25` |
| `getShortestPaths` | Shortest path between two wallets | `shortestPath((src)-[:TRANSFER*1..10]->(tgt))` |
| `getGraphMetrics` | Node count, edge count, average degree | Aggregation queries with `LIMIT` implicit via aggregation |

### Session Management
- Each method creates a new session via `driver.session()`
- Sessions are closed in `finally` blocks
- Null driver checks return empty arrays or `null` early

### Fallback Behavior
When Neo4j is unavailable:
- Graph is still built in memory
- `graph_analysis.provider = 'memory'`
- `graph_analysis.status = 'ACTIVE'` or `'FALLBACK'`
- Risk engine skips cycle/convergence signals
- Intelligence service continues with in-memory analysis

## 4. Frontend State

The frontend uses a Zustand-like store (`investigationGraphStore`) for client-side state:

- `result`: Current investigation result object
- `isRunning`: Investigation in progress
- `error`: Error message
- `address`, `network`: Current target
- `publishInvestigation(result, meta)`: Updates store with new investigation

This store is separate from backend persistence and is ephemeral per browser session.
