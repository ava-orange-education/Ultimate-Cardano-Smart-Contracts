import path from 'path';
import { promises as fs } from 'fs';
import type { NextApiRequest, NextApiResponse } from 'next'


export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse ) {

    //Find the absolute path of the json directory
    const configDirectory = path.join(process.cwd(), 'config');
    const fileContents = await fs.readFile(configDirectory + '/protocol-params-devnet.json', 'utf8');
    res.setHeader('Content-Type', 'application/json');
    res.send(fileContents.replace(/\s+/g,''));

}