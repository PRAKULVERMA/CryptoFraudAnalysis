import 'dotenv/config';
import { getMongooseConnection, isMongoDBConfigured, getMongoDBStatus } from '../config/mongodb.js';
import InvestigationRepository from '../repositories/investigationRepository.js';

async function runTests() {
  console.log('=== MongoDB Investigation Persistence Tests ===\n');

  if (!isMongoDBConfigured()) {
    console.error('SKIP: MONGODB_URI is not configured. Set it in .env to run tests.');
    process.exit(0);
  }

  const status = await getMongoDBStatus();
  if (status !== 'connected') {
    console.error(`SKIP: MongoDB status is "${status}". Ensure MongoDB is reachable.`);
    process.exit(0);
  }

  const repo = InvestigationRepository;
  const testId = `test-inv-${Date.now()}`;
  const testUserId = `test-user-${Date.now()}`;

  try {
    // Test 1 — Create
    console.log('Test 1: Create investigation');
    const created = await repo.createInvestigation({
      investigation_id: testId,
      user_id: testUserId,
      wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
      network: 'ethereum',
      status: 'PENDING',
      progress: 0,
      current_step: 'VALIDATING WALLET',
      synthetic: false,
      mode: 'DEMO',
    });
    console.log(`  Created: ${created.investigation_id}`);
    console.log(`  Pass: ${created.investigation_id === testId ? 'YES' : 'NO'}`);

    // Test 2 — Get
    console.log('\nTest 2: Get investigation by ID');
    const fetched = await repo.getInvestigation(testId);
    console.log(`  Fetched: ${fetched ? fetched.investigation_id : 'null'}`);
    console.log(`  Pass: ${fetched && fetched.investigation_id === testId ? 'YES' : 'NO'}`);

    // Test 3 — Update
    console.log('\nTest 3: Update investigation');
    const updated = await repo.updateInvestigation(testId, {
      status: 'COMPLETED',
      progress: 100,
      current_step: 'INVESTIGATION COMPLETED',
      completed_at: new Date(),
      results: { risk_score: 85 },
    });
    console.log(`  Updated status: ${updated ? updated.status : 'null'}`);
    console.log(`  Pass: ${updated && updated.status === 'COMPLETED' && updated.progress === 100 ? 'YES' : 'NO'}`);

    // Test 4 — List
    console.log('\nTest 4: List investigations');
    const all = await repo.listInvestigations();
    const byUser = await repo.listInvestigations({ userId: testUserId });
    console.log(`  Total investigations: ${all.length}`);
    console.log(`  For user ${testUserId}: ${byUser.length}`);
    console.log(`  Pass: ${all.length >= 1 && byUser.length >= 1 ? 'YES' : 'NO'}`);

    // Test 5 — Delete
    console.log('\nTest 5: Delete investigation');
    const deleted = await repo.deleteInvestigation(testId);
    const afterDelete = await repo.getInvestigation(testId);
    console.log(`  Deleted: ${deleted}`);
    console.log(`  After delete: ${afterDelete}`);
    console.log(`  Pass: ${deleted && afterDelete === null ? 'YES' : 'NO'}`);

    // Test 6 — Ownership compatibility (user_id preserved)
    console.log('\nTest 6: Ownership compatibility');
    const owned = await repo.listInvestigations({ userId: testUserId });
    console.log(`  User-filtered count: ${owned.length}`);
    console.log(`  Pass: ${owned.length >= 1 ? 'YES' : 'NO'}`);

    // Cleanup
    await repo.deleteInvestigation(testId);

    console.log('\n=== All tests completed ===');
  } catch (error) {
    console.error('\nTEST FAILED:', error);
    process.exit(1);
  }
}

runTests();
