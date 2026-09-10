import { analyzeWallet } from './services/investigation.js';

async function test() {
  try {
    console.log('Testing investigation service...');
    const result = await analyzeWallet('0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae', 'ethereum', 'test-investigation-123');
    console.log('SUCCESS');
    console.log('Risk score:', result.riskScore);
    console.log('Risk level:', result.riskLevel);
    console.log('Patterns:', result.patterns?.length || 0);
    console.log('Nodes:', result.nodes?.length || 0);
    console.log('Edges:', result.edges?.length || 0);
  } catch (error) {
    console.error('FAILED:', error.message);
    console.error(error.stack);
  }
}

test();
