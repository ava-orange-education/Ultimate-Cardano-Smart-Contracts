import { promises as fs } from 'fs';
import path from 'path';
import fc from 'fast-check';

import { 
  assert, 
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
const ACCOUNT_1 = emulator.createWallet(60000000000n);
emulator.tick(10n);

/**
* Property testing for unlock
*/
describe('Property Testing For Unlock', async () => {

  const lockAmount = 2_000_000n;

  // Load in the vesting validator script (program)
  const vestingProgram  = Program.new(validatorScript);

  // Compile the vesting validator
  const compiledProgram = vestingProgram.compile(optimize);

  const lock = async () => {

    try {
      const lockAdaVal = new Value(BigInt(lockAmount));
      const walletHelper = new WalletHelper(ACCOUNT_0);
      
      // Get wallet UTXOs
      const utxos = await walletHelper.pickUtxos(lockAdaVal);

      // Get change address
      const changeAddr = await walletHelper.changeAddress;

      // Start building the transaction
      const tx = new Tx();

      // Add the UTXO as inputs
      tx.addInputs(utxos[0]);

      // Construct the vesting datum
      const vestingDatum = new (vestingProgram.types.Datum)(
        ACCOUNT_0.pubKeyHash
      )
      
      // Construct the output to send the minAda
      // and the inline datum to the script address
      tx.addOutput(new TxOutput(
        Address.fromHashes(compiledProgram.validatorHash),
        lockAdaVal,
        Datum.inline(vestingDatum)
      ));

      // Send any change back to the buyer
      await tx.finalize(networkParams, changeAddr, utxos[1]);

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

  const unlock = async (message: string) => {

    try {
      const walletHelper = new WalletHelper(ACCOUNT_1);
      const lockAdaVal = new Value(BigInt(lockAmount));

      // Get wallet UTXOs
      const utxos = await walletHelper.pickUtxos(lockAdaVal);

      // Get change address
      const changeAddr = await walletHelper.changeAddress;

        // Get receiving address(es)
      const receivingAddr = await walletHelper.allAddresses;

      // Start building the transaction
      const tx = new Tx();

      // Add the UTXO as inputs
      tx.addInputs(utxos[0]);

      // Add the script as a witness to the transaction
      tx.attachScript(compiledProgram);

      // Create the vesting claim redeemer
      const vestingRedeemer = (new vestingProgram .types.Redeemer.Claim(message))
                            ._toUplcData();

      // Get the UTXO(s) locked at the vesting contract (if any)
      const vestingUtxo = await emulator.getUtxos(
        Address.fromHashes(compiledProgram.validatorHash)
      );

      // Check that UTXO input exists
      if (vestingUtxo.length > 0) {
          tx.addInput(vestingUtxo[0], vestingRedeemer);  
      } else {
          throw console.error("No UTXOs found at vesting contract address: ",
              Address.fromHashes(compiledProgram.validatorHash).toBech32);
      }

      // Construct the output to send the unlocked funds to
      tx.addOutput(new TxOutput(
        receivingAddr[0], // send to the frist receiving address
        new Value(lockAmount)
      ));

      // Send any change back to the user
      await tx.finalize(networkParams, changeAddr, utxos[1]);

      // Sign the unsigned tx to get the witness
      const signatures = await ACCOUNT_1.signTx(tx);
      tx.addSignatures(signatures);

      // Submit the signed tx
      const status = await ACCOUNT_1.submitTx(tx);
      emulator.tick(10n);

      return true

    } catch (err) {
      //console.error("Unlock: ", err)
      return false
    }
  }

  test('Lock 2 Ada to script address', async () => {

    // Pre-condition
    const lockedValueStart = new Value(0n);
    const contractUtxosStart = await emulator.getUtxos(Address.fromHashes(compiledProgram.validatorHash));
    const contractValueStart = contractUtxosStart.reduce((amount, utxo) => 
      amount.add(utxo.output.value), new Value(0n)
    );

    assert.deepEqual(contractValueStart, lockedValueStart);

    const result = await lock();
    expect(result).toBeTruthy();
    emulator.tick(10n);

    // Post conditions
    const lockedValue = new Value(lockAmount);
    const contractUtxosEnd = await emulator.getUtxos(Address.fromHashes(compiledProgram.validatorHash));
    const contractValueEnd = contractUtxosEnd.reduce((amount, utxo) => 
      amount.add(utxo.output.value), new Value(0n)
    );

    assert.deepEqual(contractValueEnd, lockedValue);

  })

  test('Invalid redeemer value', async () => {

    // Pre-condition
    const lockedValueStart = new Value(lockAmount);
    const contractUtxosStart = await emulator.getUtxos(Address.fromHashes(compiledProgram.validatorHash));
    const contractValueStart = contractUtxosStart.reduce((amount, utxo) => 
      amount.add(utxo.output.value), new Value(0n)
    );

    assert.deepEqual(contractValueStart, lockedValueStart);

    fc.assert(
      fc.asyncProperty(fc.string(), async (message) => {
        try {
          // Arrange
          // Act
          let status = await unlock(message);
          emulator.tick(10n);
          // Assert
          expect(status).toBeFalsy();
        } catch (err) {
          expect(true).toBeTruthy();
        }
      }),
      { verbose: 2 }
    )

     // Post condition
    const contractUtxosEnd = await emulator.getUtxos(Address.fromHashes(compiledProgram.validatorHash));
    const contractValueEnd = contractUtxosEnd.reduce((amount, utxo) => 
      amount.add(utxo.output.value), new Value(0n)
    );

    assert.deepEqual(contractValueEnd, lockedValueStart);
    console.log("Unlock Property Tests Passed OK");
  })
})






