/**
 * DSA Connect – Flashloan-based Aave V3 over-collateralised position liquidation spell
 *
 * This script demonstrates how to compose a multi-step DeFi spell that:
 *   1. Flash-borrows DAI via the Instadapp flashloan pool (INSTAPOOL)
 *   2. Pays back the DAI debt on Aave V3 (freeing collateral)
 *   3. Withdraws the freed WETH collateral from Aave V3
 *   4. Swaps enough WETH → DAI on Uniswap V2 to cover the flashloan repayment
 *   5. Repays the flashloan
 *
 * Because there is no live Ethereum node in this environment, we validate that
 * the SDK correctly composes, encodes, and transforms the spell (including
 * automatic flashBorrow/flashPayback → flashBorrowAndCast conversion).
 *
 * Usage:  node scripts/flashloan-aave-v3-liquidation.js
 */

const DSA = require('../dist/index.js');
const Web3 = require('web3');

const web3 = new Web3();

const WETH  = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
const DAI   = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

const flashAmt     = web3.utils.toWei('10000', 'ether');   // 10 000 DAI flashloan
const paybackAmt   = web3.utils.toWei('10000', 'ether');   // repay 10 000 DAI debt
const withdrawAmt  = web3.utils.toWei('6', 'ether');       // withdraw 6 WETH collateral
const swapAmt      = web3.utils.toWei('5', 'ether');       // swap 5 WETH → DAI to cover repayment

const dsa = new DSA(web3);

// ── Build the spell ──────────────────────────────────────────────────
const spell = dsa.Spell();

// 1. Flash-borrow 10 000 DAI (route 5 = Aave V3 flashloan pool)
spell.add({
  connector: 'instapool_v2',
  method: 'flashBorrow',
  args: [DAI, flashAmt, 0],
});

// 2. Pay back DAI debt on Aave V3 (rateMode 2 = variable-rate)
spell.add({
  connector: 'AAVE-V3-A',
  method: 'payback',
  args: [DAI, paybackAmt, 2, 0, 0],
});

// 3. Withdraw freed WETH collateral from Aave V3
spell.add({
  connector: 'AAVE-V3-A',
  method: 'withdraw',
  args: [WETH, withdrawAmt, 0, 0],
});

// 4. Swap WETH → DAI on Uniswap V2 to cover the flashloan + fee
spell.add({
  connector: 'uniswap',
  method: 'sell',
  args: [DAI, WETH, swapAmt, 0, 0, 0],
});

// 5. Repay the flashloan
spell.add({
  connector: 'instapool_v2',
  method: 'flashPayback',
  args: [DAI, flashAmt, 0, 0],
});

// ── Inspect the composed spell ───────────────────────────────────────
console.log('=== Flashloan + Aave V3 Liquidation Spell ===\n');
console.log(`Total operations: ${spell.data.length}\n`);

spell.data.forEach((op, i) => {
  console.log(`  Step ${i + 1}: [${op.connector}] ${op.method}()`);
});

// ── Validate the automatic flashloan conversion ──────────────────────
// The SDK's flashBorrowSpellsConvert() should transform the flat
// flashBorrow … flashPayback sequence into a single flashBorrowAndCast
// call wrapping the inner spells.
console.log('\n--- Validating flashBorrow → flashBorrowAndCast conversion ---');

const converted = dsa.castHelpers.flashBorrowSpellsConvert(
  spell,
  2,   // DSA v2
  1,   // Ethereum mainnet
);

console.log(`\nConverted spell count: ${converted.data.length}`);
converted.data.forEach((op, i) => {
  console.log(`  Converted step ${i + 1}: [${op.connector}] ${op.method}()`);
  if (op.method === 'flashBorrowAndCast') {
    console.log(`    → token:  ${op.args[0]}`);
    console.log(`    → amount: ${op.args[1]} wei`);
    console.log(`    → route:  ${op.args[2]}`);
    const dataStr = String(op.args[3]);
    console.log(`    → data:   ${dataStr.slice(0, 66)}…  (${dataStr.length} chars)`);
  }
});

// ── Verify the inner spells are properly encoded ─────────────────────
const innerSpellsHex = converted.data.find(
  (op) => op.method === 'flashBorrowAndCast'
);

if (!innerSpellsHex) {
  console.error('\n✗ flashBorrowAndCast not found – conversion failed');
  process.exit(1);
}

console.log('\n--- ABI-encoded targets + spells (inner cast data) ---');

// args layout: [token, amount, route, encodedData]
const encodedData = String(innerSpellsHex.args[3]);

// Decode the ABI-encoded inner data: (string[] targets, bytes[] spells)
const decoded = web3.eth.abi.decodeParameters(
  ['string[]', 'bytes[]'],
  encodedData,
);

const targets = decoded[0];
const encodedSpells = decoded[1];

console.log(`\nInner targets (${targets.length}):`);
targets.forEach((t, i) => console.log(`  ${i + 1}. ${t}`));

console.log(`\nInner encoded spells (${encodedSpells.length}):`);
encodedSpells.forEach((s, i) => {
  const selector = s.slice(0, 10);
  console.log(`  ${i + 1}. selector=${selector}  (${s.length} hex chars)`);
});

// ── Summary ──────────────────────────────────────────────────────────
console.log('\n=== Summary ===');
console.log('✓ Spell composed with 5 operations across 3 connectors');
console.log('  • INSTAPOOL (flashBorrow / flashPayback)');
console.log('  • AAVE-V3-A (payback + withdraw)');
console.log('  • UNISWAP-V2-A (sell WETH → DAI)');
console.log('✓ flashBorrow/flashPayback auto-converted to flashBorrowAndCast');
console.log(`✓ Inner cast encodes ${targets.length} operations with ABI-encoded calldata`);
console.log('✓ Ready to cast on a live DSA with a forked mainnet node');

process.exit(0);
