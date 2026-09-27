import config from '../../config/index.js';
import { validateBitcoinAddress } from '../blockchain/validator.js';
import { createProviderError, PROVIDER_ERROR_CODES } from './providerErrors.js';
import { createProviderMetrics, requestProviderJson } from './providerHttp.js';

const PROVIDER_NAME = 'blockstream';
const NETWORK_NAME = 'bitcoin';
const BLOCKSTREAM_PAGE_SIZE = 25;
const MAX_PAGES_PER_WALLET = 4;

function baseUrl() {
  return String(config.BITCOIN_API_URL || '').replace(/\/$/, '');
}

function assertAddress(address) {
  if (!validateBitcoinAddress(address)) {
    throw createProviderError(
      PROVIDER_ERROR_CODES.INVALID_ADDRESS,
      'The provided Bitcoin address is invalid.',
      422,
      null,
      { provider: PROVIDER_NAME, network: NETWORK_NAME, retryable: false },
    );
  }
}


function normalizeTransaction(transaction, walletAddress) {
  const inputs = transaction.vin || [];
  const outputs = transaction.vout || [];
  const txid = transaction.txid || '';
  const walletKey = String(walletAddress || '').trim().toLowerCase();

  const hasInput = inputs.some((input) => String(input.prevout?.scriptpubkey_address || '').trim().toLowerCase() === walletKey);
  const hasOutput = outputs.some((output) => String(output.scriptpubkey_address || '').trim().toLowerCase() === walletKey);

  let direction;
  if (hasInput && hasOutput) {
    direction = 'self-transfer';
  } else if (hasInput) {
    direction = 'outgoing';
  } else if (hasOutput) {
    direction = 'incoming';
  } else {
    direction = 'unknown';
  }

  const from = inputs.find((input) => input.prevout?.scriptpubkey_address)?.prevout?.scriptpubkey_address || '';
  const to = outputs.find((output) => output.scriptpubkey_address)?.scriptpubkey_address || '';
  const blockNumber = Number(transaction.status?.block_height || 0);
  const timestamp = transaction.status?.block_time
    ? new Date(Number(transaction.status.block_time) * 1000).toISOString()
    : null;

  let value;
  if (direction === 'outgoing') {
    value = outputs.reduce((sum, output) => sum + Number(output.value || 0), 0) / 100000000;
  } else if (direction === 'incoming') {
    value = outputs
      .filter((output) => String(output.scriptpubkey_address || '').trim().toLowerCase() === walletKey)
      .reduce((sum, output) => sum + Number(output.value || 0), 0) / 100000000;
  } else {
    value = outputs.reduce((sum, output) => sum + Number(output.value || 0), 0) / 100000000;
  }

  return {
    transactionId: txid,
    from,
    to,
    value,
    timestamp,
    hash: txid,
    network: 'bitcoin',
    blockNumber,
    raw: transaction,
    transaction_id: txid,
    amount: value,
    asset: 'BTC',
    block_height: blockNumber,
    synthetic: false,
    demo: false,
    direction,
    status: transaction.status?.confirmed ? 'confirmed' : 'unconfirmed',
  };
}

class BitcoinProvider {
  async getWalletTransactions(address, network = 'bitcoin', context = {}) {
    assertAddress(address);

    const metrics = context.metrics || createProviderMetrics();
    const perWalletLimit = Math.max(1, Number(config.MAX_TRANSACTIONS_PER_WALLET) || 50);
    const allTransactions = [];
    const txsUrl = `${baseUrl()}/address/${encodeURIComponent(address)}/txs`;
    let beforeTxId = null;
    let hasMore = true;
    let pagesProcessed = 0;
    let truncated = false;

    while (hasMore && allTransactions.length < perWalletLimit && pagesProcessed < MAX_PAGES_PER_WALLET) {
      pagesProcessed += 1;
      const url = beforeTxId ? `${txsUrl}?before=${encodeURIComponent(beforeTxId)}` : txsUrl;
      const payload = await requestProviderJson(url, { provider: PROVIDER_NAME, network: NETWORK_NAME, metrics });

      if (!Array.isArray(payload) || payload.length === 0) {
        hasMore = false;
        break;
      }

      allTransactions.push(...payload.map((tx) => normalizeTransaction(tx, address)));

      if (payload.length < BLOCKSTREAM_PAGE_SIZE) {
        hasMore = false;
      } else {
        beforeTxId = payload[payload.length - 1].txid;
      }
    }

    if (hasMore || allTransactions.length >= perWalletLimit) truncated = true;

    allTransactions.sort((a, b) => {
      const d = Number(b.blockNumber || 0) - Number(a.blockNumber || 0);
      if (d !== 0) return d;
      const ta = String(a.transactionId || '');
      const tb = String(b.transactionId || '');
      return ta < tb ? -1 : ta > tb ? 1 : 0;
    });

    const transactions = allTransactions.slice(0, perWalletLimit);

    return {
      address,
      network: 'bitcoin',
      transactions,
      provider_tx_count: allTransactions.length,
      pagination: { pages: pagesProcessed, before_txid: beforeTxId || null, truncated },
      diagnostics: { ...metrics, provider: PROVIDER_NAME, network: NETWORK_NAME },
      synthetic: false,
      mode: 'LIVE',
    };
  }

  async getTransaction(txHash, network = 'bitcoin', context = {}) {
    if (!txHash || typeof txHash !== 'string') {
      throw createProviderError(
        PROVIDER_ERROR_CODES.INVALID_ADDRESS,
        'The transaction hash is invalid.',
        422,
        null,
        { provider: PROVIDER_NAME, network: NETWORK_NAME, retryable: false },
      );
    }

    const url = `${baseUrl()}/tx/${encodeURIComponent(txHash)}`;
    const payload = await requestProviderJson(url, { provider: PROVIDER_NAME, network: NETWORK_NAME, metrics: context.metrics });
    return normalizeTransaction(payload, null);
  }

  async getWalletInfo(address, network = 'bitcoin', context = {}) {
    assertAddress(address);
    const url = `${baseUrl()}/address/${encodeURIComponent(address)}`;
    const payload = await requestProviderJson(url, { provider: PROVIDER_NAME, network: NETWORK_NAME, metrics: context.metrics });
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
