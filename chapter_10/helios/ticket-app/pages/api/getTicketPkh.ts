import { NextApiRequest, NextApiResponse } from 'next';
import { ticketsRepository } from '../../schema/tickets';
import { Entity } from "redis-om";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {

    try {
      let ticket = await ticketsRepository.search()
          .where('asset').eq(req.body.asset)
          .return.first() as Entity;

      res.status(200).send(ticket.pkh);
        
    } catch (err) {
      res.status(400).json({ message: 'No ticket found', err });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
