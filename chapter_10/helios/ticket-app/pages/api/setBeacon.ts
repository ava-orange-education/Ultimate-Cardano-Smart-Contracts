import type { NextApiRequest, NextApiResponse } from 'next';
import { beaconRepository } from '../../schema/beacon'
import { Entity } from "redis-om"


export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {

  try {
        let beacon = await beaconRepository.search()
          .where('beaconMPH').eq(req.body.beaconMPH)
          .return.first() as Entity;

        if (beacon && beacon.beaconTN) {
          // Update beacon mph with new beacon tn
          let beaconTN = beacon.beaconTN as string[];
          beacon.beaconTN = [...beaconTN, req.body.beaconMPH]
          await beaconRepository.save(beacon);
        } else {
          // Stake key does not exist so add it with the new asset
          await beaconRepository.save({
            beaconMPH: req.body.beaconMPH,
            beaconTN: [req.body.beaconTN]
          })
        }
        
        res.status(200).json({ message: 'Beacon token updated succesfully: ' + req.body.beaconMPH + req.body.beaconTN });
    }
    catch (err) {
        console.error("setBeacon: ", err);
        res.status(500).send(err);
    }
}
