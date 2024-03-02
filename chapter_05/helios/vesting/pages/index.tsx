import type { NextPage } from 'next';
import Head from 'next/head'
import { useState, useEffect } from "react";

import LoadingSpinner from '../components/LoadingSpinner';
import Lock from '../components/Lock';
import { getNetworkParams } from '../common/network';
import VestingValidator from '../contracts/vesting.hl';
import WalletConnector from '../components/WalletConnector'
import WalletInfo from '../components/WalletInfo'

import {
  Address,
  Cip30Wallet,
  Datum,
  NetworkParams,
  Value,
  TxOutput,
  Tx,
  WalletHelper} from "@hyperionbt/helios";

// Define the Cardano Network
const network = "preprod";

// Optimization flag for Helios compiler
const optimize = false;

const Home: NextPage = () => {

  const [isLoading, setIsLoading] = useState(false);
  const [tx, setTx] = useState({ txId : '' });
  const [walletAPI, setWalletAPI] = useState<undefined | any>(undefined);
  const [walletInfo, setWalletInfo] = useState({ 
      balance : ''
    });

  useEffect(() => {

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

    const updateWalletInfo = async () => {

        if (walletAPI) {
            const balance = await getWalletBalance() as string;
            setWalletInfo({
              balance : balance
            });
        } else {
          // Zero out wallet info if no walletAPI is present
          setWalletInfo({
            balance : ''
          })
        }
    }
    updateWalletInfo();
  }, [walletAPI]);

  const lock = async () => {

    setIsLoading(true);

    if (!walletAPI) {
      throw console.error("walletAPI is not set");
    }
    try {
      const cip30WalletAPI = new Cip30Wallet(walletAPI);
      const walletHelper = new WalletHelper(cip30WalletAPI);
      const minAda : number = 2_000_000; // minimum lovelace to send
      const minAdaVal = new Value(BigInt(minAda));

      // Get wallet UTXOs
      const utxos = await walletHelper.pickUtxos(minAdaVal);

      // Get change address
      const changeAddr = await walletHelper.changeAddress;

      // Start building the transaction
      const tx = new Tx();

      // Add the UTXO as inputs
      tx.addInputs(utxos[0]);

      // Load in the vesting validator script (program)
      const vestingProgram = new VestingValidator();

      // Compile the vesting validator
      const compiledProgram = vestingProgram.compile(optimize);

      // Construct the vesting datum
      const vestingDatum = new (vestingProgram.types.Datum)(
        changeAddr.pubKeyHash
      )
      
      // Construct the output to send the minAda
      // and the inline datum to the script address
      tx.addOutput(new TxOutput(
        Address.fromHashes(compiledProgram.validatorHash),
        new Value(minAdaVal.lovelace),
        Datum.inline(vestingDatum)
      ));

      // Read in the network parameter file
      const networkParamsJson = await getNetworkParams(network);
      const networkParams = new NetworkParams(networkParamsJson);

      // Send any change back to the buyer
      await tx.finalize(networkParams, changeAddr, utxos[1]);

      // Sign the unsigned tx to get the witness
      const signatures = await cip30WalletAPI.signTx(tx);
      tx.addSignatures(signatures);

      // Submit the signed tx
      const txHash = await cip30WalletAPI.submitTx(tx);

      setTx({ txId: txHash.hex });
      setIsLoading(false);

    } catch (err) {
        setIsLoading(false);
        throw console.error("submit tx failed", err);
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
            <Lock onLock={lock}/> 
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
