import axios from 'axios';
import type { NextApiRequest, NextApiResponse } from 'next'

// Define the Cardano Network
const network = "Custom";
//const KUPO_API = process.env.NEXT_PUBLIC_KUPO_API as string;
//const OGMIOS_API = process.env.NEXT_PUBLIC_OGMIOS_API as string;

const KUPO_API = "http://localhost:1442";
const OGMIOS_API = "ws://localhost:1337";

const baseURL = "http://localhost:8080";

// Create an interface to represent the blockfrost Utxo json structure
interface BlockfrostTransactions 
{
    tx_hash: string,
    tx_index: number,
    block_height: number,
    block_time: number
}[]

// Create an interface to represent the kupo Utxo structure
interface KupoTxs
{
  transaction_index: number,
  transaction_id: string,
  output_index: number,
  address: string,
  value: {
      coins: number,
      assets: {}
  },
  datum_hash: string,
  script_hash: string,
  created_at: {
      slot_no: number,
      header_hash: string
  },
  spent_at: string
}[]

const blockfrostTxs = async (txs: KupoTxs[]): Promise <BlockfrostTransactions[]> => {
  let txList = [] as any;
  txs.forEach((tx) => (
      txList.push({ 
        tx_hash: tx.transaction_id,
        tx_index: tx.transaction_index,
        block_height: tx.created_at.slot_no,   
        block_time: 0, // placeholder
        }
      )
    )
  )
  return txList as BlockfrostTransactions[];
}


const getTxs = async (address: string): Promise <BlockfrostTransactions[]> => {
  const api = "/matches/" + address + "/*";
  try {
    let res = await axios({
        baseURL: KUPO_API,
        url: api,
        method: 'get',
        timeout: 8000,
        headers: {
            'Content-Type': 'application/json'
        }
    })
    if(res.status == 200){
        return blockfrostTxs(res.data);
    } else {
      console.error("transactions:txs:getTxs Error: ", res);
      throw res.data;
    }   
  } catch (err) {
      console.error("transactions:txs:getTxs Failed: ", err);
      throw err;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse ) {

    const { address } = req.query;
    if (address) {
      try {
        const txs = await getTxs(address[0])
        console.log("v0:transactions:txs: ", JSON.stringify(txs));
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.status(200).send(txs);
        }
        catch (err) {
          res.status(500).json("getTransactions API error: " + err);
        }
    } else {
        res.status(500).json("no address provided");
    }
}