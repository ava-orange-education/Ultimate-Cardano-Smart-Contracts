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

import { 
  fromText, 
  getAddressDetails,
  Lucid, 
  SpendingValidator,
  validatorToAddress
 } from "@lucid-evolution/lucid";
import { Blockfrost } from "@lucid-evolution/provider";
import { WalletApi } from "@lucid-evolution/core-types";
import { Constr, Data } from "@lucid-evolution/plutus";
import { Value } from "@anastasia-labs/cardano-multiplatform-lib-browser";


// Define the Cardano Network
const network = "Mainnet";
const blockfrostAPI = process.env.NEXT_PUBLIC_BLOCKFROST_API as string;
const blockfrostAPIKey = process.env.NEXT_PUBLIC_BLOCKFROST_KEY as string;

if (!blockfrostAPI && !blockfrostAPIKey){
  throw console.error("NEXT_PUBLIC_BLOCKFROST_API or NEXT_PUBLIC_BLOCKFROST_KEY not set");
}

// Create lucid object and connect it to a blockfrost provider
const lucid = await Lucid(
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
      balance : ''
    });

  useEffect(() => {

    // Calculate the wallet balance
    const getWalletBalance = async () => {
      try {

        // Get the wallet balance from the wallet API
        const balanceCBORHex = await walletAPI.getBalance();
        
        // Extract the balance amount in lovelace
        const balanceAmount = Value.from_cbor_hex(balanceCBORHex).coin();
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

  // Read the validator script from the filesystem
  async function readValidator(): Promise<SpendingValidator> {
    const validator = JSON.parse(props.blueprint).validators[0];
    return {
      type: "PlutusV2",
      script: validator.compiledCode,
    };
  }
    
  const lock = async () => {
    
    if (!walletAPI) {
      throw console.error("walletAPI is not set");
    }
    setIsLoading(true);
    try {
      // Lock 2 Ada at the script address
      const lovelace = BigInt(2_000_000);
      lucid.selectWallet.fromAPI(walletAPI as WalletApi);

      // Get the pkh from the wallet
      const publicKeyHash = getAddressDetails(
        await lucid.wallet().address()
      ).paymentCredential?.hash;

      // Construct the datum
      const datum = Data.to(new Constr(0, [publicKeyHash!]));

      // Read in the validator script and determine the script address
      const validator = await readValidator();
      const contractAddress = validatorToAddress(network, validator);

      const tx = await lucid
      .newTx()
      .pay.ToAddressWithData(
        contractAddress,
        { kind: "inline", value: datum },
        { lovelace }
      )
      .complete();
      
      // Sign the unsigned tx to get the witness
      const signedTx = await tx.sign.withWallet().complete();

      // Submit the signed tx
      const txHash = await signedTx.submit();

      setTx({ txId: txHash });
      setIsLoading(false);

    } catch (err) {
      setIsLoading(false);
      throw console.error("lock tx failed", err);
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
      lucid.selectWallet.fromAPI(walletAPI as WalletApi);

      // Read in the validator script and determine the script address
      const validator = await readValidator();
      const contractAddress = validatorToAddress(network, validator);
      
      // Construct the Claim redeemer
      const vestingRedeemer = Data.to(new Constr(1, [fromText(message)]));
      
      // Get the UTXO(s) locked at the vesting contract (if any)
      const utxo = (await lucid.utxosAt(contractAddress));
      if (utxo.length < 1) {
        throw console.error("No UTXOs exist at the vesting contract address: ",
                            contractAddress);
      }
      const tx = await lucid
        .newTx()
        .collectFrom([utxo[0]], vestingRedeemer)
        .attach.SpendingValidator(validator)
        .complete();

      // Sign the unsigned tx to get the witness
      const signedTx = await tx.sign.withWallet().complete();

      // Submit the signed tx
      const txHash = await signedTx.submit();

      setTx({ txId: txHash });
      setIsLoading(false);

    } catch (err) {
      setIsLoading(false);
      throw console.error("unlock tx failed", err);
    }
  }

  const cancel = async () => {

    if (!walletAPI) {
      throw console.error("walletAPI is not set");
    }
    setIsLoading(true);
    try {
      lucid.selectWallet.fromAPI(walletAPI as WalletApi);

      // Read in the validator script and determine the script address
      const validator = await readValidator();
      const contractAddress = validatorToAddress(network, validator);
      
      // Construct the Cancel redeemer
      const vestingRedeemer = Data.to(new Constr(0,[]));

      // Get the UTXO(s) locked at the vesting contract (if any)
      const utxo = (await lucid.utxosAt(contractAddress));
      if (utxo.length < 1) {
        throw console.error("No UTXOs exist at the vesting contract address: ",
                            contractAddress);
      }
      const tx = await lucid
        .newTx()
        .collectFrom([utxo[0]], vestingRedeemer)
        .addSigner(await lucid.wallet().address())
        .attach.SpendingValidator(validator)
        .complete();

      // Sign the unsigned tx to get the witness
      const signedTx = await tx.sign.withWallet().complete();

      // Submit the signed tx
      const txHash = await signedTx.submit();

      setTx({ txId: txHash });
      setIsLoading(false);

    } catch (err) {
      setIsLoading(false);
      throw console.error("unlock tx failed", err);
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
                href={`https://${network === "Mainnet" ? "" : network + "."}cexplorer.io/tx/${tx.txId}`}
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
