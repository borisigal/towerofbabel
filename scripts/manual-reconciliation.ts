/**
 * Manual reconciliation script
 * Run: npx tsx scripts/manual-reconciliation.ts
 */
import { runDailyReconciliation } from '../lib/lemonsqueezy/reconciliation';

async function main() {
  console.log('Running manual payment reconciliation...');

  const result = await runDailyReconciliation();

  console.log('\n=== RECONCILIATION RESULTS ===\n');
  console.log(`Timestamp: ${result.timestamp}`);
  console.log(`Subscription mismatches: ${result.subscriptionsMismatched}`);
  console.log(`Usage mismatches: ${result.usageMismatched}`);
  console.log(`Orphaned subscriptions: ${result.orphanedSubscriptions}`);

  if (result.subscriptionsMismatched > 0) {
    console.log('\n--- Subscription Issues ---');
    result.details.subscriptionIssues.forEach(issue => {
      console.log(`User ${issue.userId}: ${issue.issueType}`);
      console.log(`  DB: ${JSON.stringify(issue.dbValue)}`);
      console.log(`  Lemon Squeezy: ${JSON.stringify(issue.lemonSqueezyValue)}`);
    });
  }

  if (result.usageMismatched > 0) {
    console.log('\n--- Usage Issues ---');
    result.details.usageIssues.forEach(issue => {
      console.log(`User ${issue.userId}:`);
      console.log(`  DB interpretations: ${issue.dbCount}`);
      console.log(`  Lemon Squeezy usage: ${issue.lemonSqueezyCount}`);
      console.log(`  Difference: ${issue.difference} (${issue.difference > 0 ? 'under-reported' : 'over-reported'})`);
    });
  }

  console.log('\n=== RECONCILIATION COMPLETE ===\n');
  process.exit(0);
}

main().catch(error => {
  console.error('Reconciliation failed:', error);
  process.exit(1);
});
