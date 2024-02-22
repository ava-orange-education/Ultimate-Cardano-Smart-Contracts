import type { NextApiRequest, NextApiResponse } from 'next'
import { BlockFrostAPI } from '@blockfrost/blockfrost-js';

import { PrintTicketInfo } from '../../common/types';
import {
  MapData,
  hexToBytes
} from "@hyperionbt/helios";


export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse ) {

    const getTicketMetadataCIP68 = async (asset: string) : Promise<PrintTicketInfo> => {

        console.log("getTicketMetadataCIP68: asset: ", asset);
        const apiKey = process.env.BLOCKFROST_API_KEY as string;
        const API = new BlockFrostAPI({
            projectId: apiKey
          });

        // Call the blockfrost API to get the CIP-25 metadata
        const ticketMetadata = await API.assetsById(asset);
        console.log("getTicketMetadataCIP68: ticketMetadata: ", ticketMetadata);

        const name = ticketMetadata.onchain_metadata!.name as string;
        const image = ticketMetadata.onchain_metadata!.image as string;
        
        const extraData = ticketMetadata.onchain_metadata_extra! as string;
        const mapData = MapData.fromCbor(hexToBytes(extraData));
        //console.log("getTicketMetadataCIIP68: mapData.toSchemaJson(): " , mapData.toSchemaJson())
        const mapDataJSON = JSON.parse(mapData.toSchemaJson())
        const location = Buffer.from(mapDataJSON.map[0].v.bytes, 'hex').toString()
        const showtime = mapDataJSON.map[1].v.int
        const pkh = mapDataJSON.map[2].v.bytes

        const printTicket = new PrintTicketInfo(
            asset,
            asset.slice(0,56),
            name,
            location,
            showtime,
            image,
            pkh == "" ? undefined : pkh
        );
        return printTicket;
    }

    try {
        // TODO - sanitize inputs
        const printTicket = await getTicketMetadataCIP68(req.body.asset)
        console.log("getTicketMetadataCIP68: return: ", printTicket);
        res.status(200).send(printTicket);
    }
    catch (err) {
        res.status(500).json("getTicketMetadataCIP68 API error: " + err);
    }
}