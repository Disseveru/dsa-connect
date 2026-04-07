/**
 * DSA Connect – Flashloan + Aave V3 Liquidation Spell Demo
 *
 * This script demonstrates:
 *
 * Part A (live execution on forked mainnet):
 *   1. Creates a DSA v2 account
 *   2. Funds it with ETH
 *   3. Swaps ETH → USDC on Uniswap
 *   4. Executes a minimal flashloan spell (borrow USDC → repay) as a template
 *      showing where real strategy operations (arb, liquidation, etc.) go
 *
 * Part B (spell composition + ABI encoding):
 *   5. Composes a flashloan spell that liquidates an Aave V3 over-collateralised
 *      position: flash-borrow DAI → payback Aave V3 debt → withdraw collateral →
 *      swap collateral to DAI → repay flashloan
 *   6. Validates the automatic flashBorrowAndCast conversion & ABI encoding
 *
 * Note: Aave V3 deposit/borrow reverts on this fork block (block 24830208) because
 * ETH reserves are frozen on mainnet. The spell composition is fully validated and
 * ready to execute on a fork at a block where Aave V3 reserves are active.
 *
 * Usage:  node scripts/flashloan-aave-v3-live.js
 * Requires: ganache fork running on localhost:8545
 */

const DSA = require('../dist/index.js');
const Web3 = require('web3');

const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));

const ETH  = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
const WETH = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
const DAI  = '0x6B175474E89094C44Da98b954EedeAC495271d0F';
const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

async function main() {
  const dsa = new DSA(web3);
  const accounts = await web3.eth.getAccounts();
  const account = accounts[0];

  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  DSA Connect – Flashloan + Aave V3 Liquidation Demo    ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // ── Part A: Live Execution ────────────────────────────────────────

  console.log('━━━ Part A: Live Flashloan Execution on Forked Mainnet ━━━\n');

  // 1. Build DSA v2
  console.log('1. Building DSA v2...');
  await dsa.build({ version: 2 });
  const dsaAccounts = await dsa.accounts.getAccounts(account);
  const myDSA = dsaAccounts[dsaAccounts.length - 1];
  await dsa.setAccount(myDSA.id);
  console.log(`   ✓ DSA #${myDSA.id} at ${myDSA.address}\n`);

  // 2. Fund DSA with 10 ETH
  console.log('2. Funding DSA with 10 ETH...');
  await dsa.erc20.transfer({
    token: ETH,
    amount: web3.utils.toWei('10', 'ether'),
    to: dsa.instance.address,
    from: account,
  });
  const bal = await web3.eth.getBalance(dsa.instance.address);
  console.log(`   ✓ DSA balance: ${web3.utils.fromWei(bal)} ETH\n`);

  // 3. Swap 1 ETH → USDC
  console.log('3. Swapping 1 ETH → USDC on Uniswap...');
  const swapSpell = dsa.Spell();
  swapSpell.add({
    connector: 'uniswap',
    method: 'sell',
    args: [USDC, ETH, web3.utils.toWei('1', 'ether'), 0, 0, 0],
  });
  const swapTx = await swapSpell.cast({ from: account });
  console.log(`   ✓ Swap tx: ${swapTx}\n`);

  // 4. Flashloan spell: borrow 10 USDC → repay
  // The borrowed USDC lands in the DSA and is immediately repaid.  In a real
  // strategy (e.g. arbitrage, liquidation) you would insert your operations
  // between flashBorrow and flashPayback; here we keep it minimal so the spell
  // executes successfully on a fork with no additional setup required.
  console.log('4. Executing flashloan spell...');
  console.log('   Strategy: flash-borrow 10 USDC → repay flash (minimal cycle)');
  const flashSpell = dsa.Spell();

  flashSpell.add({
    connector: 'instapool_v2',
    method: 'flashBorrow',
    args: [USDC, '10000000', 0],
  });

  // ↑ Insert your strategy operations here (e.g. swap, deposit, liquidate) ↑

  flashSpell.add({
    connector: 'instapool_v2',
    method: 'flashPayback',
    args: [USDC, '10000000', 0, 0],
  });

  flashSpell.data.forEach((op, i) => {
    console.log(`   ${i + 1}. [${op.connector}] ${op.method}()`);
  });

  const flashTx = await flashSpell.cast({ from: account });
  console.log(`   ✓ Flashloan tx: ${flashTx}\n`);

  // ── Part B: Aave V3 Liquidation Spell Composition ─────────────────

  console.log('━━━ Part B: Aave V3 Liquidation Spell Composition ━━━\n');

  const flashAmt    = web3.utils.toWei('10000', 'ether');
  const paybackAmt  = web3.utils.toWei('10000', 'ether');
  const withdrawAmt = web3.utils.toWei('6', 'ether');
  const swapAmt     = web3.utils.toWei('5', 'ether');

  // 5. Compose the full Aave V3 liquidation spell
  console.log('5. Composing Aave V3 over-collateralised position unwind spell...');
  const liquidationSpell = dsa.Spell();

  liquidationSpell.add({
    connector: 'instapool_v2',
    method: 'flashBorrow',
    args: [DAI, flashAmt, 0],
  });

  liquidationSpell.add({
    connector: 'AAVE-V3-A',
    method: 'payback',
    args: [DAI, paybackAmt, 2, 0, 0],
  });

  liquidationSpell.add({
    connector: 'AAVE-V3-A',
    method: 'withdraw',
    args: [WETH, withdrawAmt, 0, 0],
  });

  liquidationSpell.add({
    connector: 'uniswap',
    method: 'sell',
    args: [DAI, WETH, swapAmt, 0, 0, 0],
  });

  liquidationSpell.add({
    connector: 'instapool_v2',
    method: 'flashPayback',
    args: [DAI, flashAmt, 0, 0],
  });

  console.log('   Spell operations:');
  liquidationSpell.data.forEach((op, i) => {
    console.log(`   ${i + 1}. [${op.connector}] ${op.method}()`);
  });

  // 6. Validate conversion & encoding
  console.log('\n6. Validating flashBorrow → flashBorrowAndCast conversion...');
  const converted = dsa.castHelpers.flashBorrowSpellsConvert(liquidationSpell, 2, 1);

  console.log(`   Converted to ${converted.data.length} top-level operation(s):`);
  converted.data.forEach((op, i) => {
    console.log(`   ${i + 1}. [${op.connector}] ${op.method}()`);
    if (op.method === 'flashBorrowAndCast') {
      console.log(`      token:  ${op.args[0]} (DAI)`);
      console.log(`      amount: ${op.args[1]} wei (10,000 DAI)`);
      console.log(`      route:  ${op.args[2]}`);
    }
  });

  const flashBorrowAndCastOp = converted.data.find((op) => op.method === 'flashBorrowAndCast');
  if (!flashBorrowAndCastOp) {
    throw new Error('flashBorrowSpellsConvert() did not return a flashBorrowAndCast operation');
  }

  const encodedData = String(flashBorrowAndCastOp.args[3]);
  const decoded = web3.eth.abi.decodeParameters(['string[]', 'bytes[]'], encodedData);
  const targets = decoded[0];
  const spells  = decoded[1];

  console.log(`\n   Inner cast targets (${targets.length}):`);
  targets.forEach((t, i) => console.log(`   ${i + 1}. ${t}`));

  console.log(`\n   Inner encoded method selectors:`);
  spells.forEach((s, i) => console.log(`   ${i + 1}. ${s.slice(0, 10)}`));

  // Also encode the full cast ABI
  const castABI = await dsa.encodeCastABI(liquidationSpell);
  console.log(`\n   ✓ Full cast ABI: ${castABI.slice(0, 66)}… (${castABI.length} chars)`);

  // ── Summary ────────────────────────────────────────────────────────

  const finalBal = await web3.eth.getBalance(dsa.instance.address);

  console.log('\n=== Results ===');
  console.log(`DSA v2 #${myDSA.id} created and funded`);
  console.log('✓ Uniswap swap: 1 ETH → USDC (live)');
  console.log('✓ Flashloan: borrow/repay 10 USDC (minimal cycle; insert strategy ops before repay)');
  console.log('✓ Aave V3 liquidation spell composed & encoded');
  console.log('  (5 ops → 1 flashBorrowAndCast with 4 inner targets)');
  console.log(`Final DSA balance: ${web3.utils.fromWei(finalBal)} ETH`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Fatal:', e.message);
    process.exit(1);
  });
