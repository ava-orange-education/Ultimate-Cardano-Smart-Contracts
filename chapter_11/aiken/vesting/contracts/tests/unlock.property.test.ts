import { promises as fs } from 'fs';
import path from 'path';
import fc from 'fast-check';

import { 
  addAssets,
  Assets,
  Emulator,
  Constr,
  Data,
  fromText,
  Lucid,
  SpendingValidator 
} from "lucid-cardano"; 
import { 
  assert,
  describe, 
  expect, 
  test
} from 'vitest';

import { protocolParams } from '../config/protocolParams';
import { 
  generateAccount
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
const ACCOUNT_1 = await generateAccount({ lovelace: 75000000000n });

/**
* Property testing for unlock
*/
describe('Property Testing For Unlock', async () => {

  const emulator = new Emulator([ACCOUNT_0, ACCOUNT_1], protocolParams);

  // Create an Instance of NetworkEmulator
  const lucid = await Lucid.new(emulator, 'Custom');
  const lovelace = BigInt(2_000_000);

  // Read in the validator script and determine the script address
  const validator = await readValidator();
  const contractAddress = lucid.utils.validatorToAddress(validator);

  const lock = async () => {

    try {
      
      // Get the pkh from the wallet
      const publicKeyHash = lucid.utils.getAddressDetails(
        await lucid.wallet.address()
      ).paymentCredential?.hash;

      // Construct the datum
      const datum = Data.to(new Constr(0, [publicKeyHash!]));

      const tx = await lucid
        .newTx()
        .payToContract(contractAddress, { inline: datum }, { lovelace })
        .complete();
      
      // Sign the unsigned tx to get the witness
      const signedTx = await tx.sign().complete();

      // Submit the signed tx
      await signedTx.submit();
      emulator.awaitBlock(10);

      return true

    } catch (err) {
      //console.log("Lock: ", err)
      return false
    }
  }

  const unlock = async (message: string) => {

    try {

      // Construct the Claim redeemer
      const vestingRedeemer = Data.to(new Constr(1, [fromText(message)]));
      
      // Get the UTXO(s) locked at the vesting contract (if any)
      const utxo = (await lucid.utxosAt(contractAddress));
      if (utxo.length < 1) {
        throw console.error("No UTXOs exist at the vesting contract address: ",
                            contractAddress);
      }
      const tx = await lucid
        .newTx()
        .collectFrom([utxo[0]], vestingRedeemer)
        .attachSpendingValidator(validator)
        .complete();

      // Sign the unsigned tx to get the witness
      const signedTx = await tx.sign().complete();

      // Submit the signed tx
      await signedTx.submit();
      emulator.awaitBlock(10);

      return true

    } catch (err) {
      //console.error("Unlock: ", err)
      return false
    }
  }

  test('Lock 2 Ada to script address', async () => {

    // Pre-condition
    let lockedAssetStart = { lovelace: 0n } as Assets;
    const contractUtxosStart = await lucid.utxosAt(contractAddress);
    const contractAssetsStart = contractUtxosStart.reduce((acc, utxo) => {
                  return addAssets(acc, utxo.assets)}, { lovelace: 0n } as Assets);

    assert.deepEqual(contractAssetsStart, lockedAssetStart);

    // Connect to wallet 0
    lucid.selectWalletFromSeed(ACCOUNT_0.seedPhrase);
    
    let status = await lock();
    expect(status).toBeTruthy();

     // Post condition
     let lockedAssetEnd = { lovelace: 2_000_000n } as Assets;
     const contractUtxosEnd = await lucid.utxosAt(contractAddress);
     const contractAssetsEnd = contractUtxosEnd.reduce((acc, utxo) => {       
            return addAssets(acc, utxo.assets)}, { lovelace: 0n } as Assets);
 
     assert.deepEqual(contractAssetsEnd, lockedAssetEnd);
  })

  test('Invalid redeemer value', async () => {

    // Pre-condition
    let lockedAssetStart = { lovelace: 2_000_000n } as Assets;
    const contractUtxosStart = await lucid.utxosAt(contractAddress);
    const contractAssetsStart = contractUtxosStart.reduce((acc, utxo) => {       
           return addAssets(acc, utxo.assets)}, { lovelace: 0n } as Assets);

    assert.deepEqual(contractAssetsStart, lockedAssetStart);

    // Connect to wallet 1
    lucid.selectWalletFromSeed(ACCOUNT_1.seedPhrase);
 
    fc.assert(
      fc.asyncProperty(fc.string(), async (message) => {
        try {
          // Arrange
          // Act
          let status = await unlock(message);
          // Assert
          expect(status).toBeFalsy();
        } catch (err) {
          expect(true).toBeTruthy();
        }
      }),
      { verbose: 2 }
    )

     // Post condition
    let lockedAssetEnd = { lovelace: 2_000_000n } as Assets;
    const contractUtxosEnd = await lucid.utxosAt(contractAddress);
    const contractAssetsEnd = contractUtxosEnd.reduce((acc, utxo) => {
                  return addAssets(acc, utxo.assets)}, { lovelace: 0n } as Assets);

    assert.deepEqual(contractAssetsEnd, lockedAssetEnd);
    console.log("Unlock Property Tests Passed OK");
  })
})






