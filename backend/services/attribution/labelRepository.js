export const demoLabels = new Map([
  ['demo-wallet-1', 'DEMO Exchange Cluster'],
  ['demo-wallet-2', 'DEMO OTC Mixer'],
]);

export function findLabelForWallet(walletAddress) {
  return demoLabels.get(walletAddress) || null;
}
