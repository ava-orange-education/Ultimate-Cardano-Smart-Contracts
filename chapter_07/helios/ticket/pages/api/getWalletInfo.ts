import type { NextApiRequest, NextApiResponse } from 'next'
import { BlockFrostAPI } from '@blockfrost/blockfrost-js';
import {    bytesToText,
            hexToBytes} from '@hyperionbt/helios';       


import { WalletInfo } from '../../common/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse ) {

    const getWalletInfo = async ( address: string) : Promise<WalletInfo> => {

        const apiKey = process.env.BLOCKFROST_KEY as string;
        if (!apiKey) {
            throw console.log("BLOCKFROST_KEY not set");
          }
        const API = new BlockFrostAPI({
            projectId: apiKey
          });

        // Call blockfrost API to get assets at the wallet address
        const addrInfo = await API.addresses(address);
        let balance = [] as any;

        addrInfo.amount.forEach(({unit, quantity}) =>

               // Check to see if the unit is lovelace, if not
               // then slice out the policy id and token name
               balance.push({mph: unit.length > 56 ? unit.slice(0,56): '',
                             tn: unit.length > 56 ? bytesToText(hexToBytes(unit.slice(56))): unit,
                             qty: quantity}))
                             

        const walletInfo = new WalletInfo(
            address,
            balance
        );
       return walletInfo;
    }

    try {
        // TODO - sanitize inputs
        const walletInfo = await getWalletInfo(req.body.addr)
        res.status(200).send(walletInfo);
    }
    catch (err) {
        res.status(500).json("getWalletInfo API error: " + err);
    }
}