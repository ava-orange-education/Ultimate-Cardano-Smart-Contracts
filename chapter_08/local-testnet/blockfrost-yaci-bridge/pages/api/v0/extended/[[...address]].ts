import axios from 'axios';
import type { NextApiRequest, NextApiResponse } from 'next'
import {Address, StakeAddress} from "@hyperionbt/helios";


// Define the Cardano Network
const network = "Custom";
//const KUPO_API = process.env.NEXT_PUBLIC_KUPO_API as string;
//const OGMIOS_API = process.env.NEXT_PUBLIC_OGMIOS_API as string;

const KUPO_API = "http://localhost:1442";
const OGMIOS_API = "ws://localhost:1337";

//const baseURL = process.env.NEXT_PUBLIC_KUPO_API as string;

const baseURL =  "http://localhost:8080";


// Create an interface to represent the Yaci Utxo json structure
interface YaciUtxos 
{
    tx_hash: string,
    output_index: bigint,  
    address: string,
    amount: 
      {
        unit: string,
        quantity: number
      }[]
    ,
    data_hash: string,
    inline_datum: string | undefined,
    reference_script_hash: string | undefined
}[]


interface BlockfrostAmountExtended
{
  unit: string,
  quantity: string,
  decimals: number,
  has_nft_onchain_metadata: boolean
}

interface BlockfrostAddressExtended
{
  address: string,
  amount: BlockfrostAmountExtended[],
  stake_address: string,
  type: string,
  script: boolean
} 


const blockfrostAddrExtended = async (utxos: YaciUtxos[]): Promise <BlockfrostAddressExtended> => {

  let amountList = [] as BlockfrostAmountExtended[];

  function addAmount (unit: string, qty: number) {
    const index = amountList.findIndex(el => el.unit === unit);
    if (index == -1) {
      amountList.push({
        unit: unit,
        quantity: qty.toString(),
        decimals: unit === 'lovelace' ? 6 : 0, // placeholder value
        has_nft_onchain_metadata: false // placeholder value
        })
    } else {
      amountList[index].quantity = (Number(amountList[index].quantity) + qty).toString();
    }
  }

  utxos.forEach((utxo) => (
    utxo.amount.forEach((value) => (
      addAmount(value.unit, value.quantity)
        )
      )
    )
  )
  const addr = new Address(utxos[0].address);
  const stakeAddr = StakeAddress.fromAddress(addr);
  
  return {
    address: utxos[0].address,
    amount: amountList as BlockfrostAmountExtended[],
    stake_address: stakeAddr.toBech32(),
    type: "shelley",
    script: false } as BlockfrostAddressExtended

}

const getAddressExtended = async (address: string): Promise <BlockfrostAddressExtended> => {
  const api = "/api/v1/addresses/" + address + "/utxos?order=desc&page=1&count=256"
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
        return blockfrostAddrExtended(res.data);
    } else {
      console.error("extended:addrEx:getAddressExtended Error: ", res);
      throw res.data;
    }   
  } catch (err) {
      console.error("extended:addrEx:getAddressExtended Failed: ", err);
      throw err;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse ) {

    const { address } = req.query;
    if (address) {
      try {
        const addrEx = await getAddressExtended(address[0])
        console.log("v0:extended:addrEx: ", JSON.stringify(addrEx));
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.status(200).send(addrEx);
        }
        catch (err) {
          res.status(500).json("getAddrEx API error: " + err);
        }
    } else {
        res.status(500).json("no address provided");
    }
}