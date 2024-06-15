import { promises as fs } from 'fs';
import Head from 'next/head'
import type { NextPage } from 'next';
import { useState, useEffect } from 'react';
import path from 'path';

import Cancel from '../components/Cancel';
import LoadingSpinner from '../components/LoadingSpinner';
import Lock from '../components/Lock';
import Unlock from '../components/Unlock';
import WalletConnector from '../components/WalletConnector';
import WalletInfo from '../components/WalletInfo';

import lock from '../contracts/off-chain/lock';
import unlock from '../contracts/off-chain/unlock';
import cancel from '../contracts/off-chain/cancel';

import { 
  Blockfrost,
  C, 
  Lucid,
  SpendingValidator } from "lucid-cardano"; 

// Define the Cardano Network
const network = "Preprod";
const blockfrostAPI = process.env.NEXT_PUBLIC_BLOCKFROST_API as string;
const blockfrostAPIKey = process.env.NEXT_PUBLIC_BLOCKFROST_API_KEY as string;

// Create lucid object and connect it to a blockfrost provider
const lucid = await Lucid.new(
  new Blockfrost(blockfrostAPI, blockfrostAPIKey),
  network,
);

export async function getServerSideProps() {

  try {
    //Find the absolute path of the contracts directory
    const contractDirectory = path.join(process.cwd(), 'contracts');
    
    // Validator script
    const blueprintFile = await fs.readFile(contractDirectory + '/plutus.json', 'utf8');
    const blueprintString = blueprintFile.toString(); 
    return { props: { blueprint: blueprintString } }
  
  } catch (err) {
    console.error('getServerSideProps error: ', err);
  } 
  // No valid blueprint found
  return { props: {} };
}

const Home: NextPage = (props: any) => {

  const [isLoading, setIsLoading] = useState(false);
  const [tx, setTx] = useState({ txId : '' });
  const [walletAPI, setWalletAPI] = useState<undefined | any>(undefined);
  const [walletInfo, setWalletInfo] = useState({ 
      balance : '',
      addr : ''
    });

  useEffect(() => {
    const updateWalletInfo = async () => {

        if (walletAPI) {
            const _balance = await getWalletBalance() as string;
            setWalletInfo({
              ...walletInfo,
              balance : _balance
            });
        } else {
          // Zero out wallet info if no walletAPI is present
          setWalletInfo({
            balance : '',
            addr : ''
          })
        }
    }
    updateWalletInfo();
  }, [walletAPI]);

  // Calculate the wallet balance
  const getWalletBalance = async () => {
    try {

      // Get the wallet balance from the wallet API
      const balanceCBORHex = await walletAPI.getBalance();
      
      // Extract the balance amount in lovelace
      const balanceAmount : C.BigNum = C.Value.from_bytes(Buffer.from(balanceCBORHex, "hex")).coin();
      const walletBalance : BigInt = BigInt(balanceAmount.to_str());
      return walletBalance.toLocaleString();
    
    } catch (error) {
      console.error('Error in getWalletBalance:', error);
      throw new Error('Failed to retrieve wallet balance. Please try again later.');
    }
  };

  // Read the validator script from the filesystem
  async function readValidator(): Promise<SpendingValidator> {
    const validator = JSON.parse(props.blueprint).validators[0];
    return {
      type: "PlutusV2",
      script: validator.compiledCode,
    };
  }
    
  const onLock = async () => {
    
    if (!walletAPI) {
      throw console.error("walletAPI is not set");
    }
    setIsLoading(true);
    try {
      // Lock 2 Ada at the script address
      const lovelace = BigInt(2_000_000);
      lucid.selectWallet(walletAPI);

      // Read in the validator script and determine the script address
      const validator = await readValidator();

      const result = await lock({
        lovelace: lovelace,
        lucid: lucid,
        validator: validator
      })

      if (result.status == 200) {
        setTx({ txId: result.txId! });
        setIsLoading(false);
      } else {
        setIsLoading(false);
        throw console.error("lock tx failed ", result.msg);
      }
    } catch (err) {
      setIsLoading(false);
      throw console.error("lock tx failed ", err);
    }
  }

  const onUnlock = async (params: any) => {
    
    if (params[0].length < 1 ){
      throw console.error("No redeemer message was provided");
    }
    const message = params[0] as string;

    if (!walletAPI) {
      throw console.error("walletAPI is not set");
    }
    setIsLoading(true);
    try {
      lucid.selectWallet(walletAPI);

      // Read in the validator script and determine the script address
      const validator = await readValidator();

      const result = await unlock({
        message: message,
        lucid: lucid,
        validator: validator
      })

      if (result.status == 200) {
        setTx({ txId: result.txId! });
        setIsLoading(false);
        console.log("tx: ", result.msg);
      } else {
        setIsLoading(false);
        throw console.error("Unlock tx failed: ", result.msg);
      }
    } catch (err) {
      setIsLoading(false);
      throw console.error("Unlock tx failed ", err);
    }
  }

  const onCancel = async () => {

    if (!walletAPI) {
      throw console.error("walletAPI is not set");
    }
    setIsLoading(true);
    try {
      lucid.selectWallet(walletAPI);

      // Read in the validator script and determine the script address
      const validator = await readValidator();
      
      const result = await cancel({
        lucid: lucid,
        validator: validator
      })

      if (result.status == 200) {
        setTx({ txId: result.txId! });
        setIsLoading(false);
        console.log("tx: ", result.msg);
      } else {
        setIsLoading(false);
        throw console.error("Cancel tx failed: ", result.msg);
      }

    } catch (err) {
      setIsLoading(false);
      throw console.error("Cancel tx failed", err);
    }
  }

  return (
    <div className="bg-gray-100 min-h-screen">
      <Head>
        <title>Lucid Tx Builder</title>
        <meta name="description" content="Lucid Transaction Builder" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
  
      <main className="p-4">
        <h3 className="text-3xl font-semibold text-center mb-8">
          Lucid Transaction Builder
        </h3>
  
        <div className="border border-gray-400 p-4 rounded">
          <WalletConnector onWalletAPI={setWalletAPI} />
        </div>
        { walletAPI && (
          <div className="border border-gray-400 p-4 rounded">
            <WalletInfo walletInfo={walletInfo}/> 
          </div> 
        )}
        {tx.txId && (
          <div className="border border-gray-400 p-4 rounded">
            <b className="font-bold">Transaction Success!!!</b>
            <p>
              TxId: &nbsp;&nbsp;
              <a
                href={"https://"+network+".cexplorer.io/tx/" + tx.txId}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 underline text-xs"
              >
                {tx.txId}
              </a>
            </p>
            <p className="mt-2">Please wait until the transaction is confirmed on the blockchain and reload this page before doing another transaction</p>
          </div>
        )}
        { walletAPI && !tx.txId && !isLoading && (
          <div className="border border-gray-400 p-4 rounded">
            <Lock onLock={onLock}/> 
          </div> 
        )}
        { walletAPI && !tx.txId && !isLoading && (
          <div className="border border-gray-400 p-4 rounded">
            <Unlock onUnlock={onUnlock}/> 
          </div> 
        )}
        { walletAPI && !tx.txId && !isLoading && (
          <div className="border border-gray-400 p-4 rounded">
            <Cancel onCancel={onCancel}/> 
          </div> 
        )}
        { isLoading && (
          <div className="border border-gray-400 p-4 rounded">
            <LoadingSpinner /> 
          </div> 
        )}
        
      </main>
      <footer>
        {/* Footer content */}
      </footer>
    </div>
  );
}

export default Home
