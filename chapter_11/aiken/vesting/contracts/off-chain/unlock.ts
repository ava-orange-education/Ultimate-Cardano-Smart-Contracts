import { 
    Constr,
    Data,
    fromText,
    Lucid, 
    Script} from "lucid-cardano";

import { ReturnType } from "./types";


type UnlockArgs = {
    message: string,
    lucid: Lucid,
    validator: Script
}

export default async function unlock (
    {message, lucid, validator}: UnlockArgs): Promise<ReturnType> {

    try {
        // Construct the Claim redeemer
        const vestingRedeemer = Data.to(new Constr(1, [fromText(message)]));
        const contractAddress = lucid.utils.validatorToAddress(validator);
        
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
        const txHash = await signedTx.submit();
        return {
            status: 200, 
            txName: 'Unlock',
            txId: txHash,
            cpu: tx.exUnits?.cpu,
            mem: tx.exUnits?.mem,
            fee: tx.fee
        } as ReturnType;
    } catch (err) {
        console.log("err:" , err);
        return {
            status: 400, 
            msg: "Unlock tx failed: " + err
        } as ReturnType;
    }
}