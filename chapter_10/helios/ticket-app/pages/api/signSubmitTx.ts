import type { NextApiRequest, NextApiResponse } from 'next'
import { BlockFrostAPI } from '@blockfrost/blockfrost-js';
import {
  Bip32PrivateKey,
  hexToBytes, 
  Tx 
} from "@hyperionbt/helios";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse ) {

    const submitTx = async (tx: Tx) : Promise<string> => {

      const payload = new Uint8Array(tx.toCbor());
      const apiKey : string = process.env.BLOCKFROST_API_KEY as string;
  
      try {
        const client = new BlockFrostAPI({
            projectId: apiKey,
          });
        const txHash = await client.txSubmit(payload);
        return txHash;

      }
      catch (err) {
          console.error("signSubmitTx API Failed: ", err);
          throw err;
      }
    }
    
    try {
        const privKeyHex = process.env.OWNER_PRIVATE_KEY;
        const privKey = new Bip32PrivateKey(hexToBytes(privKeyHex!));        
        const txCbor = req.body;
        const tx = Tx.fromCbor(hexToBytes(txCbor));

        // **** Check tx before proceeding if required *** //
        
        const signature = privKey.sign(tx.bodyHash);
        tx.addSignature(signature);
        const txId = await submitTx(tx);
        console.log("txId", txId);
        res.status(200).send(txId);
    }
    catch (err) {
        res.status(500).json("signSubmitTx API error: " + err);
    }
}