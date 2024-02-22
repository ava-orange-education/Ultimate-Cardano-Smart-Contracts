import axios from 'axios';
import type { NextApiRequest, NextApiResponse } from 'next'
import {  hexToBytes,
          bytesToText } from '@hyperionbt/helios';

//const baseURL = process.env.NEXT_PUBLIC_KUPO_API as string;
const KUPO_API = "http://localhost:1442";
const OGMIOS_API = "ws://localhost:1337";

//const baseURL = process.env.NEXT_PUBLIC_KUPO_API as string;

const baseURL =  "http://localhost:8080";


interface BlockfrostMetadata 
{
  asset: string,
  policy_id: string,
  asset_name: string,
  fingerprint: string,
  quantity: string,
  initial_mint_tx_hash: string,
  mint_or_burn_count: number,
  onchain_metadata: {},
  onchain_metadata_standard: string,
  onchain_metadata_extra: string,
  metadata: {
    name: string,
    description: string,
    ticker: string,
    url: string,
    logo: string,
    decimals: number
  }
}

interface YaciAssetInfo
{
  block_number: number,
  block_time: number,
  slot: number,
  tx_hash: string,
  policy: string,
  asset_name: string,
  unit: string,
  fingerprint: string,
  quantity: number,
  mint_type: string
}[]


const getTransaction = async (asset: string): Promise <any> => {
  const api = "/matches/" + asset.slice(0,56) + "." + asset.slice(56) + "?order=oldest_first";
  try {
    let res = await axios({
        baseURL: KUPO_API ,
        url: api,
        method: 'get',
        timeout: 8000,
        headers: {
            'Content-Type': 'application/json'
        }
    })
    if(res.status == 200){
        return res.data;
    } else {
      console.error("getTransaction Error: ", res);
      throw res.data;
    }   
  } catch (err) {
      console.error("getTransaction Failed: ", err);
      throw err;
  }
}

const getMetadata = async ( slot_num: number,
                            transaction_id: string): Promise <any> => {

  const api = "/metadata/" + slot_num + "?" + transaction_id; 
  try {
    let res = await axios({
        baseURL: KUPO_API ,
        url: api,
        method: 'get',
        timeout: 8000,
        headers: {
            'Content-Type': 'application/json'
        }
    })
    if(res.status == 200){
        return res.data;
    } else {
      console.error("getTicketMetadata Error: ", res);
      throw res.data;
    }   
  } catch (err) {
      console.error("getTicketMetadata Failed: ", err);
      throw err;
  }
}


const getAssetInfo = async (asset: string): Promise <YaciAssetInfo[]> => {
  //const api = "/matches/" + asset.slice(0,56) + "." + asset.slice(56) + "?order=oldest_first";
  const api = "/api/v1/assets/txs/unit/" + asset;
  try {
    let res = await axios({
        baseURL: baseURL,
        url: api,
        method: 'get',
        timeout: 8000,
        headers: {
            'Content-Type': 'application/json'
        }
    })
    if(res.status == 200){
        return res.data;
    } else {
      console.error("getAssetInfo Error: ", res);
      throw res.data;
    }   
  } catch (err) {
      console.error("getAssetInfo Failed: ", err);
      throw err;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse ) {

    const getTicketMetadata = async (asset: string): Promise<BlockfrostMetadata> => {

        // Call Kupo API to first get the transaction id of the mint
        const transaction = await getTransaction(asset);

        // Now call Kupo API to get the metadata using the mint tx
        const metadata = await getMetadata( transaction[0].created_at.slot_no,
                                            transaction[0].transaction_id);
        try {
                                
          const name =        metadata[0].schema['721'].map[0].v.map[0].k.string as string;
          const description = metadata[0].schema['721'].map[0].v.map[0].v.map[3].v.string as string;
          const image =       metadata[0].schema['721'].map[0].v.map[0].v.map[4].v.string as string;
          const qty =         metadata[0].schema['721'].map[0].v.map[0].v.map[6].v.string as string;
          const utxoId =      metadata[0].schema['721'].map[0].v.map[0].v.map[7].v.string as string;
          const utxoIdx =     metadata[0].schema['721'].map[0].v.map[0].v.map[8].v.string as string;
          
          const assetInfo = await getAssetInfo(asset);
          
          const txMetadata =
          {
            asset: asset,
            policy_id: asset.length > 56 ? asset.slice(0,56): '',
            asset_name: asset.length > 56 ? bytesToText(hexToBytes(asset.slice(56))): asset,
            fingerprint: assetInfo[0].fingerprint,
            quantity: assetInfo[0].quantity.toString(),
            initial_mint_tx_hash: assetInfo[0].tx_hash,
            mint_or_burn_count: assetInfo[0].quantity, //placeholder value
            onchain_metadata: {
              name: name,
              description: description,
              image: image,
              qty: qty,
              utxoId: utxoId,
              utxoIdx: utxoIdx },
            onchain_metadata_standard: "CIP25v2",
            onchain_metadata_extra: "",
            metadata: { // should come from token registry, but will hard code for devnet
              name: name,
              description: description,
              ticker: "devnet",
              url: "devnet.com",
              logo: "devnet",
              decimals: 0 
            }
          } as BlockfrostMetadata

        return txMetadata;
        } catch (e) {
          console.error("Error: getTicketMetadata: e: ", e);
          return {} as BlockfrostMetadata;
        }
    }
    try {
        // TODO - sanitize inputs
        const { asset } = req.query;
        console.log("api/v0/assets/asset: ", asset![0]);
        const ticketInfo = await getTicketMetadata(asset![0])
        res.status(200).send(ticketInfo);
    }
    catch (err) {
        res.status(500).json("getTicketMetadata API error: " + err);
    }
}