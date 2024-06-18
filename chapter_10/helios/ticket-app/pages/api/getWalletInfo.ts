import type { NextApiRequest, NextApiResponse } from 'next'
import { BlockFrostAPI } from '@blockfrost/blockfrost-js';
import {    bytesToText,
            hexToBytes} from '@hyperionbt/helios'; 
import { 
    AssetInfo,
    WalletInfo
 } from '../../common/types';      

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse ) {

    const getWalletInfo = async ( address: string) : Promise<WalletInfo> => {

        const apiKey : string = process.env.BLOCKFROST_API_KEY as string;
        const API = new BlockFrostAPI({
            projectId: apiKey
          });

        // Call blockfrost API to get assets at the wallet address
        const addrInfo = await API.addresses(address);
        let lovelace = 0;
        let assets = [] as AssetInfo[];

        addrInfo.amount.forEach(({unit, quantity}) => {

            if (unit.length > 56) {
                assets.push({   
                    asset: unit,
                    mph: unit.slice(0,56),
                    // don't include cip-68 label so start slice at 64
                    tn: bytesToText(hexToBytes(unit.slice(64))), 
                    qty: Number(quantity)
                })
            } else {
                lovelace += Number(quantity)
            }
        })                  
                             
       return ({
            addr: address,
            stakeAddr: addrInfo.stake_address,
            lovelace: lovelace,
            assets: assets
       })
    }

    try {
        // TODO - sanitize inputs
        const addrAssetsInfo = await getWalletInfo(req.body.addr)
        res.status(200).send(addrAssetsInfo);
    }
    catch (err) {
        console.error("getWalletAssets: ", err);
        //res.status(200).send(addrAssetsInfo);
        res.status(200).send({
            addr: req.body.addr,
            stakeAddr: null,
            assets: []
        });
    }
}