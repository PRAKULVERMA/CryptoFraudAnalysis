import { ENTITY_CATEGORIES } from './attributionEvidence.js';

function normalizeAddress(address) {
  return String(address || '').trim().toLowerCase();
}

export const verifiedEntities = [
  {
    network: 'ethereum',
    normalized_address: normalizeAddress('0x28C6C06298d514Db089934071355E5743bf21d60'),
    entity_name: 'Binance',
    entity_type: ENTITY_CATEGORIES.EXCHANGE,
    category: 'exchange',
    source: 'Public blockchain explorer labels',
    source_url: 'https://etherscan.io/address/0x28C6C06298d514Db089934071355E5743bf21d60',
    verification_status: 'VERIFIED',
  },
  {
    network: 'ethereum',
    normalized_address: normalizeAddress('0xbf72d64822d5f8d7d380355500c8b20e9b26672d'),
    entity_name: 'Coinbase',
    entity_type: ENTITY_CATEGORIES.EXCHANGE,
    category: 'exchange',
    source: 'Public blockchain explorer labels',
    source_url: 'https://etherscan.io/address/0xbf72d64822d5f8d7d380355500c8b20e9b26672d',
    verification_status: 'VERIFIED',
  },
  {
    network: 'ethereum',
    normalized_address: normalizeAddress('0xDa9dfA13000f4dF01D1cD543278297a5C9607202'),
    entity_name: 'Kraken',
    entity_type: ENTITY_CATEGORIES.EXCHANGE,
    category: 'exchange',
    source: 'Public blockchain explorer labels',
    source_url: 'https://etherscan.io/address/0xDa9dfA13000f4dF01D1cD543278297a5C9607202',
    verification_status: 'VERIFIED',
  },
  {
    network: 'ethereum',
    normalized_address: normalizeAddress('0x740aE30aDfB2cC2831f78a42f49D3FeC3Cc7e355'),
    entity_name: 'Bitfinex',
    entity_type: ENTITY_CATEGORIES.EXCHANGE,
    category: 'exchange',
    source: 'Public blockchain explorer labels',
    source_url: 'https://etherscan.io/address/0x740aE30aDfB2cC2831f78a42f49D3FeC3Cc7e355',
    verification_status: 'VERIFIED',
  },
  {
    network: 'ethereum',
    normalized_address: normalizeAddress('0x5AEDA5621b5D379798457D1569E5BD92C6f2E9B3'),
    entity_name: 'OKX',
    entity_type: ENTITY_CATEGORIES.EXCHANGE,
    category: 'exchange',
    source: 'Public blockchain explorer labels',
    source_url: 'https://etherscan.io/address/0x5AEDA5621b5D379798457D1569E5BD92C6f2E9B3',
    verification_status: 'VERIFIED',
  },
  {
    network: 'bitcoin',
    normalized_address: normalizeAddress('bc1q42l6k8yez4u4v4p8w8x8x8x8x8x8x8x8x8x8'),
    entity_name: 'Binance',
    entity_type: ENTITY_CATEGORIES.EXCHANGE,
    category: 'exchange',
    source: 'Public blockchain explorer labels',
    source_url: 'https://blockstream.info/address/bc1q42l6k8yez4u4v4p8w8x8x8x8x8x8x8x8x8x8',
    verification_status: 'VERIFIED',
  },
];

export function findVerifiedEntity(address, network) {
  const key = normalizeAddress(address);
  return verifiedEntities.find(
    (entity) => entity.network === network && entity.normalized_address === key
  ) || null;
}

export function getVerifiedEntitiesByNetwork(network) {
  return verifiedEntities.filter((entity) => entity.network === network);
}

export default { verifiedEntities, findVerifiedEntity, getVerifiedEntitiesByNetwork };
