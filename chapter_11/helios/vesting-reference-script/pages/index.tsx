import { promises as fs } from 'fs';
import type { NextPage } from 'next';
import Head from 'next/head';
import path from 'path';
import { useState, useEffect } from 'react';

import Cancel from '../components/Cancel';
import { 
  getNetworkParams,
  network 
} from '../contracts/off-chain/network';
import LoadingSpinner from '../components/LoadingSpinner';
import Lock from '../components/Lock';
import Unlock from '../components/Unlock';
import WalletConnector from '../components/WalletConnector';
import WalletInfo from '../components/WalletInfo';

import {
  Cip30Wallet,
  NetworkParams,
  WalletHelper} from "@hyperionbt/helios";

import { NetworkName } from '../contracts/off-chain/types'

import lock from '../contracts/off-chain/lock';
import unlock from '../contracts/off-chain/unlock';
import cancel from '../contracts/off-chain/cancel';


export async function getServerSideProps() {

  try {

    const contractDirectory = path.join(process.cwd(), 'contracts')
    const validatorScript = await fs.readFile(contractDirectory + '/validators/vesting.hl', 'utf8');
    return { props: { script: validatorScript.toString() } }
  
  } catch (err) {
    console.error('getServerSideProps error: ', err);
  } 
  // No script found found
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
      const cip30WalletAPI = new Cip30Wallet(walletAPI);
      const walletHelper = new WalletHelper(cip30WalletAPI);
      const balanceAmountValue = await walletHelper.calcBalance();
      
      // Extract the balance amount in lovelace
      const balanceAmount = balanceAmountValue.lovelace;
  
      // Format the balance as a locale string
      return balanceAmount.toLocaleString();
    
    } catch (error) {
      console.error('Error in getWalletBalance:', error);
      throw new Error('Failed to retrieve wallet balance. Please try again later.');
    }
  };

  const onLock = async () => {

    setIsLoading(true);

    if (!walletAPI) {
      throw console.error("walletAPI is not set");
    }
    try {

      const lockAda = 2_000_000n;     
      const cip30WalletAPI = new Cip30Wallet(walletAPI);

      // Read in the network parameter file
      const networkParamsJson = await getNetworkParams(network);
      const networkParams = new NetworkParams(networkParamsJson);

      const result = await lock({
        lockAmount: lockAda,
        wallet: cip30WalletAPI,
        params: networkParams,
        validator: props.script,
        network: { networkName: NetworkName.PREPROD, emulator: undefined }
      });

      if (result.status == 200) {
        setTx({ txId: result.txId! });
        setIsLoading(false);
      } else {
        setIsLoading(false);
        throw console.error("lock tx failed", result.msg);
      }

    } catch (err) {
        setIsLoading(false);
        throw console.error("lock tx failed", err);
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
      const cip30WalletAPI = new Cip30Wallet(walletAPI);
      const lockAda = 2_000_000n;
      
      // Read in the network parameter file
      const networkParamsJson = await getNetworkParams(network);
      const networkParams = new NetworkParams(networkParamsJson);

      const result = await unlock({
        lockAmount: lockAda,
        message: message,
        wallet: cip30WalletAPI,
        params: networkParams,
        validator: props.script,
        network: { networkName: NetworkName.PREPROD, emulator: undefined }
      });

      if (result.status == 200) {
        setTx({ txId: result.txId! });
        setIsLoading(false);
      } else {
        setIsLoading(false);
        throw console.error("unlock tx failed", result.msg);
      }
    } catch (err) {
        setIsLoading(false);
        throw console.error("unlock tx failed", err);
    }
  }

  const onCancel = async () => {

    if (!walletAPI) {
      throw console.error("walletAPI is not set");
    }
    setIsLoading(true);
    try {
      const cip30WalletAPI = new Cip30Wallet(walletAPI);
      const lockAda = 2_000_000n;
      
      // Read in the network parameter file
      const networkParamsJson = await getNetworkParams(network);
      const networkParams = new NetworkParams(networkParamsJson);

      const result = await cancel({
        lockAmount: lockAda,
        wallet: cip30WalletAPI,
        params: networkParams,
        validator: props.script,
        network: { networkName: NetworkName.PREPROD, emulator: undefined }
      });

      if (result.status == 200) {
        setTx({ txId: result.txId! });
        setIsLoading(false);
      } else {
        setIsLoading(false);
        throw console.error("Cancel tx failed", result.msg);
      }
    } catch (err) {
        setIsLoading(false);
        throw console.error("Cancel tx failed", err);
    }
  }
  
  return (
    <div className="bg-gray-100 min-h-screen">
      <Head>
        <title>Helios Tx Builder</title>
        <meta name="description" content="Helios Transaction Builder" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
  
      <main className="p-4">
        <h3 className="text-3xl font-semibold text-center mb-8">
          Helios Transaction Builder
        </h3>
  
        <div className="border border-gray-400 p-4 rounded">
          <WalletConnector onWalletAPI={setWalletAPI} />
        </div>
        { walletAPI && (
          <div className="border border-gray-400 p-4 rounded">
            <WalletInfo walletInfo={walletInfo}/> 
          </div> 
        )}
        
        {tx.txId && walletAPI && (
          <div className="border border-gray-400 p-4 rounded">
            <b className="font-bold">Transaction Success!!!</b>
            <p>
              TxId: &nbsp;&nbsp;
              <a
                href={`https://${network === "mainnet" ? "" : network + "."}cexplorer.io/tx/${tx.txId}`}
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
