import type { NextApiRequest, NextApiResponse } from 'next';
import { stakeRepository } from '../../schema/stake'
import { Entity } from "redis-om"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {

  try {
        let stakeKey = await stakeRepository.search()
          .where('stakeAddr').eq(req.body.stakeAddr)
          .return.first() as Entity;

        if (stakeKey && stakeKey.assets) {
          // Update stake key with new asset
          let assets = stakeKey.assets as string[];
          stakeKey.assets = [...assets, req.body.asset]
          await stakeRepository.save(stakeKey);
        } else {
          // Stake key does not exist so add it with the new asset
          await stakeRepository.save({
            stakeAddr: req.body.stakeAddr,
            assets: [req.body.asset]
          })
        }
        
        res.status(200).json({ message: 'Stake Assets Updated Succesfully: ' + req.body.stakeAddr });
    }
    catch (err) {
        console.error("setStakeKey: ", err);
        res.status(500).send(err);
    }
}
