import axios from 'axios';
import type { NextApiRequest, NextApiResponse } from 'next'
import { fromText } from 'lucid-cardano';

import { TicketInfo } from '../../common/types';

const baseURL = process.env.NEXT_PUBLIC_KUPO_API as string;

const getTransaction = async (asset: string): Promise <any> => {
  const api = "/matches/" + asset.slice(0,56) + "." + asset.slice(56) + "?order=oldest_first";
  try {
    let res = await axios({
        baseURL: baseURL,
        url: api,
        method: 'get',
        timeout: 8000,
        headers: {
            'Content-Type': 'application/json'
        }
    })
    if(res.status == 200){
        return res.data;
    } else {
      console.error("getTransaction Error: ", res);
      throw res.data;
    }   
  } catch (err) {
      console.error("getTransaction Failed: ", err);
      throw err;
  }
}

const getMetadata = async ( slot_num: number,
                            transaction_id: string): Promise <any> => {

  const api = "/metadata/" + slot_num + "?" + transaction_id; 

  try {
    let res = await axios({
        baseURL: baseURL,
        url: api,
        method: 'get',
        timeout: 8000,
        headers: {
            'Content-Type': 'application/json'
        }
    })
    if(res.status == 200){
        return res.data;
    } else {
      console.error("getTicketMetadata Error: ", res);
      throw res.data;
    }   
  } catch (err) {
      console.error("getTicketMetadata Failed: ", err);
      throw err;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse ) {

    const getTicketMetadata = async (ticketPolicyId: string,
                                     ticketTokenName: string): Promise<TicketInfo> => {

        const asset = ticketPolicyId + fromText(ticketTokenName);

        // Call Kupo API to first get the transaction id of the mint
        const transaction = await getTransaction(asset);

        // Now call Kupo API to get the metadata using the mint tx
        const metadata = await getMetadata( transaction[0].created_at.slot_no,
                                            transaction[0].transaction_id);

        const name = metadata[0].schema['721'].map[0].v.map[1].k.string as string;
        const description = metadata[0].schema['721'].map[0].v.map[1].v.map[1].v.string as string;
        const image = metadata[0].schema['721'].map[0].v.map[1].v.map[2].v.string as string;
        const qty = metadata[0].schema['721'].map[0].v.map[1].v.map[5].v.string as string;
        const utxoId = metadata[0].schema['721'].map[0].v.map[1].v.map[6].v.string as string;
        const utxoIdx = metadata[0].schema['721'].map[0].v.map[1].v.map[7].v.string as string;

        const ticketInfo = new TicketInfo(
            name,
            description,
            image,
            qty,
            utxoId,
            utxoIdx,
        );
        console.log("ticketInfo: ", ticketInfo);
       return ticketInfo;
    }
    try {
        // TODO - sanitize inputs
        const ticketInfo = await getTicketMetadata(req.body.ticketPolicyId, req.body.ticketTokenName)
        res.status(200).send(ticketInfo);
    }
    catch (err) {
        res.status(500).json("getTicketMetadata API error: " + err);
    }
}