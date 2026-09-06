import config from '../../config/index.js';
import { validateBitcoinAddress } from '../blockchain/validator.js';
import { createProviderError, isRateLimited, normalizeProviderFailure } from './providerErrors.js';

function assertAddress(address) {
  if (!validateBitcoinAddress(address)) {
    throw createProviderError('INVALID_ADDRESS', 'The provided Bitcoin address is invalid.', 422);
  }
}

async function requestJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.BLOCKCHAIN_PROVIDER_TIMEOUT);

  try {
    const response = await fetch(url, { signal: controller.signal });
    let payload;

    try {
      payload = await response.json();
    } catch (error) {
      throw createProviderError('BLOCKCHAIN_API_ERROR', 'Bitcoin provider returned invalid JSON.', 502, error);
    }

    if (isRateLimited(response.status, payload)) {
      throw createProviderError('RATE_LIMITED', 'The Bitcoin provider rate limit was reached.', 429);
    }

    if (!response.ok) {
      throw createProviderError('BLOCKCHAIN_API_ERROR', 'The Bitcoin provider request failed.', 502);
    }

    return payload;
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw createProviderError('PROVIDER_TIMEOUT', 'The Bitcoin provider request timed out.', 504, error);
    }
    throw normalizeProviderFailure(error);
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeTransaction(transaction) {
  const inputs = transaction.vin || [];
  const outputs = transaction.vout || [];
  const from = inputs.find((input) => input.prevout?.scriptpubkey_address)?.prevout?.scriptpubkey_address || '';
  const to = outputs.find((output) => output.scriptpubkey_address)?.scriptpubkey_address || '';
  const value = outputs.reduce((sum, output) => sum + Number(output.value || 0), 0) / 100000000;
  const blockNumber = Number(transaction.status?.block_height || 0);
  const timestamp = transaction.status?.block_time
    ? new Date(Number(transaction.status.block_time) * 1000).toISOString()
    : null;

  return {
    transactionId: transaction.txid,
    from,
    to,
    value,
    timestamp,
    hash: transaction.txid,
    network: 'bitcoin',
    blockNumber,
    raw: transaction,
    transaction_id: transaction.txid,
    amount: value,
    asset: 'BTC',
    block_height: blockNumber,
    synthetic: false,
    demo: false,
  };
}

class BitcoinProvider {
  async getWalletTransactions(address, network = 'bitcoin') {
    assertAddress(address);
    const url = `${config.BITCOIN_API_URL.replace(/\/$/, '')}/address/${encodeURIComponent(address)}/txs`;
    const payload = await requestJson(url);

    if (!Array.isArray(payload)) {
      throw createProviderError('BLOCKCHAIN_API_ERROR', 'Bitcoin provider returned an invalid transaction response.', 502);
    }

    return {
      address,
      network: 'bitcoin',
      transactions: payload.slice(0, config.MAX_TRANSACTIONS).map(normalizeTransaction),
      synthetic: false,
      mode: 'LIVE',
    };
  }

  async getTransaction(txHash, network = 'bitcoin') {
    if (!txHash || typeof txHash !== 'string') {
      throw createProviderError('INVALID_ADDRESS', 'The transaction hash is invalid.', 422);
    }

    const url = `${config.BITCOIN_API_URL.replace(/\/$/, '')}/tx/${encodeURIComponent(txHash)}`;
    return normalizeTransaction(await requestJson(url));
  }

  async getWalletInfo(address, network = 'bitcoin') {
    assertAddress(address);
    const url = `${config.BITCOIN_API_URL.replace(/\/$/, '')}/address/${encodeURIComponent(address)}`;
    const payload = await requestJson(url);
    const funded = Number(payload?.chain_stats?.funded_txo_sum || 0);
    const spent = Number(payload?.chain_stats?.spent_txo_sum || 0);

    return {
      address,
      network,
      balance: `${(funded - spent) / 100000000} BTC`,
      transaction_count: payload?.chain_stats?.tx_count || 0,
      synthetic: false,
      mode: 'LIVE',
    };
  }
}

export default new BitcoinProvider();
