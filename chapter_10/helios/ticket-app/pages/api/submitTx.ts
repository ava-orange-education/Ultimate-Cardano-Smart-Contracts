import type { NextApiRequest, NextApiResponse } from 'next'
import { BlockFrostAPI } from '@blockfrost/blockfrost-js';

import {
    hexToBytes, 
    Tx } from "@hyperionbt/helios";

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
          console.error("submitTx API Failed: ", err);
          throw err;
      }
    }
    
    try {   
        const txCbor = req.body;
        const tx = Tx.fromCbor(hexToBytes(txCbor));
        const txId = await submitTx(tx);
        console.log("txId", txId);
        res.status(200).send(txId);
    }
    catch (err) {
        res.status(500).json("submitTx API error: " + err);
    }
}