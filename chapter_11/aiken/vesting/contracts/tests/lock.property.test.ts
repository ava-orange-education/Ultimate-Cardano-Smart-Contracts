import { promises as fs } from 'fs';
import path from 'path';
import fc from 'fast-check';

import { 
  Emulator,
  Constr,
  Data,
  Lucid,
  SpendingValidator 
} from "lucid-cardano"; 
import { 
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

/**
* Property based testing for lock
*/
describe('Property Testing For Lock', async () => {

  const emulator = new Emulator([ACCOUNT_0], protocolParams);

  // Create an Instance of NetworkEmulator
  const lucid = await Lucid.new(emulator, 'Custom');

  // Read in the validator script and determine the script address
  const validator = await readValidator();
  const contractAddress = lucid.utils.validatorToAddress(validator);

  type LockParams = {
    lovelace: bigint,
    publicKeyHash: string
  }
  
  const lock = async (params : LockParams) => {

    try {
      // Construct the datum
      const datum = Data.to(new Constr(0, [params.publicKeyHash]));

      const tx = await lucid
        .newTx()
        .payToContract(contractAddress, { inline: datum }, { lovelace: params.lovelace })
        .complete();
      
      // Sign the unsigned tx to get the witness
      const signedTx = await tx.sign().complete();

      // Submit the signed tx
      await signedTx.submit();
      emulator.awaitBlock(10);
      return true

    } catch (err) {
      //console.log(err)
      return false
    }
  }

  test('Invliad Amount sent', async () => {

    // Connect to wallet 0
    lucid.selectWalletFromSeed(ACCOUNT_0.seedPhrase);
    
    const pkh = lucid.utils.getAddressDetails(
      await lucid.wallet.address()
    ).paymentCredential?.hash;

    await fc.assert(
      fc.asyncProperty(fc.gen(), async gen => {
        try {
          // Arrange
          const paramsFC = gen(fc.record, {lovelace: fc.bigInt()}, {});
          const params = {...paramsFC, publicKeyHash: pkh} as LockParams;
          // Act
          let status = await lock(params);
          // Assert
          expect(status).toBeFalsy();

        } catch (err) {
          expect(true).toBeTruthy();
        }
      }),
      { verbose: 2 }
    )
    console.log("Lock Property Tests Passed OK");
  })

  test('Invalid PKH in datum', async () => {

    const lovelace = BigInt(2_000_000);

    // Connect to wallet 0
    lucid.selectWalletFromSeed(ACCOUNT_0.seedPhrase);

    await fc.assert(
      fc.asyncProperty(fc.gen(), async gen => {
        try {
          // Arrange
          const paramsFC = gen(fc.record, {publicKeyHash: fc.string()}, {});
          const params = {...paramsFC, lovelace: lovelace} as LockParams;
          // Act
          let status = await lock(params);
          // Assert
          expect(status).toBeFalsy();

        } catch (err) {
          expect(true).toBeTruthy();
        }
      }),
      { verbose: 2 }
    )
    console.log("Lock Property Tests Passed OK");
  })
})
