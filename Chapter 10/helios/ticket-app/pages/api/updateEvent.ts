import type { NextApiRequest, NextApiResponse } from 'next';
import { eventRepository } from '../../schema/event';
import { Entity } from "redis-om";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {

  try {
        let event = await eventRepository.search()
          .where('asset').eq(req.body.event.asset)
          .return.first() as Entity;

        event.holding = req.body.event.holding;
        event.released = req.body.event.released;
        event.converted = req.body.event.converted;
        event.active = req.body.event.active;

        // Update event in db
        await eventRepository.save(event);
        console.log("updateEvent: event: ", event);
        res.status(200).json({ message: 'Event update success: ' + req.body.event.asset });
    }
    catch (err) {
        console.error("updateEvent: ", err);
        res.status(500).send(err);
    }
}
