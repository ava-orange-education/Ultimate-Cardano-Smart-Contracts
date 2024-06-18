import { promises as fs } from 'fs';
import path from 'path';
import fc from 'fast-check';

import { 
  describe, 
  expect, 
  test,
} from 'vitest';

import {
  Address,
  Datum,
  NetworkEmulator,
  NetworkParams,
  Program,
  Value,
  TxOutput,
  Tx,
  WalletHelper} from "@hyperionbt/helios";

import {
    network,
    optimize
  } from '../config/settings';
import { 
  getNetworkParams
} from '../off-chain/network';


//Find the absolute path of the contracts directory
const contractDirectory = path.join(process.cwd(), 'contracts')
const validatorScript = await fs.readFile(contractDirectory + '/validators/vesting.hl', 'utf8');
  
// Read in the network parameter file
const networkParamsJson = await getNetworkParams(network);
const networkParams = new NetworkParams(networkParamsJson);

// Create an Instance of NetworkEmulator
const emulator = new NetworkEmulator();

// Create a Wallet - we add 30K ADA to start
const ACCOUNT_0 = emulator.createWallet(30000000000n);
emulator.tick(10n);


/**
* Property based testing for lock
*/
describe('Property Testing For Lock', async () => {

  type LockParams = {
    lockAmount: bigint,
    publicKeyHash: string
  }
  
  const lock = async (params : LockParams) => {

    try {
      const lockAdaVal = new Value(BigInt(params.lockAmount));
      const walletHelper = new WalletHelper(ACCOUNT_0);
      
      // Get wallet UTXOs
      const utxos = await walletHelper.pickUtxos(lockAdaVal);

      // Get change address
      const changeAddr = await walletHelper.changeAddress;

      // Start building the transaction
      const tx = new Tx();

      // Add the UTXO as inputs
      tx.addInputs(utxos[0]);

      // Load in the vesting validator script (program)
      const vestingProgram  = Program.new(validatorScript);

      // Compile the vesting validator
      const compiledProgram = vestingProgram.compile(optimize);

      // Construct the vesting datum
      const vestingDatum = new (vestingProgram.types.Datum)(
        params.publicKeyHash
      )
      
      // Construct the output to send the minAda
      // and the inline datum to the script address
      tx.addOutput(new TxOutput(
        Address.fromHashes(compiledProgram.validatorHash),
        new Value(lockAdaVal.lovelace),
        Datum.inline(vestingDatum)
      ));

      // Send any change back to the buyer
      await tx.finalize(networkParams, changeAddr, utxos[1]);

      console.log("tx finalize: ", tx);

      // Sign the unsigned tx to get the witness
      const signatures = await ACCOUNT_0.signTx(tx);
      tx.addSignatures(signatures);

      // Submit the signed tx
      await ACCOUNT_0.submitTx(tx);
      emulator.tick(10n);
      return true

    } catch (err) {
      //console.log(err)
      return false
    }
  }

  test('Invalid Amount sent', async () => {

    const pkh = ACCOUNT_0.pubKeyHash.hex;

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
  })

  test('Invalid PKH in datum', async () => {

    const lovelace = BigInt(2_000_000);

    await fc.assert(
      fc.asyncProperty(fc.gen(), async gen => {
        try {
          // Arrange
          const paramsFC = gen(fc.record, {publicKeyHash: fc.string()}, {});
          const params = {...paramsFC, lockAmount: lovelace} as LockParams;
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
