import { 
    Constr,
    Data,
    Lucid,
    Script
} from "lucid-cardano";

import { ReturnType } from "./types";


type LockArgs = {
    lovelace: bigint;
    lucid: Lucid;
    validator: Script; 
}

export default async function lock (
    {lovelace, lucid, validator} : LockArgs) : Promise<ReturnType> {
    
    try {
      // Get the pkh from the wallet
      const publicKeyHash = lucid.utils.getAddressDetails(
        await lucid.wallet.address()
      ).paymentCredential?.hash;

      if (!publicKeyHash) {
        return {status: 400, msg: "Invalid public key hash "} as ReturnType;
      }

      // Construct the datum
      const datum = Data.to(new Constr(0, [publicKeyHash]));
      const contractAddress = lucid.utils.validatorToAddress(validator);
      
      const tx = await lucid
        .newTx()
        .payToContract(contractAddress, { inline: datum }, { lovelace })
        .complete();
      
      // Sign the unsigned tx to get the witness
      const signedTx = await tx.sign().complete();

      // Submit the signed tx
      const txHash = await signedTx.submit();
      return {
        status: 200,
        txName: 'Lock', 
        txId: txHash,
        cpu: tx.exUnits?.cpu,
        mem: tx.exUnits?.mem,
        fee: tx.fee
    } as ReturnType;

    } catch (err) {
        return {
            status: 400, 
            msg: "Lock tx failed: " + err
        } as ReturnType;
    }
  }