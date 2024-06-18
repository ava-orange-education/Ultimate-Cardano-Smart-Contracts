import { NextApiRequest, NextApiResponse } from 'next';
import { stakeRepository } from '../../schema/stake';
import { eventRepository } from '../../schema/event';
import { Entity } from "redis-om";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {

    try {

      let stakeKey = await stakeRepository.search()
          .where('stakeAddr').eq(req.body.stakeAddr)
          .return.first() as Entity;
         
          if (stakeKey.assets) {
            const stakeAssets = stakeKey.assets as string[];
            const events = await Promise.all(stakeAssets.map((asset) => {
              return eventRepository.search()
                .where('asset').eq(asset)
                .return.first()
            }))
            res.status(200).send(events);
          }
        
    } catch (err) {
      res.status(201).json({ message: 'No stake key found', err });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
