import type { NextApiRequest, NextApiResponse } from 'next'

import { network } from '../../contracts/off-chain/network';
import {
    Address,
    BlockfrostV0,
    TxInput } from "@hyperionbt/helios";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse ) {

    const getVestingUtxo = async (vestingValidatorAddr: string): Promise<TxInput> => {
        const apiKey = process.env.NEXT_PUBLIC_BLOCKFROST_API_KEY as string;
        const blockfrostAPI = new BlockfrostV0(network, apiKey);
        const vestingUTXOs = await blockfrostAPI.getUtxos(
                                        Address.fromBech32(vestingValidatorAddr));     
        if (vestingUTXOs.length == 0) {
            throw console.error("No reference script found at vesting address: ",
                                 vestingValidatorAddr);
        
        }  
        
        return vestingUTXOs[0]; 

    }
    try {
        const txInput = await getVestingUtxo(req.body.addr);
        res.status(200).send(txInput.toFullCbor());
    }
    catch (err) {
        res.status(500).json("getVestingRefUtxo API error: " + err);
    }
}
