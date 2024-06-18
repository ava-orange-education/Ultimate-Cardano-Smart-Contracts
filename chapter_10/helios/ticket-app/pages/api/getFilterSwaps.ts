import { NextApiRequest, NextApiResponse } from 'next';
import { swapRepository } from '../../schema/swap';

async function dynamicQuery(criteria: Record<string, any>) {
  let query = swapRepository.search();
  for (const [key, value] of Object.entries(criteria)) {
    if (key === "offeredAsset" || key === "askedAsset") {
      query = query.where(key).equals(value);
    }
    if (key === "offeredAssetQty") {
      query = query.where(key).gte(value);
    }
    if (key === "askedAssetQty") {
      query = query.where(key).lte(value);
    }
    if (key === "startDate") {
      const time = (new Date(value)).getTime();
      query = query.where('deadline').gte(time);
    }
    if (key === "endDate") {
      const time = (new Date(value)).getTime();
      query = query.where('deadline').lte(time);
    }
    if (key === "text") {
      query = query.where('name').matches(value)
                    .or('location').matches(value)
                    .or('description').matches(value);
    }
  }
  const results = await query.where('active').eq(true).all();
  return results;
}

export default async function handler(req: NextApiRequest, 
                                      res: NextApiResponse) {
  const allowedFields = [
    'offeredAsset', 
    'askedAsset', 
    'offeredAssetQty',
    'askedAssetQty',
    'startDate',
    'endDate',
    'text'
  ];
  if (req.method === 'POST') {
    try {
      let query = {};
      for (const key in req.body.filter) {
        if (Object.prototype.hasOwnProperty.call(req.body.filter, key)) {
            if (allowedFields.includes(key) && req.body.filter[key] !== '') {
                query = {
                  ...query,
                  [key]: req.body.filter[key]
                }
            }
        }
      } 
      const swaps = await dynamicQuery(query);
      res.status(200).send(swaps);  
    } catch (err) {
      res.status(400).json({ message: 'No swaps found', err });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
