/**
 * Formatting + block-explorer helpers.
 * URLs are derived ONLY from known data (address / transaction hash + network).
 * Never invents identifiers — callers pass empty string when data is missing.
 */

export const shortAddress = (address?: string | null, head = 6, tail = 4): string => {
  const value = String(address || '');
  if (!value) return 'N/A';
  if (value.length <= head + tail + 3) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
};

export const formatValue = (value?: number | string | null, asset?: string | null): string => {
  const num = Number(value);
  if (value === null || value === undefined || value === '' || Number.isNaN(num)) return 'N/A';
  const abs = Math.abs(num);
  const decimals = abs === 0 ? 0 : abs < 0.0001 ? 8 : abs < 0.01 ? 6 : abs < 1 ? 4 : 4;
  const formatted = num.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
  return asset ? `${formatted} ${asset}` : formatted;
};

export const formatTimestamp = (timestamp?: string | number | null): string => {
  if (timestamp === null || timestamp === undefined || timestamp === '') return 'N/A';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return String(timestamp);
  return date.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
};

export const normalizeAddressKey = (address?: string | null): string =>
  String(address || '').trim().toLowerCase();

const EXPLORERS: Record<string, { address: (a: string) => string; tx: (h: string) => string }> = {
  bitcoin: {
    address: (a) => `https://mempool.space/address/${a}`,
    tx: (h) => `https://mempool.space/tx/${h}`,
  },
  ethereum: {
    address: (a) => `https://etherscan.io/address/${a}`,
    tx: (h) => `https://etherscan.io/tx/${h}`,
  },
};

export const getExplorerAddressUrl = (
  address?: string | null,
  network?: string | null
): string | null => {
  const value = String(address || '').trim();
  const net = String(network || '').trim().toLowerCase();
  if (!value || !EXPLORERS[net]) return null;
  return EXPLORERS[net].address(value);
};

export const getExplorerTxUrl = (
  hash?: string | null,
  network?: string | null
): string | null => {
  const value = String(hash || '').trim();
  const net = String(network || '').trim().toLowerCase();
  if (!value || !EXPLORERS[net]) return null;
  return EXPLORERS[net].tx(value);
};

export const assetForNetwork = (network?: string | null): string => {
  const net = String(network || '').trim().toLowerCase();
  if (net === 'ethereum') return 'ETH';
  if (net === 'bitcoin') return 'BTC';
  return 'N/A';
};