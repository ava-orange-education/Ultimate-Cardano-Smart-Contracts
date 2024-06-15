import type { NextApiRequest, NextApiResponse } from 'next'

import { network } from '../../common/network';
import {
    Address,
    BlockfrostV0,
    MintingPolicyHash,
    TxInput, 
    hexToBytes} from "@hyperionbt/helios";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse ) {

    const getAssetUtxo = async (address: string,
                                asset: string): Promise<TxInput> => {
        const apiKey = process.env.BLOCKFROST_API_KEY as string;
        const blockfrostAPI = new BlockfrostV0(network, apiKey);
        const utxos = await blockfrostAPI.getUtxos(
                                        Address.fromBech32(address));   
        if (utxos.length < 1) {
            throw console.error("No UTXOs found at " + address);
        }  
        const mph = MintingPolicyHash.fromHex(asset.slice(0,56));
        const tn = hexToBytes(asset.slice(56));
        
        const utxo = utxos.find(utxo => utxo.value.assets.has(mph, tn));
        if (utxo) {
            return utxo;
        } else {
            throw console.error("No UTXO with asset found at " + address);
        }
        
    }
    try {
        const txInput = await getAssetUtxo(req.body.addr, req.body.asset);
        res.status(200).send(txInput.toFullCbor());
    }
    catch (err) {
        res.status(500).json("getAssetUtxo API error: " + err);
    }
}
