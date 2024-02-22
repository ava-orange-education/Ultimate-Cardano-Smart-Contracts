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

interface BlockfrostAmount
{
  unit: string,
  quantity: string
}

interface BlockfrostAddress
{
  address: string,
  amount: BlockfrostAmount[],
  stake_address: string,
  type: string,
  script: boolean
} 


const blockfrostAddr = async (utxos: YaciUtxos[]): Promise <BlockfrostAddress> => {

  let amountList = [] as BlockfrostAmount[];

  function addAmount (unit: string, qty: number) {
    const index = amountList.findIndex(el => el.unit === unit);
    if (index == -1) {
      amountList.push({
        unit: unit,
        quantity: qty.toString()
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
    amount: amountList as BlockfrostAmount[],
    stake_address: stakeAddr.toBech32(),
    type: "shelley",
    script: false } as BlockfrostAddress

}

const getAddress = async (address: string,
                          page: string,
                          order: string,
                          count: string): Promise <BlockfrostAddress> => {
  const api = "/api/v1/addresses/" + address + 
              "/utxos?page=" + page + 
              "&order=" + order + 
              "&count=" + count;
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
        return blockfrostAddr(res.data);
    } else {
      console.error("address:addr:getAddress: Error: ", res);
      throw res.data;
    }   
  } catch (err) {
      console.error("address:addr:getAddress: Failed: ", err);
      throw err;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse ) {

    const { address } = req.query;
    const page = req.query.page ? req.query.page : '1'; 
    const order = req.query.order ? req.query.order :'desc';
    const count = req.query.count ? req.query.count : '100';
    if (address) {
      try {
        const addr = await getAddress(address as string,
                                      page as string,
                                      order as string,
                                      count as string)
        console.log("v0:address:addr: ", JSON.stringify(addr));
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.status(200).send(addr);
        }
        catch (err) {
          res.status(500).json("getAddress API error: " + err);
        }
    } else {
        res.status(500).json("no address provided");
    }
}