import type { NextApiRequest, NextApiResponse } from 'next';
import { swapRepository } from '../../schema/swap';
import { Entity } from "redis-om";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {

  try {
        let swap = await swapRepository.search()
          .where('beaconAsset').eq(req.body.swap.beaconAsset)
          .return.first() as Entity;

        swap.askedAssetQty = req.body.swap.askedAssetQty ;
        swap.offeredAssetQty = req.body.swap.offeredAssetQty;
        swap.txId = req.body.swap.txId;
        swap.confirmed = req.body.swap.confirmed;

        // Update event in db
        console.log("updateSwap: swap: ", swap);
        await swapRepository.save(swap);

        res.status(200).json({ message: 'Swap update success: ' + req.body.swap.beaconAsset });
    }
    catch (err) {
        console.error("updateSwap: ", err);
        res.status(500).send(err);
    }
}
