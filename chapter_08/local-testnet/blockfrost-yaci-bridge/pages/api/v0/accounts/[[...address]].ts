import axios from 'axios';
import type { NextApiRequest, NextApiResponse } from 'next'


// Define the Cardano Network
const network = "Custom";
//const KUPO_API = process.env.NEXT_PUBLIC_KUPO_API as string;
//const OGMIOS_API = process.env.NEXT_PUBLIC_OGMIOS_API as string;

const KUPO_API = "http://localhost:1442";
const OGMIOS_API = "ws://localhost:1337";

//const baseURL = process.env.NEXT_PUBLIC_KUPO_API as string;

const baseURL =  "http://localhost:8080";



interface BlockfrostAccount
{
  stake_address: string,
  active: boolean,
  active_epoch: number,
  controlled_amount: string,
  rewards_sum: string,
  withdrawals_sum: string,
  reserves_sum: string,
  treasury_sum: string,
  withdrawable_amount: string,
  pool_id: string
}

// Create an interface to represent the kupo Utxo structure
interface KupoUtxos
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


const blockfrostAccount = async (address: string, utxos: KupoUtxos[]): Promise <BlockfrostAccount> => {

  let totalStakeAmt = 0;
  utxos.forEach((utxo) => {
    totalStakeAmt += utxo.value.coins;
    }
  )

  return {
    stake_address: address,
    active: utxos.length > 0 ? true: false,
    active_epoch: 0, // placeholder
    controlled_amount: totalStakeAmt.toString(),
    rewards_sum: '', // placeholder
    withdrawals_sum: '', // placeholder
    reserves_sum: '', // placeholder
    treasury_sum: '', // placeholder
    withdrawable_amount: '', // placeholder
    pool_id: '', // placeholder
  } as BlockfrostAccount

}

const getAccount = async (address: string): Promise <BlockfrostAccount> => {
  const api = "/matches/" + address;
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
        return blockfrostAccount(address, res.data);
    } else {
      console.error("getUtxos Error: ", res);
      throw res.data;
    }   
  } catch (err) {
      console.error("getUtxos Failed: ", err);
      throw err;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse ) {

    const { address } = req.query
    if (address) {
      try {
        const account = await getAccount(address[0])
        console.log("v0:accounts:account: ", JSON.stringify(account));
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.status(200).send(account);
        }
        catch (err) {
          res.status(500).json("getAccounts API error: " + err);
        }
    } else {
        res.status(500).json("no address provided");
    }
}