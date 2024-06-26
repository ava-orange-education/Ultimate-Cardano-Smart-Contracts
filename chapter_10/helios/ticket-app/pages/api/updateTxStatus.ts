import type { NextApiRequest, NextApiResponse } from 'next';
import { eventRepository } from '../../schema/event';
import { swapRepository } from '../../schema/swap';
import { Entity } from "redis-om";
import { verifyWebhookSignature } from "@blockfrost/blockfrost-js";
import { 
  hexToBytes,
  ListData 
} from '@hyperionbt/helios';

async function updateDB (txId: string, txOutputs: any) {

  let event = await eventRepository.search()
    .where('txId').eq(txId)
    .return.first() as Entity;

  // Update event in db
  if (event) {
    event.confirmed = true;
    await eventRepository.save(event);
    console.log("updateTxStatus: event: Success");
  } else {
    console.log("updateTxStatus: event: tx does not exist: ", txId);
  }
  
  let swap = await swapRepository.search()
    .where('txId').eq(txId)
    .return.first() as Entity;

  // Update swap in db
  if (swap) {
    try {
      // update askedAsset and offeredAsset Qty & confirm tx if a swap was executed
      const txDatum = txOutputs[1].inline_datum;
      const listDataJson = JSON.parse((ListData.fromCbor(hexToBytes(txDatum))).toSchemaJson());
      swap.askedAssetQty = listDataJson.list[0].map[0].v.map[0].v.int;
      swap.offeredAssetQty = listDataJson.list[1].map[0].v.map[0].v.int;
      swap.confirmed = true;
    } catch (err) {
      // otherwise just confirm tx
      swap.confirmed = true;
    }
    
    await swapRepository.save(swap);
    console.log("updateTxStatus: swap: Success");
  } else {
    console.log("updateTxStatus: swap: tx does not exist: ", txId);
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {

  // Make sure that Blockfrost-Signature header exists
  const signatureHeader = req.headers["blockfrost-signature"];
  if (!signatureHeader) {
    console.log("The request is missing Blockfrost-Signature header");
    return res.status(400).send(`Missing signature header`);
  }

  try {
    const SECRET_AUTH_TOKEN = process.env.WEBHOOK_AUTH_TOKEN;
    verifyWebhookSignature(
      JSON.stringify(req.body), 
      signatureHeader!,
      SECRET_AUTH_TOKEN!
    );

    // Signature is valid
    const type = req.body.type;
    const payload = req.body.payload;

    // Process the incoming event
    switch (type) {
      case "transaction":
        // loop through the payload (payload is an array of Transaction events)
        for (const transaction of payload) {
          try {
            await updateDB(transaction.tx.hash, transaction.outputs);
           } catch (err) {
            console.error("updateTxStatused Error: ", err);
            res.status(500).send(err);
          }
        }
        break;

      default:
        console.warn(`Unexpected event type ${type}`);
        break;
    }
    res.status(200).json({ message: `Update confirmed success`});

  } catch (error) {
    console.error(error);
    return res.status(400).send("Signature is not valid!");
  }
}
