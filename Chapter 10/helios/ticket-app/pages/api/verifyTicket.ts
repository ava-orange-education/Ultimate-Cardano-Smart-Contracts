import type { NextApiRequest, NextApiResponse } from 'next';
import { ticketsRepository } from '../../schema/tickets';
import { Entity } from "redis-om";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {

  try {
        let ticket = await ticketsRepository.search()
          .where('asset').eq(req.body.asset)
          .and('pkh').eq(req.body.pkh)
          .return.first() as Entity;

        // Set ticket used to true indicating that the
        // verified ticket has been used at an event
        ticket.used = true;

        // Update ticket in db
        await ticketsRepository.save(ticket);
        res.status(200).json({ message: 'Verify ticket update success: ' + req.body.asset });
    }
    catch (err) {
        console.error("verifyTicket: ", err);
        res.status(500).send(err);
    }
}
