import { NextApiRequest, NextApiResponse } from 'next';
import { eventRepository } from '../../schema/event';
import { Entity } from "redis-om";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {

    try {

      let event = await eventRepository.search()
          .where('asset').eq(req.body.asset)
          .return.first() as Entity;

      res.status(200).send(event);
        
    } catch (err) {
      res.status(400).json({ message: 'No event found', err });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
