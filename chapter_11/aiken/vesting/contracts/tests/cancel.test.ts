import { promises as fs } from 'fs';
import path from 'path';
import { 
  addAssets,
  Assets,
  Emulator,
  Lucid,
  SpendingValidator 
} from "lucid-cardano"; 
import { assert, 
  describe, 
  expect, 
  test 
} from 'vitest'

import { protocolParams } from '../config/protocolParams';
import cancel from '../off-chain/cancel';
import lock from '../off-chain/lock';
import { ReturnType } from '../off-chain/types';
import { 
  generateAccount,
  generateReport 
} from './utils';


// Validator script
const contractDirectory = path.join(process.cwd(), 'contracts');
const blueprintFile = await fs.readFile(contractDirectory + '/plutus.json', 'utf8');

// Read the validator script from the filesystem
async function readValidator(): Promise<SpendingValidator> {
  const validator = JSON.parse(blueprintFile.toString()).validators[0];
  return {
    type: 'PlutusV2',
    script: validator.compiledCode,
  };
}

const ACCOUNT_0 = await generateAccount({ lovelace: 30000000000n });
const ACCOUNT_1 = await generateAccount({ lovelace: 60000000000n });

let exCosts = [] as ReturnType[]

/**
* Cancel Test Cases
*/
describe('Cancel Test Cases', async () => {

  const emulator = new Emulator([ACCOUNT_0, ACCOUNT_1], protocolParams);
  
  // Create an Instance of NetworkEmulator
  const lucid = await Lucid.new(emulator, 'Custom');

  // Read in the validator script and determine the script address
  const validator = await readValidator();
  const contractAddress = lucid.utils.validatorToAddress(validator);
  // Amount of lovelace to lock
  const lockAmount = BigInt(2_000_000);

  test('Lock 2 Ada to script address', async () => {

    // Pre-condition
    let lockedAssetStart = { lovelace: 0n } as Assets;
    const contractUtxosStart = await lucid.utxosAt(contractAddress);
    const contractAssetsStart = contractUtxosStart.reduce((acc, utxo) => {
                  return addAssets(acc, utxo.assets)}, { lovelace: 0n } as Assets);

    assert.deepEqual(contractAssetsStart, lockedAssetStart);

    // Connect to wallet 0
    lucid.selectWalletFromSeed(ACCOUNT_0.seedPhrase);
    const walletUtxoStart = await lucid.wallet.getUtxos();
    const walletAssetsStart = walletUtxoStart.reduce((acc, utxo) => {
      return addAssets(acc, utxo.assets)}, { lovelace: 0n } as Assets);

    const result = await lock({
      lovelace: lockAmount,
      lucid: lucid,
      validator: validator
    });
    expect(result.status == 200).toBeTruthy();

    exCosts.push(result)
    emulator.awaitBlock(10);

    // Post conditions
    let lockedAssetEnd = { lovelace: lockAmount } as Assets;
    const contractUtxosEnd = await lucid.utxosAt(contractAddress);
    const contractAssetsEnd = contractUtxosEnd.reduce((acc, utxo) =>
      addAssets(acc, utxo.assets), { lovelace: 0n } as Assets
    );
 
    // 2 Ada is locked at script address
    assert.deepEqual(contractAssetsEnd, lockedAssetEnd);

    const finalAmount = walletAssetsStart.lovelace - (lockAmount + BigInt(exCosts[0].fee!));
    let userAssetEnd = { lovelace: finalAmount } as Assets;
    const walletUtxoEnd = await lucid.wallet.getUtxos();
    const walletAssetsEnd = walletUtxoEnd.reduce((acc, utxo) =>
      addAssets(acc, utxo.assets), { lovelace: 0n } as Assets
    );

    // User wallet paid for 2 Ada plus fees
    assert.deepEqual(walletAssetsEnd , userAssetEnd);

  })

  test('Cancel with incorrect pkh', async () => {

    // Pre-condition
    let lockedAssetStart = { lovelace: lockAmount } as Assets;
    const contractUtxosStart = await lucid.utxosAt(contractAddress);
    const contractAssetsStart = contractUtxosStart.reduce((acc, utxo) =>
      addAssets(acc, utxo.assets), { lovelace: 0n } as Assets
    );

    assert.deepEqual(contractAssetsStart, lockedAssetStart);

    // Connect to wallet 1
    lucid.selectWalletFromSeed(ACCOUNT_1.seedPhrase);

    const result = await cancel({
      lucid: lucid,
      validator: validator
    });
    expect(result.status == 200).toBeFalsy();
    emulator.awaitBlock(10);

     // Post condition
    let lockedAssetEnd = { lovelace: lockAmount } as Assets;
    const contractUtxosEnd = await lucid.utxosAt(contractAddress);
    const contractAssetsEnd = contractUtxosEnd.reduce((acc, utxo) =>
      addAssets(acc, utxo.assets), { lovelace: 0n } as Assets
    );

    assert.deepEqual(contractAssetsEnd, lockedAssetEnd);
  })

  test('Cancel with correct PKH', async () => {

    // Pre-condition
    let lockedAssetStart = { lovelace: lockAmount } as Assets;
    const contractUtxosStart = await lucid.utxosAt(contractAddress);
    const contractAssetsStart = contractUtxosStart.reduce((acc, utxo) =>
      addAssets(acc, utxo.assets), { lovelace: 0n } as Assets
    );

    assert.deepEqual(contractAssetsStart, lockedAssetStart);

    // Connect to wallet 0
    lucid.selectWalletFromSeed(ACCOUNT_0.seedPhrase);
    const walletUtxoStart = await lucid.wallet.getUtxos();
    const walletAssetsStart = walletUtxoStart.reduce((acc, utxo) =>
      addAssets(acc, utxo.assets), { lovelace: 0n } as Assets
    );

    const result = await cancel({
      lucid: lucid,
      validator: validator
    });
    expect(result.status == 200).toBeTruthy();
    exCosts.push(result);
    emulator.awaitBlock(10);

     // Post conditions
    let lockedAssetEnd = { lovelace: 0n } as Assets;
    const contractUtxosEnd = await lucid.utxosAt(contractAddress);
    const contractAssetsEnd = contractUtxosEnd.reduce((acc, utxo) =>
      addAssets(acc, utxo.assets), { lovelace: 0n } as Assets
    );

    // No Ada locked at the contracts
    assert.deepEqual(contractAssetsEnd, lockedAssetEnd);

    const finalAmount = lockAmount - BigInt(exCosts[1].fee!);
    let userAssetEnd = { lovelace: finalAmount } as Assets;
    const walletUtxoEnd = await lucid.wallet.getUtxos();
    const walletAssetsEnd = walletUtxoEnd.reduce((acc, utxo) =>
      addAssets(acc, utxo.assets), { lovelace: 0n } as Assets
    );

    // User wallet as 2 Ada less fees
    assert.deepEqual(walletAssetsEnd , addAssets(walletAssetsStart, userAssetEnd));

    //emulator.log();
    generateReport(exCosts);
  })
})






