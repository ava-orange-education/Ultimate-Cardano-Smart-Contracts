import type { NextApiRequest, NextApiResponse } from 'next';
import { ticketsRepository } from '../../schema/tickets'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {

  try {
        await ticketsRepository.save({
            asset: req.body.asset,
            pkh: req.body.pkh,
            used: false
          })
        
        res.status(200).json({ message: 'Ticket successfully added to the database'});
    }
    catch (err) {
        console.error("setTickets: ", err);
        res.status(500).send(err);
    }
}
