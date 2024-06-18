import {
  Address,
  Datum,
  NetworkParams,
  Program,
  Value,
  TxOutput,
  Tx,
  Wallet,
  WalletHelper} from "@hyperionbt/helios";

import {
  optimize
} from '../config/settings';

import { ReturnType } from "./types";


type LockArgs = {
    lockAmount: bigint;
    wallet: Wallet;
    network: NetworkParams;
    validator: string;
}

export default async function lock (
    {lockAmount, wallet, network, validator} : LockArgs) : Promise<ReturnType> {
    
    try {
      const walletHelper = new WalletHelper(wallet);
      const lockAdaVal = new Value(BigInt(lockAmount));

      // Get wallet UTXOs
      const utxos = await walletHelper.pickUtxos(lockAdaVal);

      // Get change address
      const changeAddr = await walletHelper.changeAddress;

      // Start building the transaction
      const tx = new Tx();

      // Add the UTXO as inputs
      tx.addInputs(utxos[0]);

      // Load in the vesting validator script (program)
      const vestingProgram  = Program.new(validator);
      //const vestingProgram = new VestingValidator();

      // Compile the vesting validator
      const compiledProgram = vestingProgram.compile(optimize);

      // Construct the vesting datum
      const vestingDatum = new (vestingProgram.types.Datum)(
        changeAddr.pubKeyHash
      )
      
      // Construct the output to send the minAda
      // and the inline datum to the script address
      tx.addOutput(new TxOutput(
        Address.fromHashes(compiledProgram.validatorHash),
        new Value(lockAdaVal.lovelace),
        Datum.inline(vestingDatum)
      ));

      // Send any change back to the buyer
      await tx.finalize(network, changeAddr, utxos[1]);

      // Sign the unsigned tx to get the witness
      const signatures = await wallet.signTx(tx);
      tx.addSignatures(signatures);

      // Submit the signed tx
      const txHash = await wallet.submitTx(tx);

      return {
        status: 200,
        txName: 'Lock', 
        txId: txHash.hex,
        fee: tx.body.fee
      } as ReturnType;

    } catch (err) {
        return {
            status: 400, 
            msg: "Lock tx failed: " + err
        } as ReturnType;
    }
  }