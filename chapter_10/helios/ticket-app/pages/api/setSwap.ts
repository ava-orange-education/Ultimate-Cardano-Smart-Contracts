import type { NextApiRequest, NextApiResponse } from 'next';
import { swapRepository } from '../../schema/swap'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {

  try {
        // Store swap in db for fast access
        await swapRepository.save({
          name: req.body.swap.name,
          location: req.body.swap.location,
          showtime: req.body.swap.showtime,
          image: req.body.swap.image,
          description: req.body.swap.description,
          askedAsset: req.body.swap.askedAsset,
          askedAssetQty: req.body.swap.askedAssetQty,
          offeredAsset: req.body.swap.offeredAsset,
          offeredAssetQty: req.body.swap.offeredAssetQty,
          beaconAsset: req.body.swap.beaconAsset,
          holdValHash: req.body.swap.holdValHash,
          paymentPKH: req.body.swap.paymentPKH,
          stakePKH: req.body.swap.stakePKH,
          ownerPKH: req.body.swap.ownerPKH,
          minLovelace: req.body.swap.minLovelace,
          txId: req.body.swap.txId,
          confirmed: req.body.swap.confirmed,
          active: true
        })

        res.status(200).json({ message: 'Swap set succesfully: ' + req.body.swap });
    }
    catch (err) {
        console.error("setSwap: ", err);
        res.status(500).send(err);
    }
}
