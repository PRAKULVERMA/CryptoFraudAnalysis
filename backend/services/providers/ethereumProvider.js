import config from '../../config/index.js';
import { validateEthereumAddress } from '../blockchain/validator.js';
import { createProviderError, PROVIDER_ERROR_CODES } from './providerErrors.js';
import { createProviderMetrics, requestProviderJson } from './providerHttp.js';

const WEI_PER_ETH = 1000000000000000000n;
const PROVIDER_NAME = 'etherscan';
const NETWORK_NAME = 'ethereum';
const ETHEREUM_MAINNET_CHAIN_ID = '1';
const MAX_PAGES_PER_WALLET = 10;

function assertApiKey() {
  if (!config.ETHERSCAN_API_KEY || config.ETHERSCAN_API_KEY === 'your_key_here' || config.ETHERSCAN_API_KEY === 'your_etherscan_api_key') {
    throw createProviderError(
      PROVIDER_ERROR_CODES.PROVIDER_AUTH_ERROR,
      'Ethereum provider credentials are not configured.',
      503,
      null,
      { provider: PROVIDER_NAME, network: NETWORK_NAME, retryable: false },
    );
  }
}

function assertAddress(address) {
  if (!validateEthereumAddress(address)) {
    throw createProviderError(
      PROVIDER_ERROR_CODES.INVALID_ADDRESS,
      'The provided Ethereum address is invalid.',
      422,
      null,
      { provider: PROVIDER_NAME, network: NETWORK_NAME, retryable: false },
    );
  }
}

function buildEtherscanUrl(params) {
  const url = new URL(config.ETHERSCAN_API_URL);
  url.searchParams.set('chainid', ETHEREUM_MAINNET_CHAIN_ID);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }
  url.searchParams.set('apikey', config.ETHERSCAN_API_KEY);
  return url;
}

function assertEtherscanPayload(payload) {
  const message = String(payload?.message || '').toLowerCase();
  const result = String(payload?.result || '').toLowerCase();

  if (message.includes('no transactions') || result.includes('no transactions found')) {
    return { empty: true };
  }

  if (payload?.status !== '1') {
    return {
      empty: false,
      error: createProviderError(
        PROVIDER_ERROR_CODES.BLOCKCHAIN_API_ERROR,
        `Ethereum provider returned an unusable response: ${String(payload?.message || payload?.result || 'unknown').slice(0, 160)}`,
        502,
        null,
        { provider: PROVIDER_NAME, network: NETWORK_NAME, retryable: false },
      ),
    };
  }

  return { empty: false };
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


function normalizeTransaction(transaction, walletAddress) {
  const hash = transaction.hash || transaction.transactionHash || transaction.blockHash || '';
  const timestamp = transaction.timeStamp
    ? new Date(Number(transaction.timeStamp) * 1000).toISOString()
    : null;
  const blockNumber = Number(transaction.blockNumber || 0);
  const value = weiToNumber(transaction.value);
  const from = transaction.from || '';
  const to = transaction.to || '';
  const direction = getTransactionDirection(from, to, walletAddress);
  const status = transaction.txreceipt_status === '1' || transaction.isError === '0' || !transaction.isError ? 'confirmed' : 'failed';
  const gasUsed = transaction.gasUsed ? Number(transaction.gasUsed) : null;
  const gasPrice = transaction.gasPrice ? weiToNumber(transaction.gasPrice) : null;
  const fee = gasUsed !== null && gasPrice !== null ? gasUsed * gasPrice : null;

  return {
    transactionId: hash,
    from,
    to,
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
    direction,
    status,
    fee,
  };
}

function getTransactionDirection(from, to, walletAddress) {
  const walletKey = String(walletAddress || '').trim().toLowerCase();
  const fromKey = String(from || '').trim().toLowerCase();
  const toKey = String(to || '').trim().toLowerCase();

  if (!walletKey) return 'unknown';
  if (fromKey === walletKey && toKey === walletKey) return 'self-transfer';
  if (fromKey === walletKey) return 'outgoing';
  if (toKey === walletKey) return 'incoming';
  return 'unknown';
}

class EthereumProvider {
  get apiBaseUrl() {
    return config.ETHERSCAN_API_URL;
  }

  async getWalletTransactions(address, network = 'ethereum', context = {}) {
    assertAddress(address);
    assertApiKey();

    const metrics = context.metrics || createProviderMetrics();
    const perWalletLimit = Math.max(1, Number(config.MAX_TRANSACTIONS_PER_WALLET) || 50);
    const pageSize = Math.min(perWalletLimit, 100);
    const allTransactions = [];
    let page = 1;
    let pagesProcessed = 0;
    let truncated = false;

    while (allTransactions.length < perWalletLimit && pagesProcessed < MAX_PAGES_PER_WALLET) {
      pagesProcessed += 1;

      const url = buildEtherscanUrl({
        module: 'account',
        action: 'txlist',
        address,
        startblock: 0,
        endblock: 99999999,
        page,
        offset: pageSize,
        sort: 'desc',
      });

      const payload = await requestProviderJson(url, { provider: PROVIDER_NAME, network: NETWORK_NAME, metrics });
      const verdict = assertEtherscanPayload(payload);

      if (verdict.error) throw verdict.error;
      if (verdict.empty) break;

      const result = payload.result;
      if (!Array.isArray(result) || result.length === 0) break;

      allTransactions.push(...result.map((tx) => normalizeTransaction(tx, address)));

      if (result.length < pageSize) break;

      page += 1;
    }

    if (allTransactions.length >= perWalletLimit) truncated = true;

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
      network: 'ethereum',
      transactions,
      provider_tx_count: allTransactions.length,
      pagination: { pages: pagesProcessed, truncated },
      diagnostics: { ...metrics, provider: PROVIDER_NAME, network: NETWORK_NAME },
      synthetic: false,
      mode: 'LIVE',
    };
  }

  async getTransaction(txHash, network = 'ethereum', context = {}) {
    assertApiKey();
    if (!txHash || typeof txHash !== 'string') {
      throw createProviderError(
        PROVIDER_ERROR_CODES.INVALID_ADDRESS,
        'The transaction hash is invalid.',
        422,
        null,
        { provider: PROVIDER_NAME, network: NETWORK_NAME, retryable: false },
      );
    }

    const url = buildEtherscanUrl({
      module: 'proxy',
      action: 'eth_getTransactionByHash',
      txhash: txHash,
    });

    const payload = await requestProviderJson(url, {
      provider: PROVIDER_NAME,
      network: NETWORK_NAME,
      metrics: context.metrics,
    });

    if (!payload?.result) {
      throw createProviderError(
        PROVIDER_ERROR_CODES.BLOCKCHAIN_API_ERROR,
        'Ethereum transaction was not found.',
        404,
        null,
        { provider: PROVIDER_NAME, network: NETWORK_NAME, retryable: false },
      );
    }

    return normalizeTransaction(payload.result, null);
  }

  async getWalletInfo(address, network = 'ethereum', context = {}) {
    assertAddress(address);
    assertApiKey();

    const url = buildEtherscanUrl({
      module: 'account',
      action: 'balance',
      address,
      tag: 'latest',
    });

    const payload = await requestProviderJson(url, {
      provider: PROVIDER_NAME,
      network: NETWORK_NAME,
      metrics: context.metrics,
    });

    if (payload?.status !== '1') {
      throw createProviderError(
        PROVIDER_ERROR_CODES.BLOCKCHAIN_API_ERROR,
        'Ethereum provider returned an invalid balance response.',
        502,
        null,
        { provider: PROVIDER_NAME, network: NETWORK_NAME, retryable: false },
      );
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
