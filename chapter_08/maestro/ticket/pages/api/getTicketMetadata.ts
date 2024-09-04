import type { NextApiRequest, NextApiResponse } from 'next'
import { fromText } from '@lucid-evolution/lucid';
import { MaestroClient, Configuration, AssetInfo } from "@maestro-org/typescript-sdk";

import { TicketInfo } from '../../common/types';

interface cip25Metata {
  name: string,
  description: string,
  image: string,
  qty: string,
  utxoId: string,
  utxoIdx: string,
}

const apiKey = process.env.NEXT_PUBLIC_MAESTRO_API_KEY as string;

let maestroClient = new MaestroClient(
  new Configuration({
    apiKey: apiKey,
    network: "Preprod",
  })
);

const getMetadata = async (asset: string): Promise <AssetInfo|undefined> => {

  const assetInfo = await maestroClient.assets
  .assetInfo(asset)
  .catch((error) => {
    if (error.response) {
      console.error("Status Code Error", error.response);
    } else if (error.request) {
        console.error("Network Error", error.request);
    } else {
        console.error("Client Error", error.message);
    }
  }); 
  if (assetInfo) {
      return assetInfo.data;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse ) {

    const getTicketMetadata = async (  ticketPolicyId: string,
                                    ticketTokenName: string) : Promise<TicketInfo> => {

        const ticketTokenNameHex = fromText(ticketTokenName);
        const asset = ticketPolicyId + ticketTokenNameHex;

        // Call the Maestro API to get the CIP-25 metadata
        const ticketMetadata = await getMetadata(asset);
        const ticketMetadataCIP25 = ticketMetadata?.asset_standards.cip25_metadata as cip25Metata;

        const name = ticketMetadataCIP25?.name as string;
        const description = ticketMetadataCIP25?.description as string;
        const image = ticketMetadataCIP25?.image as string;
        const qty = ticketMetadataCIP25?.qty as string;
        const utxoId = ticketMetadataCIP25?.utxoId as string;
        const utxoIdx = ticketMetadataCIP25?.utxoIdx as string;

        const ticketInfo = new TicketInfo(
            name,
            description,
            image,
            qty,
            utxoId,
            utxoIdx,
        );
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