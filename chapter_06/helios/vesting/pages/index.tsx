import type { NextPage } from 'next';
import Head from 'next/head'
import { useState, useEffect } from "react";

import Cancel from '../components/Cancel';
import LoadingSpinner from '../components/LoadingSpinner';
import Lock from '../components/Lock';
import { 
  getNetworkParams,
  getVestingUtxo,
  network 
} from '../common/network';
import Unlock from '../components/Unlock';
import VestingValidator from '../contracts/vesting.hl';
import WalletConnector from '../components/WalletConnector';
import WalletInfo from '../components/WalletInfo';

import {
  Address,
  Cip30Wallet,
  Datum,
  NetworkParams,
  Value,
  TxOutput,
  Tx,
  WalletHelper} from "@hyperionbt/helios";


// Optimization flag for Helios compiler
const optimize = true;

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
            const _balance = await getWalletBalance() as string;
            setWalletInfo({
              balance : _balance
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

  const unlock = async (params: any) => {

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
      const walletHelper = new WalletHelper(cip30WalletAPI);
      const minAda : number = 2_000_000; // minimum lovelace to send
      const minAdaVal = new Value(BigInt(minAda));

      // Get wallet UTXOs
      const utxos = await walletHelper.pickUtxos(minAdaVal);

      // Get change address
      const changeAddr = await walletHelper.changeAddress;

      // Get receiving address(es)
      const receivingAddr = await walletHelper.allAddresses;

      // Start building the transaction
      const tx = new Tx();

      // Add the UTXO as inputs
      tx.addInputs(utxos[0]);

      // Load in the vesting validator script (program)
      const vestingProgram = new VestingValidator();

      // Compile the vesting validator
      const vestingCompiledProgram = vestingProgram.compile(optimize);

      // Add the script as a witness to the transaction
      tx.attachScript(vestingCompiledProgram);

      // Get the UTXO(s) locked at the vesting contract (if any)
      const vestingUtxo = await getVestingUtxo(
                          Address.fromHashes(vestingCompiledProgram.validatorHash));

      // Create the vesting claim redeemer
      const vestingRedeemer = (new vestingProgram .types.Redeemer.Claim(message))
                              ._toUplcData();
      
      // Check that UTXO input exists
      if (vestingUtxo) {
        tx.addInput(vestingUtxo, vestingRedeemer);  
      } else {
        throw console.error("No UTXOs found at vesting contract address: ",
                            Address.fromHashes(vestingCompiledProgram.validatorHash)
                            .toBech32);
      }
      
      // Construct the output to send the unlocked funds to
      tx.addOutput(new TxOutput(
        receivingAddr[0], // send to the frist receiving address
        new Value(minAdaVal.lovelace)
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

  const cancel = async () => {

    if (!walletAPI) {
      throw console.error("walletAPI is not set");
    }
    setIsLoading(true);
    try {
      const cip30WalletAPI = new Cip30Wallet(walletAPI);
      const walletHelper = new WalletHelper(cip30WalletAPI);
      const minAda : number = 2_000_000; // minimum lovelace to send
      const minAdaVal = new Value(BigInt(minAda));

      // Get wallet UTXOs
      const utxos = await walletHelper.pickUtxos(minAdaVal);

      // Get change address
      const changeAddr = await walletHelper.changeAddress;

      // Get receiving address(es)
      const receivingAddr = await walletHelper.allAddresses;

      // Start building the transaction
      const tx = new Tx();

      // Add the UTXO as inputs
      tx.addInputs(utxos[0]);

      // Load in the vesting validator script (program)
      const vestingProgram = new VestingValidator();

      // Compile the vesting validator
      const vestingCompiledProgram = vestingProgram.compile(optimize);

      // Add the script as a witness to the transaction
      tx.attachScript(vestingCompiledProgram);

      // Get the UTXO(s) locked at the vesting contract (if any)
      const vestingUtxo = await getVestingUtxo(
                          Address.fromHashes(vestingCompiledProgram.validatorHash));

      // Create the vesting claim redeemer
      const vestingRedeemer = (new vestingProgram .types.Redeemer.Cancel())
                              ._toUplcData();
      
      // Check that UTXO input exists
      if (vestingUtxo) {
        tx.addInput(vestingUtxo, vestingRedeemer);  
      } else {
        throw console.error("No UTXOs found at vesting contract address: ",
                            Address.fromHashes(vestingCompiledProgram.validatorHash)
                            .toBech32);
      }
      
      // Construct the output to send the unlocked funds to
      tx.addOutput(new TxOutput(
        receivingAddr[0], // send to the frist receiving address
        new Value(minAdaVal.lovelace)
      ));

      // Add the public key hash as a required signer to the transaction
      tx.addSigner(receivingAddr[0].pubKeyHash!)

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
            <Lock onLock={lock}/> 
          </div> 
        )}
        { walletAPI && !tx.txId && !isLoading && (
          <div className="border border-gray-400 p-4 rounded">
            <Unlock onUnlock={unlock}/> 
          </div> 
        )}
        { walletAPI && !tx.txId && !isLoading && (
          <div className="border border-gray-400 p-4 rounded">
            <Cancel onCancel={cancel}/> 
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
