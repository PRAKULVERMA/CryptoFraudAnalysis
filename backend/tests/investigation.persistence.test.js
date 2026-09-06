import 'dotenv/config';
import { getMongooseConnection, isMongoDBConfigured, getMongoDBStatus } from '../config/mongodb.js';
import InvestigationRepository from '../repositories/investigationRepository.js';
import investigationService from '../services/investigations/investigationService.js';
import investigationJobService from '../services/investigations/investigationJobService.js';

async function runTests() {
  console.log('=== Investigation Persistence & Job Tests ===\n');

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
    // Test 1 — Create with job fields
    console.log('Test 1: Create investigation');
    const created = await investigationService.createInvestigation({
      wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
      network: 'ethereum',
      user_id: testUserId,
    });
    const targetId = created.investigation_id;
    console.log(`  Created: ${targetId}`);
    console.log(`  Pass: ${targetId === created.investigation_id && created.status === 'queued' ? 'YES' : 'NO'}`);

    // Test 2 — Get by investigation_id
    console.log('\nTest 2: Get investigation by ID');
    const fetched = await investigationService.getInvestigation(targetId);
    console.log(`  Fetched: ${fetched ? fetched.investigation_id : 'null'}`);
    console.log(`  Pass: ${fetched && fetched.investigation_id === targetId && fetched.user_id === testUserId ? 'YES' : 'NO'}`);

    // Test 3 — Update progress and status
    console.log('\nTest 3: Update investigation progress/status');
    const updated = await investigationService.updateInvestigation(targetId, {
      status: 'running',
      progress: 45,
      current_step: 'TRACING FUNDS',
      started_at: new Date().toISOString(),
    });
    console.log(`  Updated status: ${updated ? updated.status : 'null'}`);
    console.log(`  Pass: ${updated && updated.status === 'running' && updated.progress === 45 ? 'YES' : 'NO'}`);

    // Test 4 — List and filter by user
    console.log('\nTest 4: List investigations');
    const all = await investigationService.listInvestigations();
    const byUser = await investigationService.listInvestigations(testUserId);
    console.log(`  Total investigations: ${all.length}`);
    console.log(`  For user ${testUserId}: ${byUser.length}`);
    console.log(`  Pass: ${all.length >= 1 && byUser.length >= 1 ? 'YES' : 'NO'}`);

    // Test 5 — Delete
    console.log('\nTest 5: Delete investigation');
    const deleted = await investigationService.deleteInvestigation(targetId);
    const afterDelete = await investigationService.getInvestigation(targetId);
    console.log(`  Deleted: ${deleted}`);
    console.log(`  After delete: ${afterDelete}`);
    console.log(`  Pass: ${deleted && afterDelete === null ? 'YES' : 'NO'}`);

    // Test 6 — Atomic claim
    console.log('\nTest 6: Atomic claim (queued -> running)');
    const claimId = `test-claim-${Date.now()}`;
    await investigationService.createInvestigation({
      wallet_address: '0xabcdef1234567890abcdef1234567890abcdef12',
      network: 'bitcoin',
      user_id: testUserId,
      investigation_id: claimId,
    });
    const claimed = await repo.claimInvestigation(claimId);
    console.log(`  Claimed status: ${claimed ? claimed.status : 'null'}`);
    console.log(`  Pass: ${claimed && claimed.status === 'running' ? 'YES' : 'NO'}`);
    await repo.deleteInvestigation(claimId);

    // Test 7 — Retry endpoint availability
    console.log('\nTest 7: Retry service availability');
    const retryId = `test-retry-${Date.now()}`;
    await investigationService.createInvestigation({
      wallet_address: '0xfeedfacecafebeefdeadbeefbadc0ffee0ddf00d',
      network: 'ethereum',
      user_id: testUserId,
      investigation_id: retryId,
    });
    await investigationService.updateInvestigation(retryId, {
      status: 'failed',
      failed_at: new Date().toISOString(),
      last_error: { code: 'TEST_FAIL', message: 'Simulated failure.' },
    });
    const retried = await investigationJobService.retryInvestigation(retryId);
    console.log(`  Retried status: ${retried ? retried.status : 'null'}`);
    console.log(`  Pass: ${retried && retried.status === 'queued' ? 'YES' : 'NO'}`);
    await repo.deleteInvestigation(retryId);

    console.log('\n=== All tests completed ===');
  } catch (error) {
    console.error('\nTEST FAILED:', error);
    process.exit(1);
  }
}

runTests();
