import type { NextApiRequest, NextApiResponse } from 'next'
import { BlockFrostAPI } from '@blockfrost/blockfrost-js';

import { Ticket } from '../../common/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse ) {

    const getTicketMetadataCIP25 = async (asset: string) : Promise<Ticket> => {

        const apiKey = process.env.BLOCKFROST_API_KEY as string;
        const API = new BlockFrostAPI({
            projectId: apiKey
          });

        // Call the blockfrost API to get the CIP-25 metadata
        const ticketMetadata = await API.assetsById(asset);

        const utxoId = ticketMetadata.onchain_metadata!.utxoId as string;
        const utxoIdx = ticketMetadata.onchain_metadata!.utxoIdx as number;
        const name = ticketMetadata.onchain_metadata!.name as string;
        const location = ticketMetadata.onchain_metadata!.location as string;
        const image = ticketMetadata.onchain_metadata!.image as unknown;
        const paymentPKH = ticketMetadata.onchain_metadata!.paymentPKH as string;
        const stakePKH = ticketMetadata.onchain_metadata!.stakePKH as string;
        const qty = ticketMetadata.onchain_metadata!.qty as number;
        const holdValHash = ticketMetadata.onchain_metadata!.holdValHash as string;
        const minLovelace = ticketMetadata.onchain_metadata!.minLovelace as number;
        const showtime = ticketMetadata.onchain_metadata!.showtime as string;

        var imageSrc
        if (Array.isArray(image)) {
          imageSrc = image.join('')
        } else {
          imageSrc = image
        }

        const ticketInfo = new Ticket(
            utxoId,
            utxoIdx,
            Buffer.from(name).toString('hex'),
            location,
            showtime,
            imageSrc as string,
            qty,
            paymentPKH,
            stakePKH,
            holdValHash,
            minLovelace,
        );
       return ticketInfo;
    }

    try {
        // TODO - sanitize inputs
        const ticketInfo = await getTicketMetadataCIP25(req.body.asset)
        console.log("getTicketMetadataCIP25: ticketInfo: ", ticketInfo);
        res.status(200).send(ticketInfo);
    }
    catch (err) {
        res.status(500).json("getTicketMetadataCIP25 API error: " + err);
    }
}