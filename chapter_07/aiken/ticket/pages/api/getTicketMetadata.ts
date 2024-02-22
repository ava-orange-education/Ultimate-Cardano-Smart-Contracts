import type { NextApiRequest, NextApiResponse } from 'next'
import { BlockFrostAPI } from '@blockfrost/blockfrost-js';

import { TicketInfo } from '../../common/types';
import { fromText } from 'lucid-cardano';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse ) {

    const getTicketMetadata = async (  ticketPolicyId: string,
                                    ticketTokenName: string) : Promise<TicketInfo> => {

        const apiKey = process.env.NEXT_PUBLIC_BLOCKFROST_API_KEY as string;
        const API = new BlockFrostAPI({
            projectId: apiKey
          });

        const ticketTokenNameHex = fromText(ticketTokenName);
        const asset = ticketPolicyId + ticketTokenNameHex;

        // Call the blockfrost API to get the CIP-25 metadata
        const ticketMetadata = await API.assetsById(asset);

        const name = ticketMetadata.onchain_metadata!.name as string;
        const description = ticketMetadata.onchain_metadata!.description as string;
        const image = ticketMetadata.onchain_metadata!.image as string;
        const qty = ticketMetadata.onchain_metadata!.qty as string;
        const utxoId = ticketMetadata.onchain_metadata!.utxoId as string;
        const utxoIdx = ticketMetadata.onchain_metadata!.utxoIdx as string;

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