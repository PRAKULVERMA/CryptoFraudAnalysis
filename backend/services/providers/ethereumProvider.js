import config from '../../config/index.js';
import { validateEthereumAddress } from '../blockchain/validator.js';
import { createProviderError, isRateLimited, normalizeProviderFailure } from './providerErrors.js';

const WEI_PER_ETH = 1000000000000000000n;

function assertApiKey() {
  if (!config.ETHERSCAN_API_KEY || config.ETHERSCAN_API_KEY === 'your_key_here') {
    throw createProviderError('PROVIDER_UNAVAILABLE', 'Ethereum provider credentials are not configured.', 503);
  }
}

function assertAddress(address) {
  if (!validateEthereumAddress(address)) {
    throw createProviderError('INVALID_ADDRESS', 'The provided Ethereum address is invalid.', 422);
  }
}

function weiToNumber(value) {
  try {
    const wei = BigInt(value || '0');
    const whole = wei / WEI_PER_ETH;
    const remainder = wei % WEI_PER_ETH;
    return Number(whole) + Number(remainder) / Number(WEI_PER_ETH);
  } catch {
    return 0;
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
      throw createProviderError('BLOCKCHAIN_API_ERROR', 'Ethereum provider returned invalid JSON.', 502, error);
    }

    if (isRateLimited(response.status, payload)) {
      throw createProviderError('RATE_LIMITED', 'The Ethereum provider rate limit was reached.', 429);
    }

    if (!response.ok) {
      throw createProviderError('BLOCKCHAIN_API_ERROR', 'The Ethereum provider request failed.', 502);
    }

    return payload;
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw createProviderError('PROVIDER_TIMEOUT', 'The Ethereum provider request timed out.', 504, error);
    }
    throw normalizeProviderFailure(error);
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeTransaction(transaction) {
  const hash = transaction.hash || transaction.transactionHash || transaction.blockHash || '';
  const timestamp = transaction.timeStamp
    ? new Date(Number(transaction.timeStamp) * 1000).toISOString()
    : null;
  const blockNumber = Number(transaction.blockNumber || 0);
  const value = weiToNumber(transaction.value);

  return {
    transactionId: hash,
    from: transaction.from || '',
    to: transaction.to || '',
    value,
    timestamp,
    hash,
    network: 'ethereum',
    blockNumber,
    raw: transaction,
    transaction_id: hash,
    amount: value,
    asset: 'ETH',
    block_height: blockNumber,
    synthetic: false,
    demo: false,
  };
}

class EthereumProvider {
  get apiBaseUrl() {
    return config.ETHERSCAN_API_URL;
  }

  async getWalletTransactions(address, network = 'ethereum') {
    assertAddress(address);
    assertApiKey();
    const url = new URL(this.apiBaseUrl);
    url.searchParams.set('chainid', '1');
    url.searchParams.set('module', 'account');
    url.searchParams.set('action', 'txlist');
    url.searchParams.set('address', address);
    url.searchParams.set('startblock', '0');
    url.searchParams.set('endblock', '99999999');
    url.searchParams.set('page', '1');
    url.searchParams.set('offset', String(config.MAX_TRANSACTIONS));
    url.searchParams.set('sort', 'desc');
    url.searchParams.set('apikey', config.ETHERSCAN_API_KEY);

    const payload = await requestJson(url);
    const message = String(payload?.message || '').toLowerCase();
    const result = payload?.result;

    if (payload?.status === '0' && message.includes('no transactions')) {
      return { address, network, transactions: [], synthetic: false, mode: 'LIVE' };
    }

    if (payload?.status !== '1' || !Array.isArray(result)) {
      throw createProviderError('BLOCKCHAIN_API_ERROR', 'Ethereum provider returned an invalid transaction response.', 502);
    }

    return {
      address,
      network: 'ethereum',
      transactions: result.map(normalizeTransaction),
      synthetic: false,
      mode: 'LIVE',
    };
  }

  async getTransaction(txHash, network = 'ethereum') {
    assertApiKey();
    if (!txHash || typeof txHash !== 'string') {
      throw createProviderError('INVALID_ADDRESS', 'The transaction hash is invalid.', 422);
    }

    const url = new URL(this.apiBaseUrl);
    url.searchParams.set('chainid', '1');
    url.searchParams.set('module', 'proxy');
    url.searchParams.set('action', 'eth_getTransactionByHash');
    url.searchParams.set('txhash', txHash);
    url.searchParams.set('apikey', config.ETHERSCAN_API_KEY);

    const payload = await requestJson(url);
    if (!payload?.result) {
      throw createProviderError('BLOCKCHAIN_API_ERROR', 'Ethereum transaction was not found.', 404);
    }

    return normalizeTransaction(payload.result);
  }

  async getWalletInfo(address, network = 'ethereum') {
    assertAddress(address);
    assertApiKey();
    const url = new URL(this.apiBaseUrl);
    url.searchParams.set('chainid', '1');
    url.searchParams.set('module', 'account');
    url.searchParams.set('action', 'balance');
    url.searchParams.set('address', address);
    url.searchParams.set('tag', 'latest');
    url.searchParams.set('apikey', config.ETHERSCAN_API_KEY);

    const payload = await requestJson(url);
    if (payload?.status !== '1') {
      throw createProviderError('BLOCKCHAIN_API_ERROR', 'Ethereum provider returned an invalid balance response.', 502);
    }

    return {
      address,
      network,
      balance: `${weiToNumber(payload.result)} ETH`,
      transaction_count: null,
      synthetic: false,
      mode: 'LIVE',
    };
  }
}

export default new EthereumProvider();
