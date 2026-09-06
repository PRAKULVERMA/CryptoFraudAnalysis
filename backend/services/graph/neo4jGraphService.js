import { getNeo4jDriver } from '../../config/neo4j.js';

function normalizeAddress(address) {
  return String(address || '').trim().toLowerCase();
}

export class Neo4jGraphService {
  #schemaEnsured = false;

  async connect() {
    const driver = await getNeo4jDriver();
    if (!driver) {
      throw new Error('Neo4j driver is not available.');
    }
    return driver;
  }

  async #ensureSchema() {
    if (this.#schemaEnsured) return;
    const driver = await getNeo4jDriver();
    if (!driver) return;

    const session = driver.session();
    try {
      await session.executeWrite(async (tx) => {
        await tx.run(
          `CREATE CONSTRAINT wallet_unique IF NOT EXISTS
           FOR (w:Wallet)
           REQUIRE (w.normalized_address, w.network) IS UNIQUE`
        );
      });
      this.#schemaEnsured = true;
    } catch (error) {
      console.error('[Neo4j] Failed to ensure schema:', error.message);
    } finally {
      await session.close();
    }
  }

  async storeInvestigationGraph(investigationId, rootAddress, network, nodes = [], edges = []) {
    const driver = await getNeo4jDriver();
    if (!driver) return null;

    await this.#ensureSchema();

    const session = driver.session();
    try {
      await session.executeWrite(async (tx) => {
        await tx.run(
          `MERGE (inv:Investigation {id: $investigationId})
           SET inv.network = $network,
               inv.root_address = $rootAddress,
               inv.created_at = datetime()
           MERGE (root:Wallet {normalized_address: $rootKey, network: $network})
           SET root.address = $rootAddress,
               root.node_type = 'suspect',
               root.first_seen = coalesce(root.first_seen, datetime()),
               root.last_seen = datetime()
           MERGE (inv)-[:CONTAINS]->(root)`,
          {
            investigationId,
            rootAddress,
            network,
            rootKey: normalizeAddress(rootAddress),
          }
        );

        for (const node of nodes) {
          const address = node.address || node.id || '';
          if (!address || normalizeAddress(address) === normalizeAddress(rootAddress)) continue;

          await tx.run(
            `MERGE (w:Wallet {normalized_address: $normalizedAddress, network: $network})
             SET w.address = $address,
                 w.node_type = coalesce(w.node_type, 'wallet'),
                 w.first_seen = coalesce(w.first_seen, datetime()),
                 w.last_seen = datetime()
             MERGE (inv:Investigation {id: $investigationId})
             MERGE (inv)-[:CONTAINS]->(w)`,
            {
              investigationId,
              address,
              normalizedAddress: normalizeAddress(address),
              network,
            }
          );
        }

        for (const edge of edges) {
          const source = edge.source || edge.from || '';
          const target = edge.target || edge.to || '';
          if (!source || !target) continue;

          const transactionId = edge.transactionId || edge.transaction_id || edge.hash || `${source}-${target}`;
          await tx.run(
            `MATCH (src:Wallet {normalized_address: $sourceKey, network: $network})
             MATCH (tgt:Wallet {normalized_address: $targetKey, network: $network})
              MERGE (src)-[r:TRANSFER {transaction_id: $transactionId, network: $network, investigation_id: $investigationId}]->(tgt)
             SET r.hash = $hash,
                 r.value = $value,
                 r.timestamp = $timestamp,
                 r.fee = $fee,
                 r.status = $status,
                 r.direction = $direction,
                 r.hop = $hop,
                 r.block_number = $blockNumber`,
             {
              sourceKey: normalizeAddress(source),
              targetKey: normalizeAddress(target),
              network,
              investigationId,
              transactionId,
              hash: edge.hash || transactionId,
              value: Number(edge.value || edge.amount || 0),
              timestamp: edge.timestamp ? new Date(edge.timestamp).toISOString() : new Date().toISOString(),
              fee: edge.fee !== undefined ? Number(edge.fee) : null,
              status: edge.status || 'unknown',
              direction: edge.direction || 'unknown',
              hop: Number(edge.hop || 1),
              blockNumber: Number(edge.blockNumber || edge.block_height || 0),
            }
          );
        }
      });

      return { stored: true, nodeCount: nodes.length, edgeCount: edges.length };
    } catch (error) {
      console.error('[Neo4j] Failed to store investigation graph:', error.message);
      return null;
    } finally {
      await session.close();
    }
  }

  async getInvestigationGraph(investigationId) {
    const driver = await getNeo4jDriver();
    if (!driver) return null;

    const session = driver.session();
    try {
      const result = await session.executeRead(async (tx) => {
        const nodesResult = await tx.run(
          `MATCH (inv:Investigation {id: $investigationId})-[:CONTAINS]->(w:Wallet)
           RETURN w`,
          { investigationId }
        );

        const edgesResult = await tx.run(
          `MATCH (inv:Investigation {id: $investigationId})-[:CONTAINS]->(src:Wallet)
           MATCH (src)-[r:TRANSFER]->(tgt:Wallet)
           WHERE (inv)-[:CONTAINS]->(tgt)
           RETURN src, r, tgt`,
          { investigationId }
        );

        return {
          nodes: nodesResult.records.map((record) => record.get('w').properties),
          edges: edgesResult.records.map((record) => {
            const rel = record.get('r');
            const src = record.get('src');
            const tgt = record.get('tgt');
            return {
              ...rel.properties,
              source: src.properties.address || src.properties.normalized_address,
              target: tgt.properties.address || tgt.properties.normalized_address,
            };
          }),
        };
      });

      return result;
    } catch (error) {
      console.error('[Neo4j] Failed to get investigation graph:', error.message);
      return null;
    } finally {
      await session.close();
    }
  }

  async detectCycles(investigationId) {
    const driver = await getNeo4jDriver();
    if (!driver) return { detected: false };

    const session = driver.session();
    try {
      const result = await session.executeRead(async (tx) => {
        const cyclesResult = await tx.run(
          `MATCH (inv:Investigation {id: $investigationId})-[:CONTAINS]->(w:Wallet)
           MATCH path = (w)-[:TRANSFER*1..10]->(w)
           WHERE ALL(x IN nodes(path)[1..-1] WHERE (inv)-[:CONTAINS]->(x))
           RETURN path,
                  [node IN nodes(path) | node.address] AS wallets,
                  [rel IN relationships(path) | rel.transaction_id] AS transactionIds,
                  length(path) AS cycleLength
           LIMIT 50`,
          { investigationId }
        );

        const cycles = [];
        for (const record of cyclesResult.records) {
          cycles.push({
            cycle_length: record.get('cycleLength'),
            wallets: record.get('wallets'),
            transaction_ids: record.get('transactionIds'),
          });
        }

        if (cycles.length === 0) {
          return { detected: false };
        }

        const shortestCycle = cycles.reduce((min, cycle) => (cycle.cycle_length < min.cycle_length ? cycle : min), cycles[0]);

        return {
          detected: true,
          signal: 'CIRCULAR_FLOW',
          score: Math.min(25, cycles.length * 8 + 5),
          confidence: Math.min(85, 50 + cycles.length * 5),
          evidence: {
            cycle_count: cycles.length,
            cycle_length: shortestCycle.cycle_length,
            wallets: shortestCycle.wallets,
            transaction_ids: shortestCycle.transaction_ids,
          },
        };
      });

      return result;
    } catch (error) {
      console.error('[Neo4j] Failed to detect cycles:', error.message);
      return { detected: false };
    } finally {
      await session.close();
    }
  }

  async detectConvergence(investigationId) {
    const driver = await getNeo4jDriver();
    if (!driver) return { detected: false };

    const session = driver.session();
    try {
      const result = await session.executeRead(async (tx) => {
        const convergenceResult = await tx.run(
          `MATCH (inv:Investigation {id: $investigationId})-[:CONTAINS]->(src:Wallet)
           MATCH p = (src)-[:TRANSFER*1..6]->(dest:Wallet)
           WHERE (inv)-[:CONTAINS]->(dest)
           WITH dest, count(DISTINCT src) AS uniqueSources, max(length(p)) AS maxHop
           WHERE uniqueSources >= 2
           RETURN dest.address AS destination, uniqueSources, maxHop
           LIMIT 50`,
          { investigationId }
        );

        const convergences = [];
        for (const record of convergenceResult.records) {
          convergences.push({
            destination: record.get('destination'),
            unique_sources: record.get('uniqueSources'),
            max_hop: record.get('maxHop'),
          });
        }

        if (convergences.length === 0) {
          return { detected: false };
        }

        const strongest = convergences.reduce((max, conv) => (conv.unique_sources > max.unique_sources ? conv : max), convergences[0]);

        return {
          detected: true,
          signal: 'FLOW_CONVERGENCE',
          score: Math.min(20, convergences.length * 5 + 5),
          confidence: Math.min(80, 45 + convergences.length * 4),
          evidence: {
            convergence_count: convergences.length,
            destination: strongest.destination,
            unique_sources: strongest.unique_sources,
            max_hop: strongest.max_hop,
            points: convergences.slice(0, 10),
          },
        };
      });

      return result;
    } catch (error) {
      console.error('[Neo4j] Failed to detect convergence:', error.message);
      return { detected: false };
    } finally {
      await session.close();
    }
  }

  async findHighFanOutWallets(investigationId, threshold = 4) {
    const driver = await getNeo4jDriver();
    if (!driver) return [];

    const session = driver.session();
    try {
      const result = await session.executeRead(async (tx) => {
        const fanOutResult = await tx.run(
          `MATCH (inv:Investigation {id: $investigationId})-[:CONTAINS]->(src:Wallet)
           MATCH (src)-[r:TRANSFER]->(tgt:Wallet)
           WHERE (inv)-[:CONTAINS]->(tgt)
           RETURN src.address AS wallet, count(r) AS fanOut
           ORDER BY fanOut DESC
           LIMIT 25`,
          { investigationId }
        );

        return fanOutResult.records
          .filter((record) => record.get('fanOut') >= threshold)
          .map((record) => ({
            wallet: record.get('wallet'),
            fan_out: record.get('fanOut'),
          }));
      });

      return result;
    } catch (error) {
      console.error('[Neo4j] Failed to find high fan-out wallets:', error.message);
      return [];
    } finally {
      await session.close();
    }
  }

  async findHighFanInWallets(investigationId, threshold = 4) {
    const driver = await getNeo4jDriver();
    if (!driver) return [];

    const session = driver.session();
    try {
      const result = await session.executeRead(async (tx) => {
        const fanInResult = await tx.run(
          `MATCH (inv:Investigation {id: $investigationId})-[:CONTAINS]->(tgt:Wallet)
           MATCH (src:Wallet)-[r:TRANSFER]->(tgt)
           WHERE (inv)-[:CONTAINS]->(src)
           RETURN tgt.address AS wallet, count(r) AS fanIn
           ORDER BY fanIn DESC
           LIMIT 25`,
          { investigationId }
        );

        return fanInResult.records
          .filter((record) => record.get('fanIn') >= threshold)
          .map((record) => ({
            wallet: record.get('wallet'),
            fan_in: record.get('fanIn'),
          }));
      });

      return result;
    } catch (error) {
      console.error('[Neo4j] Failed to find high fan-in wallets:', error.message);
      return [];
    } finally {
      await session.close();
    }
  }

  async getTerminalDestinations(investigationId) {
    const driver = await getNeo4jDriver();
    if (!driver) return [];

    const session = driver.session();
    try {
      const result = await session.executeRead(async (tx) => {
        const terminalResult = await tx.run(
          `MATCH (inv:Investigation {id: $investigationId})-[:CONTAINS]->(w:Wallet)
           MATCH (w)-[r:TRANSFER]->(dest:Wallet)
           WHERE (inv)-[:CONTAINS]->(dest)
           AND NOT (dest)-[:TRANSFER]->(:Wallet)
           RETURN dest.address AS destination, count(r) AS incomingTransfers
           ORDER BY incomingTransfers DESC
           LIMIT 25`,
          { investigationId }
        );

        return terminalResult.records.map((record) => ({
          destination: record.get('destination'),
          incoming_transfers: record.get('incomingTransfers'),
        }));
      });

      return result;
    } catch (error) {
      console.error('[Neo4j] Failed to get terminal destinations:', error.message);
      return [];
    } finally {
      await session.close();
    }
  }

  async getShortestPaths(investigationId, sourceAddress, targetAddress) {
    const driver = await getNeo4jDriver();
    if (!driver) return null;

    const session = driver.session();
    try {
      const result = await session.executeRead(async (tx) => {
        const pathResult = await tx.run(
          `MATCH (inv:Investigation {id: $investigationId})-[:CONTAINS]->(src:Wallet {normalized_address: $sourceKey})
           MATCH (inv)-[:CONTAINS]->(tgt:Wallet {normalized_address: $targetKey})
           MATCH path = shortestPath((src)-[:TRANSFER*1..10]->(tgt))
           WHERE ALL(x IN nodes(path)[1..-1] WHERE (inv)-[:CONTAINS]->(x))
           RETURN path`,
          {
            investigationId,
            sourceKey: normalizeAddress(sourceAddress),
            targetKey: normalizeAddress(targetAddress),
          }
        );

        if (pathResult.records.length === 0) {
          return null;
        }

        const path = pathResult.records[0].get('path');
        return {
          length: path.length,
          nodes: path.nodes.map((node) => node.properties),
          relationships: path.relationships.map((rel) => ({
            ...rel.properties,
            source: path.nodes[path.relationships.indexOf(rel)]?.properties.address,
            target: path.nodes[path.relationships.indexOf(rel) + 1]?.properties.address,
          })),
        };
      });

      return result;
    } catch (error) {
      console.error('[Neo4j] Failed to get shortest paths:', error.message);
      return null;
    } finally {
      await session.close();
    }
  }

  async getGraphMetrics(investigationId) {
    const driver = await getNeo4jDriver();
    if (!driver) return null;

    const session = driver.session();
    try {
      const result = await session.executeRead(async (tx) => {
        const metricsResult = await tx.run(
          `MATCH (inv:Investigation {id: $investigationId})-[:CONTAINS]->(w:Wallet)
           WITH count(DISTINCT w) AS nodeCount
           MATCH (inv:Investigation {id: $investigationId})-[:CONTAINS]->(src:Wallet)
           OPTIONAL MATCH (src)-[r:TRANSFER]->(tgt:Wallet)
           WHERE (inv)-[:CONTAINS]->(tgt)
           WITH nodeCount, count(DISTINCT r) AS edgeCount
           RETURN nodeCount, edgeCount,
                  CASE WHEN nodeCount > 0 THEN toFloat(2 * edgeCount) / nodeCount ELSE 0 END AS avgDegree`,
          { investigationId }
        );

        if (metricsResult.records.length === 0) {
          return null;
        }

        const record = metricsResult.records[0];
        return {
          node_count: record.get('nodeCount'),
          edge_count: record.get('edgeCount'),
          average_degree: Number(record.get('avgDegree').toFixed(2)),
        };
      });

      return result;
    } catch (error) {
      console.error('[Neo4j] Failed to get graph metrics:', error.message);
      return null;
    } finally {
      await session.close();
    }
  }

  async storeWalletNode(investigationId, address, network, nodeType = 'wallet') {
    const driver = await getNeo4jDriver();
    if (!driver) return null;

    const session = driver.session();
    try {
      await session.executeWrite(async (tx) => {
        await tx.run(
          `MERGE (w:Wallet {normalized_address: $normalizedAddress, network: $network})
           SET w.address = $address,
               w.node_type = coalesce(w.node_type, $nodeType),
               w.first_seen = coalesce(w.first_seen, datetime()),
               w.last_seen = datetime()
           MERGE (inv:Investigation {id: $investigationId})
           MERGE (inv)-[:CONTAINS]->(w)`,
          {
            investigationId,
            address,
            normalizedAddress: normalizeAddress(address),
            network,
            nodeType,
          }
        );
      });

      return { stored: true };
    } catch (error) {
      console.error('[Neo4j] Failed to store wallet node:', error.message);
      return null;
    } finally {
      await session.close();
    }
  }

  async storeTransactionEdge(investigationId, source, target, network, edgeData = {}) {
    const driver = await getNeo4jDriver();
    if (!driver) return null;

    const session = driver.session();
    try {
      await session.executeWrite(async (tx) => {
        await tx.run(
          `MATCH (src:Wallet {normalized_address: $sourceKey, network: $network})
           MATCH (tgt:Wallet {normalized_address: $targetKey, network: $network})
            MERGE (src)-[r:TRANSFER {transaction_id: $transactionId, network: $network, investigation_id: $investigationId}]->(tgt)
            SET r.hash = $hash,
               r.value = $value,
               r.timestamp = $timestamp,
               r.fee = $fee,
               r.status = $status,
               r.direction = $direction,
               r.hop = $hop,
               r.block_number = $blockNumber`,
          {
            investigationId,
            sourceKey: normalizeAddress(source),
            targetKey: normalizeAddress(target),
            network,
            transactionId: edgeData.transactionId || edgeData.transaction_id || edgeData.hash || `${source}-${target}`,
            hash: edgeData.hash || edgeData.transactionId || edgeData.transaction_id || `${source}-${target}`,
            value: Number(edgeData.value || edgeData.amount || 0),
            timestamp: edgeData.timestamp ? new Date(edgeData.timestamp).toISOString() : new Date().toISOString(),
            fee: edgeData.fee !== undefined ? Number(edgeData.fee) : null,
            status: edgeData.status || 'unknown',
            direction: edgeData.direction || 'unknown',
            hop: Number(edgeData.hop || 1),
            blockNumber: Number(edgeData.blockNumber || edgeData.block_height || 0),
          }
        );
      });

      return { stored: true };
    } catch (error) {
      console.error('[Neo4j] Failed to store transaction edge:', error.message);
      return null;
    } finally {
      await session.close();
    }
  }

  async getWalletGraph(address, network) {
    const driver = await getNeo4jDriver();
    if (!driver) return null;

    const session = driver.session();
    try {
      const result = await session.executeRead(async (tx) => {
        const nodesResult = await tx.run(
          `MATCH (w:Wallet {normalized_address: $address, network: $network})
           OPTIONAL MATCH (w)-[r:TRANSFER]->(tgt:Wallet)
           OPTIONAL MATCH (src:Wallet)-[r2:TRANSFER]->(w)
           RETURN w,
                  collect(DISTINCT tgt) AS targets,
                  collect(DISTINCT src) AS sources`,
          { address: normalizeAddress(address), network }
        );

        if (nodesResult.records.length === 0) {
          return { nodes: [], edges: [] };
        }

        const record = nodesResult.records[0];
        const wallet = record.get('w').properties;
        const targets = record.get('targets').map((node) => node.properties);
        const sources = record.get('sources').map((node) => node.properties);

        const nodes = [wallet, ...targets, ...sources];
        const uniqueNodes = Array.from(new Map(nodes.map((n) => [n.normalized_address, n])).values());

        const edgesResult = await tx.run(
          `MATCH (src:Wallet {normalized_address: $address, network: $network})-[r:TRANSFER]->(tgt:Wallet)
           RETURN r, src, tgt
           UNION ALL
           MATCH (src:Wallet)-[r:TRANSFER]->(tgt:Wallet {normalized_address: $address, network: $network})
           RETURN r, src, tgt`,
          { address: normalizeAddress(address), network }
        );

        const edges = edgesResult.records.map((record) => {
          const rel = record.get('r');
          const src = record.get('src');
          const tgt = record.get('tgt');
          return {
            ...rel.properties,
            source: src.properties.address || src.properties.normalized_address,
            target: tgt.properties.address || tgt.properties.normalized_address,
          };
        });

        return { nodes: uniqueNodes, edges };
      });

      return result;
    } catch (error) {
      console.error('[Neo4j] Failed to get wallet graph:', error.message);
      return null;
    } finally {
      await session.close();
    }
  }
}

export default new Neo4jGraphService();
