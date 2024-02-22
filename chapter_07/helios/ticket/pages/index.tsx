import type { NextPage } from 'next';
import Head from 'next/head'
import { useState, useEffect } from "react";

import Burn from '../components/Burn';
import NFTMinting from '../contracts/ticket.hl';
import { generateMetadata } from '../common/metatdata';
import {  getNetworkParams,
          getTicketMetadata,
          getWalletInfo } from '../common/network';
import LoadingSpinner from '../components/LoadingSpinner';
import Mint from '../components/Mint';
import WalletConnector from '../components/WalletConnector';
import WalletInfo from '../components/WalletInfo';

import {
  Address,
  Assets,
  Cip30Wallet,
  NetworkParams,
  Value,
  textToBytes,
  TxOutput,
  Tx,
  WalletHelper,
  MintingPolicyHash} from "@hyperionbt/helios";

// Define the Cardano Network
const network = "preprod";

// Optimization flag for Helios compiler
const optimize = false;

const Home: NextPage = () => {

  const [isLoading, setIsLoading] = useState(false);
  const [tx, setTx] = useState({ txId : '' });
  const [walletAPI, setWalletAPI] = useState<undefined | any>(undefined);
  const [walletInfo, setWalletInfo] = useState({ 
      balance : [],
      addr : ''
    });

  useEffect(() => {
    const updateWalletInfo = async () => {

        if (walletAPI) {
            const addr = await getWalletAddr() as string;
            const wallet_info = await getWalletInfo(addr)
            setWalletInfo({
              ...walletInfo,
              balance : wallet_info.balance as [],
              addr: wallet_info.addr
            });
        } else {
          // Zero out wallet info if no walletAPI is present
          setWalletInfo({
            balance : [],
            addr : ''
          })
        }
    }
    updateWalletInfo();
  }, [walletAPI]);

  // Calculate the wallet balance
  const getWalletAddr = async () => {
    try {
      const cip30WalletAPI = new Cip30Wallet(walletAPI);
      const walletHelper = new WalletHelper(cip30WalletAPI);
      const changeAddr = await walletHelper.baseAddress;
      return changeAddr.toBech32();

    } catch (error) {
      console.error('Error in getWalletAddr:', error);
      throw new Error('Failed to retrieve wallet pkh. Please try again later.');
    }
  };

  const mint = async (params: any) => {

    if (params[0].length < 5 ){
      throw console.error("Invalid number of parameters provided");
    }
    const address = params[0] as string;
    const name = params[1] as string;
    const description = params[2] as string;
    const image = params[3] as string;
    const qty = params[4] as number;

    if (!walletAPI) {
      throw console.error("walletAPI is not set");
    }
    setIsLoading(true);
    try {
      const cip30WalletAPI = new Cip30Wallet(walletAPI);
      const walletHelper = new WalletHelper(cip30WalletAPI);
      const minAda : number = 2000000; // minimum lovelace needed to send an NFT
      const maxTxFee: number = 500000; // maximum estimated transaction fee
      const minChangeAmt: number = 1000000; // minimum lovelace needed to be sent back as change
      const minAdaVal = new Value(BigInt(minAda));
      const minUTXOVal = new Value(BigInt(minAda + maxTxFee + minChangeAmt));  

      // Get wallet UTXOs
      const utxos = await walletHelper.pickUtxos(minUTXOVal);

      // Get change address
      const changeAddr = await walletHelper.changeAddress;

      // Start building the transaction
      const tx = new Tx();

      // Add the UTXO as inputs
      tx.addInputs(utxos[0]);

      // Read in the ticket minting policy and apply the contract parameters
      const utxoId = utxos[0][0].outputId.txId.hex;
      const utxoIdx = utxos[0][0].outputId.utxoIdx;
      const ticketMinting = new NFTMinting();
      ticketMinting.parameters = {["TX_ID"] : utxoId};
      ticketMinting.parameters = {["TX_IDX"] : utxoIdx};
      ticketMinting.parameters = {["TN"] : name};
      ticketMinting.parameters = {["QTY"] : BigInt(qty)};

      // Compile the helios minting script
      const ticketCompiledMinting = ticketMinting.compile(optimize);

      // Add the script as a witness to the transaction
      tx.attachScript(ticketCompiledMinting);

      // Create the minting claim redeemer
      const mintRedeemer = (new ticketMinting.types.Redeemer.Mint())
                              ._toUplcData();

      // Create the minted tokens
      const tokens = [[textToBytes(name), BigInt(qty)]] as [[number[], bigint]];

      // Create the minted assets
      const assets = new Assets([[ticketCompiledMinting.mintingPolicyHash, 
                                  tokens
                    ]])

      // Add the new minted token to the transaction which includes
      // the minting policy hash, the token name, amount and the redeemer 
      tx.mintTokens(
          ticketCompiledMinting.mintingPolicyHash, 
          tokens, 
          mintRedeemer 
      )

      // Construct the output to send ticket token(s) to the address
      // from the user input
      tx.addOutput(new TxOutput(
        Address.fromBech32(address),
        new Value(minAdaVal.lovelace, assets)
      ));

      // Attached the metadata for the minting transaction
      tx.addMetadata( 721,
                      generateMetadata( 
                          ticketCompiledMinting.mintingPolicyHash.hex,
                          name,
                          description,
                          image,
                          BigInt(qty),
                          utxoId,
                          utxoIdx
                      )
        );

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


  const burn = async (params: any) => {

    if (params[0].length < 3 ){
      throw console.error("Invalid number of parameters provided");
    }
    const policyId = params[0] as string;
    const tokenName = params[1] as string;
    const qty = params[2] as number;

    setIsLoading(true);

    if (!walletAPI) {
      throw console.error("walletAPI is not set");
    }
    try {
      const cip30WalletAPI = new Cip30Wallet(walletAPI);
      const walletHelper = new WalletHelper(cip30WalletAPI);
      const minAda : number = 2000000; // minimum lovelace needed to send an NFT
      const maxTxFee: number = 500000; // maximum estimated transaction fee
      const minChangeAmt: number = 1000000; // minimum lovelace needed to be sent back as change
      const minUTXOVal = new Value(BigInt(minAda + maxTxFee + minChangeAmt));  

      // Get wallet UTXOs
      const utxos = await walletHelper.pickUtxos(minUTXOVal);

      // Get change address
      const changeAddr = await walletHelper.changeAddress;

      // Start building the transaction
      const tx = new Tx();

      // Add the UTXO as inputs
      tx.addInputs(utxos[0]);

      // Get the NFT metadata needed for the script parameters
      const ticketMetadata = await getTicketMetadata(policyId, tokenName);

      // Load in the ticket program and set contract parameters
      const ticketMinting = new NFTMinting();
      ticketMinting.parameters = {["TX_ID"] : ticketMetadata.utxoId};
      ticketMinting.parameters = {["TX_IDX"] : Number(ticketMetadata.utxoIdx)};
      ticketMinting.parameters = {["TN"] : tokenName};
      ticketMinting.parameters = {["QTY"] : BigInt(ticketMetadata.qty)};

      // Compile the helios minting script
      const ticketCompiledMinting = ticketMinting.compile(optimize);

      // Add the script as a witness to the transaction
      tx.attachScript(ticketCompiledMinting);

      // Create the vesting claim redeemer
      const mintRedeemer = (new ticketMinting.types.Redeemer.Burn())
                              ._toUplcData();

      const ticketMPH = MintingPolicyHash.fromHex(policyId);

      // Create the burn tokens
      const tokens = [[textToBytes(tokenName), BigInt(-1 * qty)]] as [[number[], bigint]];

      // Add the new minted token to the transaction which includes
      // the minting policy hash, the token name, amount and the redeemer 
      tx.mintTokens(
        ticketMPH, 
          tokens, 
          mintRedeemer 
      )

      // Read in the network parameter file
      const networkParamsJson = await getNetworkParams(network);
      const networkParams = new NetworkParams(networkParamsJson);

      //console.log("tx before final", tx.dump());

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
            <Mint onMint={mint}/> 
          </div> 
        )}
        { walletAPI && !tx.txId && !isLoading && (
          <div className="border border-gray-400 p-4 rounded">
            <Burn onBurn={burn}/> 
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
