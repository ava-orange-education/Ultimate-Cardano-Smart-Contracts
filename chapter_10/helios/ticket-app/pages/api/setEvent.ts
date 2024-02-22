import type { NextApiRequest, NextApiResponse } from 'next';
import { eventRepository } from '../../schema/event'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {

  try {
        // Store event in db
        await eventRepository.save({
          asset: req.body.event.asset,
          name: req.body.event.name,
          location: req.body.event.location,
          showtime: req.body.event.showtime,
          image: req.body.event.image,
          allocated: req.body.event.allocated,
          holding: req.body.event.holding,
          released: req.body.event.released,
          converted: req.body.event.converted,
          holdValHash: req.body.event.holdValHash,
          paymentPKH: req.body.event.paymentPKH,
          stakePKH: req.body.event.stakePKH,
          txId: req.body.event.txId,
          confirmed: req.body.event.confirmed,
          active: true
        })

        res.status(200).json({ message: 'Event set succesfully: ' + req.body.event.confirmed });
    }
    catch (err) {
        console.error("setEvent: ", err);
        res.status(500).send(err);
    }
}
