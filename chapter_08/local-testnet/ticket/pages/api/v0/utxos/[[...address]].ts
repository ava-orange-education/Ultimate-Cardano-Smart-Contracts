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


// Create an interface to represent the Yaci Utxo json structure
interface YaciUtxos 
{
    address: string,
    tx_hash: string,
    output_index: bigint,
    amount: 
      {
        unit: string,
        quantity: number // note this is a number and not a string
      }[]
    ,
    block: string,
    data_hash: string,
    inline_datum: string | undefined,
    reference_script_hash: string | undefined
}[]

interface BlockfrostAmount
{
  unit: string,
  quantity: string
}

// Create an interface to represent the blockfrost Utxo json structure
interface BlockfrostUtxos
{
    address: string,
    tx_hash: string,
    output_index: bigint,
    amount: BlockfrostAmount[],
    block: string,
    data_hash: string,
    inline_datum: string | undefined,
    reference_script_hash: string | undefined
}[]

const blockfrostUtxos = async (utxos: YaciUtxos[]): Promise <BlockfrostUtxos[]> => {
 
  let amountList = [] as BlockfrostAmount[];
  let utxoList = [] as BlockfrostUtxos[];
  utxos.forEach((utxo) => (
    amountList = [] as BlockfrostAmount[],
    utxo.amount.forEach((value) => (
      amountList.push({
          unit: value.unit,
          quantity: value.quantity.toString(), // make sure this is a string
          } as BlockfrostAmount)
        )
      ),
      utxoList.push({ 
        address: utxo.address,
        tx_hash: utxo.tx_hash,
        output_index: utxo.output_index,
        amount: amountList,
        block: utxo.block,
        data_hash: utxo.block,
        inline_datum: utxo.inline_datum,
        reference_script_hash: utxo.reference_script_hash
        })
    )
  )
  return utxoList as BlockfrostUtxos[];
}

const getBlockfrostUtxos = async (address: string,
                          page: string,
                          order: string,
                          count: string): Promise <BlockfrostUtxos[]> => {
  
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
      return blockfrostUtxos(res.data);
    } else {
      console.error("address:utxos:getBlockfrostUtxos Error: ", res);
      throw res.data;
    }   
  } catch (err) {
      console.error("address:utxos:getBlockfrostUtxos Failed: ", err);
      throw err;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse ) {

    const { address } = req.query;
    const page = req.query.page ? req.query.page : '1'; 
    const order = req.query.order ? req.query.order :'asc';
    const count = req.query.count ? req.query.count : '100';
    if (address) {
      try {
        const addr = await getBlockfrostUtxos(address[0], page as string, order as string, count as string)
        console.log("v0:address:utxos: ", JSON.stringify(addr));
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.status(200).send(addr);
        }
        catch (err) {
          res.status(500).json("getUtxos API error: " + err);
        }
    } else {
        res.status(500).json("no address provided");
    }
}