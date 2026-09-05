import { isAddress } from 'ethers';

function isBech32BitcoinAddress(value) {
  if (!/^(bc1|tb1|bcrt1)[ac-hj-np-z02-9]{11,71}$/i.test(value)) return false;
  return true;
}

function isLegacyOrP2SHBitcoinAddress(value) {
  if (!/^[13mn][1-9A-HJ-NP-Za-km-z]{25,34}$/.test(value)) return false;
  return true;
}

export function validateBitcoinAddress(address) {
  if (!address || typeof address !== 'string') return false;
  const trimmed = address.trim();
  if (!trimmed) return false;

  return isBech32BitcoinAddress(trimmed) || isLegacyOrP2SHBitcoinAddress(trimmed);
}

export function validateEthereumAddress(address) {
  if (!address || typeof address !== 'string') return false;
  const trimmed = address.trim();
  if (!trimmed) return false;

  return isAddress(trimmed);
}

export function validateWallet(network, address) {
  const normalized = String(network || '').trim().toLowerCase();
  if (!normalized || !address) {
    return {
      valid: false,
      code: 'INVALID_WALLET_ADDRESS',
      message: 'The provided wallet address is invalid for the selected network.',
    };
  }

  let valid = false;

  if (normalized === 'bitcoin') {
    valid = validateBitcoinAddress(address);
  } else if (normalized === 'ethereum') {
    valid = validateEthereumAddress(address);
  }

  if (!valid) {
    return {
      valid: false,
      code: 'INVALID_WALLET_ADDRESS',
      message: 'The provided wallet address is invalid for the selected network.',
    };
  }

  return { valid: true };
}
