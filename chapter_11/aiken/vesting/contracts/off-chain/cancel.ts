import { 
    Constr,
    Data,
    Lucid, 
    Script } from "lucid-cardano";

import { ReturnType } from "./types";

type CancelArgs = {
    lucid: Lucid,
    validator: Script
}

export default async function cancel (
    {lucid, validator}: CancelArgs): Promise<ReturnType> {

    try {
        // Get contract address
        const contractAddress = lucid.utils.validatorToAddress(validator);
      
        // Construct the Cancel redeemer
        const vestingRedeemer = Data.to(new Constr(0,[]));

        // Get the UTXO(s) locked at the vesting contract (if any)
        const utxo = (await lucid.utxosAt(contractAddress));
        if (utxo.length < 1) {
            throw console.error("No UTXOs exist at the vesting contract address: ",
                                contractAddress);
        }
        const tx = await lucid
            .newTx()
            .collectFrom([utxo[0]], vestingRedeemer)
            .addSigner(await lucid.wallet.address())
            .attachSpendingValidator(validator)
            .complete();

        // Sign the unsigned tx to get the witness
        const signedTx = await tx.sign().complete();

        // Submit the signed tx
        const txHash = await signedTx.submit();
        return {
            status: 200, 
            txName: 'Cancel',
            txId: txHash,
            cpu: tx.exUnits?.cpu,
            mem: tx.exUnits?.mem,
            fee: tx.fee
        } as ReturnType;

    } catch (err) {
        return {
            status: 400, 
            msg: "Cancel tx failed: " + err
        } as ReturnType;
    }
}