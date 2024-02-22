import React, { useEffect } from 'react';
import {
  Box,
  Button,
  Center,
  Modal,
  ModalFooter,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  useToast,
  Spinner
 } from "@chakra-ui/react"

import {  
  blockConfirmDisabled,
  getAssetUtxo,
  getNetworkParams,
  getTicketMetadataCIP25, 
  isTestnet,
  network,
  submitTx,
  updateEvent,
  updateSwap
} from '../common/network';
import { calcOrderDetails } from '../common/orders';
import NFTMinting from '../public/contracts/ticket.hl';
import SwapValidator from '../public/contracts/swap.hl';
import TicketRefVal from '../public/contracts/ticketRefVal.hl'
import { 
  Event,
  Swap 
} from '../common/types';
import {
  Address,
  Assets,
  ByteArrayData,
  ConstrData,
  Cip30Wallet,
  config,
  Datum,
  hexToBytes,
  IntData,
  MapData,
  NetworkParams,
  PubKeyHash,
  Value,
  textToBytes,
  TxOutput,
  Tx,
  WalletHelper,
  MintingPolicyHash} from "@hyperionbt/helios";

import {
  optimize
} from '../config/heliosCompiler';

// Helios config settings
config.set({AUTO_SET_VALIDITY_RANGE: true})


interface ExecuteSwapProps {
  isOpen: boolean;
  onClose: (isOpen: boolean) => void;
  event: Event;
  swap: Swap;
  setSwapViewRefresh: (swapRefresh: number) => void;
  buyQty: number;
  walletAPI: any;
}

export default function ExecuteSwapPopup (props: ExecuteSwapProps){
                                                
  const toast = useToast();

  useEffect(() => {
    const executeSwapStart = async () => {
      await executeSwap();
    };
    if (props.isOpen) {
    executeSwapStart();
    }
  }, [props.isOpen]); 


  const handleClose = async () => {
    props.setSwapViewRefresh(Date.now());
    props.onClose(false);
  }

  const executeSwap = async () => {

    const lovelaceHex = Buffer.from('lovelace').toString('hex');
    const askedAssetMPH = props.swap.askedAsset.length <= 56 ? '' : props.swap.askedAsset.slice(0,56);
    const askedAssetTN = props.swap.askedAsset.length <= 56 ? lovelaceHex : props.swap.askedAsset.slice(56);
    const askedAssetAmount = props.buyQty * props.swap.askedAssetQty;
    const offeredAssetMPH = props.swap.offeredAsset.slice(0,56);
    const offeredAssetTN = props.swap.offeredAsset.slice(56);

    if (props.buyQty < 1) {
      toast({
        title: "Execute Swap Error",
        description: "Aksed Asset Quantify must be one or greater",
        duration: 10000,
        isClosable: true,
        position: 'bottom-right',
        status: 'error'
      })
      console.error("Aksed Asset Quantify must be one or greater ")
      props.onClose(false)
      return
    }
    if (!props.walletAPI) {
      toast({
        title: "Wallet is not connected",
        description: "Please connect your wallet to buy tickets",
        duration: 10000,
        isClosable: true,
        position: 'bottom-right',
        status: 'info'
      })
      console.error("Wallet is not connected")
      props.onClose(false)
      return
    }
    
    try {
      const cip30WalletAPI = new Cip30Wallet(props.walletAPI);
      const walletHelper = new WalletHelper(cip30WalletAPI);
      const minLovelace : number = 2000000; // minimum lovelace needed to send an NFT
      const maxTxFee: number = 500000; // maximum estimated transaction fee
      const minChangeAmt: number = 1000000; // minimum lovelace needed to be sent back as change
      const minUTXOVal = new Value(BigInt(minLovelace + maxTxFee + minChangeAmt));  
      const ownerPkh = process.env.NEXT_PUBLIC_OWNER_PKH!;
  
      // Get wallet UTXOs
      const utxos = await walletHelper.pickUtxos(minUTXOVal);

      // Get change address
      const changeAddr = await walletHelper.changeAddress;

      // Get base address
      const baseAddr = await walletHelper.baseAddress;

      // Start building the transaction
      const tx = new Tx();

      // Add the UTXO as inputs
      tx.addInputs(utxos[0]);

      // Get metadata contract parameters
      const ticket = await getTicketMetadataCIP25(props.swap.offeredAsset);

      const showtime = new Date(ticket.showtime);
      const ticketMinting = new NFTMinting();
      ticketMinting.parameters = {["TX_ID"] : ticket.txId};
      ticketMinting.parameters = {["TX_IDX"] : ticket.txIdx};
      ticketMinting.parameters = {["TN"] : ticket.tokenName};
      ticketMinting.parameters = {["SHOWTIME"] : BigInt(showtime.getTime())};
      ticketMinting.parameters = {["QTY"] : BigInt(ticket.tokenQty)};
      ticketMinting.parameters = {["STAKE_PKH"] : ticket.stakePKH};
      ticketMinting.parameters = {["HOLD_VAL_HASH"] : ticket.holdValHash};
      ticketMinting.parameters = {["MIN_LOVELACE"] : BigInt(ticket.minLovelace)};
      

      // Compile the helios minting script
      const ticketCompiledMinting = ticketMinting.compile(optimize);

      // Add the script as a witness to the transaction
      tx.attachScript(ticketCompiledMinting);

      // Use timestamp for now
      const orderId = Date.now().toString();

      // Load in the ticket reference validator script (program)
      const ticketRefVal = new TicketRefVal();
      ticketRefVal.parameters = {["OWNER_PKH"] : ownerPkh};
      ticketRefVal.parameters = {["TN"] : orderId};

      // Compile the vesting validator
      const ticketRefValCompiled = ticketRefVal.compile(optimize);

      // Get the validator address
      const ticketRefValAddr = Address.fromHashes(ticketRefValCompiled.validatorHash);

      let ticketTokens = [];
      let refTokens = [];

      // First create the allocated ticket tokens to be burned
      let txTokens = [[hexToBytes(ticket.tokenName), 
                       BigInt(-1 * props.buyQty)]] as [[number[], bigint]];

      // Build unique token name for each converted ticket
      // and follow CIP-68 & CIP-67 label convention
      const label222hex = "000de140";   // NFT Token Label
      const label100hex = "000643b0";   // Reference Token Label
      let ticketTokenNames: string[] = [];
      let refTokenNames: string[] = [];
      for(let i=0; i < props.buyQty; i++) {

        const nftTicketName = props.swap.name + "|" + orderId + "|" +  i.toString();
        const nftTicketNameLabel = label222hex + Buffer
                                                .from(nftTicketName)
                                                .toString('hex');
        const ticketToken = [hexToBytes(nftTicketNameLabel),  
                            BigInt(1)] as [number[], bigint];
      
        const refTokenNameLabel = label100hex + Buffer
                                                .from(nftTicketName)
                                                .toString('hex');
        const refToken = [hexToBytes(refTokenNameLabel),
                          BigInt(1)] as [number[], bigint];

        ticketTokenNames.push(nftTicketNameLabel);
        ticketTokens.push(ticketToken);   
        refTokenNames.push(refTokenNameLabel);
        refTokens.push(refToken);
        
        const refAssets = new Assets([[ticketCompiledMinting.mintingPolicyHash, [refToken]]])
        
        // Build the CIP-068 metadata datum
        const nameKey = new ByteArrayData(textToBytes("name"));
        const nameValue = new ByteArrayData(textToBytes(nftTicketName));
        const locationKey = new ByteArrayData(textToBytes("location"));
        const locationValue = new ByteArrayData(textToBytes(ticket.location));
        const showtimeKey = new ByteArrayData(textToBytes("showtime"));
        const showtimeValue = new IntData(BigInt((showtime.getTime())));
        const imageKey = new ByteArrayData(textToBytes("image"));
        const imageValue = new ByteArrayData(textToBytes(ticket.image));
        const pkhKey = new ByteArrayData(textToBytes("pkh"));
        const pkhValue = new ByteArrayData(textToBytes("")); // not used
        const mapData = new MapData([[nameKey, nameValue],
                                    [imageKey, imageValue]]);
        const version = new IntData(BigInt(1));
        const extraData = new MapData([ [locationKey, locationValue],
                                        [showtimeKey, showtimeValue],
                                        [pkhKey, pkhValue]]);
        const cip068Datum = new ConstrData(0, [mapData, version, extraData]);
        const cip68InlineDatum = Datum.inline(cip068Datum);
        
        // Create the output for the reference token
        tx.addOutput(new TxOutput(
          ticketRefValAddr,
          new Value(props.swap.minLovelace, refAssets),
          cip68InlineDatum
        ));
        
        txTokens.push(ticketToken);
        txTokens.push(refToken);
      }

      // Create the minting convet redeemer
      const mintRedeemer = (new ticketMinting.types.Redeemer
                                                    .Convert( props.buyQty,
                                                              ticketTokenNames,
                                                              refTokenNames))
                                                    ._toUplcData();

      // Add the new minted token to the transaction which includes
      // the minting policy hash, the token name, amount and the redeemer 
      tx.mintTokens(
          ticketCompiledMinting.mintingPolicyHash, 
          txTokens, 
          mintRedeemer 
      )

      // Construct the swap script
      const swapValidator = new SwapValidator();
      swapValidator.parameters = {["ASKED_MPH"] : askedAssetMPH};
      swapValidator.parameters = {["ASKED_TN"] : askedAssetTN};
      swapValidator.parameters = {["OFFERED_MPH"] : offeredAssetMPH};
      swapValidator.parameters = {["OFFERED_TN"] : offeredAssetTN};
      swapValidator.parameters = {["BEACON_MPH"] : props.swap.beaconAsset.slice(0,56)};
      swapValidator.parameters = {["BEACON_TN"] : props.swap.beaconAsset.slice(56)};
      swapValidator.parameters = {["HOLD_VAL_HASH"] : props.swap.holdValHash};
      swapValidator.parameters = {["SHOWTIME"] : BigInt(props.swap.showtime)};
      swapValidator.parameters = {["PAYMENT_PKH"] : props.swap.paymentPKH};
      swapValidator.parameters = {["STAKE_PKH"] : props.swap.stakePKH};
      swapValidator.parameters = {["MIN_LOVELACE"] : BigInt(minLovelace)};

       // Compile the helios swap validator
       const swapCompiledValidator = swapValidator.compile(optimize);

      // Swap address
      const swapAddr = Address.fromHash(swapCompiledValidator.validatorHash);
 
      // Get the UTXO with beacon asset
      const swapUtxo = await getAssetUtxo(swapAddr.toBech32(), props.swap.beaconAsset);

      // Add the holding script as a witness to the transaction
      tx.attachScript(swapCompiledValidator);

      // Create the swap redeemer
      const swapRedeemer = (new swapValidator.types.Redeemer
                                              .Swap(baseAddr.pubKeyHash!.hex,
                                                props.buyQty,
                                                ticketTokenNames
                                                ))._toUplcData();
                                      
      // Add the swap validator UTXO as an input
      tx.addInput(swapUtxo, swapRedeemer);

      // Construct the asked asset value
      var swapAskedAssetValue;
      if (askedAssetMPH === "") {
        swapAskedAssetValue = new Value(BigInt(askedAssetAmount));
      } else {
        const askedAsset = new Assets();
        askedAsset.addComponent(
          MintingPolicyHash.fromHex(askedAssetMPH),
          askedAssetTN,
          BigInt(askedAssetAmount)
        );
        swapAskedAssetValue = new Value(BigInt(0), askedAsset);
      }

      // Calc the values to be sent to the buyer, seller and swap
      const orderDetails = await calcOrderDetails(swapUtxo, 
                                                  swapAskedAssetValue, 
                                                  props.swap);

      // Construct the swap datum
      const swapDatum = new (swapValidator.types.Datum)(
        orderDetails.askedAssetVal,     // askedAsset
        orderDetails.offeredAssetVal,    // offeredAsset
      )

      // Construct the beacon token
      const beaconAsset = new Assets();
        beaconAsset.addComponent(
          MintingPolicyHash.fromHex(props.swap.beaconAsset.slice(0,56)),
          props.swap.beaconAsset.slice(56),
          BigInt(1)
        );
      const beaconValue = new Value(BigInt(0), beaconAsset);

      // Attach the output with beacon token and offered asset
      const swapValue = (new Value(minLovelace))
                          .add(orderDetails.offeredAssetVal)
                          .add(beaconValue);

      // Construct output to lock offered asset at swap address
      tx.addOutput(new TxOutput(
          swapAddr,
          swapValue,
          Datum.inline(swapDatum)
      ));

      // Create the output to send the askedAsset to the seller address
      // and check if asked Asset is in lovelace
      if (swapAskedAssetValue.lovelace == BigInt(0)) {
        if (orderDetails.noChange) {
            tx.addOutput(new TxOutput(
                Address.fromHashes(new PubKeyHash(props.swap.paymentPKH), new PubKeyHash(props.swap.stakePKH), isTestnet),
                (new Value(BigInt(props.swap.minLovelace))).add(swapAskedAssetValue)));
        } else {
            tx.addOutput(new TxOutput(
              Address.fromHashes(new PubKeyHash(props.swap.paymentPKH), new PubKeyHash(props.swap.stakePKH), isTestnet),
                (new Value(BigInt(props.swap.minLovelace))).add(swapAskedAssetValue.sub(orderDetails.changeAssetVal))
            ));
        }
      } else {
          if (orderDetails.noChange) {
              tx.addOutput(new TxOutput(
                Address.fromHashes(new PubKeyHash(props.swap.paymentPKH), new PubKeyHash(props.swap.stakePKH), isTestnet),
                  swapAskedAssetValue
              ));
          } else {
              tx.addOutput(new TxOutput(
                Address.fromHashes(new PubKeyHash(props.swap.paymentPKH), new PubKeyHash(props.swap.stakePKH), isTestnet),
                  swapAskedAssetValue.sub(orderDetails.changeAssetVal)
              ));
          }
      }

      // Create the ticket assets
      const ticketAssets = new Assets([[ticketCompiledMinting.mintingPolicyHash, ticketTokens]])
  
      // Create the output that goes to the buyer
      tx.addOutput(new TxOutput(
          baseAddr,
          new Value(props.swap.minLovelace, ticketAssets),
      ));

      // Create the output to send to the buyer address for the change
      if (orderDetails.changeAssetVal.lovelace == BigInt(0))
      {
          if (!orderDetails.noChange) {
              tx.addOutput(new TxOutput(
                  changeAddr,
                  (new Value(BigInt(props.swap.minLovelace))).add(orderDetails.changeAssetVal)
              ));
          }
      } else {
          if (!orderDetails.noChange) {
              tx.addOutput(new TxOutput(
                  changeAddr,
                  orderDetails.changeAssetVal
              ));
          }
      }

      // Specify when this transaction is valid from. This is needed so
      // time is included in the transaction which will be use by the 
      // scripts. Add two hours for time to live and offset the current time
      // by 5 mins.
      const currentTime = new Date().getTime();

      // Check that current Time does not go past showtime
      if (currentTime > props.swap.showtime) {
        toast({
          title: "Execute Swap Error",
          description: "Cannot buy ticket after event has started",
          duration: 10000,
          isClosable: true,
          position: 'bottom-right',
          status: 'error'
        })
        console.error("Cannot buy ticket after event has started")
        props.onClose(false)
        return
      }
      const earlierTime = new Date(currentTime - 5 * 60 * 1000);
      const laterTime = new Date(currentTime + 2 * 60 * 60 * 1000);

      tx.validFrom(earlierTime);
      tx.validTo(laterTime);
  
      // Read in the network parameter file
      const networkParamsJson = await getNetworkParams(network);
      const networkParams = new NetworkParams(networkParamsJson);

     // Send any change back to the buyer
      await tx.finalize(networkParams, changeAddr, utxos[1]);

      // Sign the unsigned tx to get the witness
      const signatures = await cip30WalletAPI.signTx(tx);
      tx.addSignatures(signatures);
      
      try {
        // Submit the signed tx
        const txHash = await submitTx(tx);
        console.log("txHash", txHash);

        // Update event to DB
        const eventUpdate = {
          ...props.event,
          released: props.event.released - props.buyQty,
          converted: props.event.converted + props.buyQty
        }
        await updateEvent(eventUpdate);

        // Update swap to DB
        const swapUpdate = {
            ...props.swap,
            offeredAssetQty: props.swap.offeredAssetQty - props.buyQty,
            txId: txHash,
            confirmed: blockConfirmDisabled
        }
        await updateSwap(swapUpdate);

        toast({
          title: "Ticket Purchase Success",
          description: <Box fontSize='x-small'>TxId: {txHash}</Box>,
          duration: 10000,
          isClosable: true,
          position: 'bottom-right',
          status: 'success'
        })
        await handleClose()
        
      } catch (error) {
        toast({
          title: "Execute Swap Error",
          description: "Could not submit transaction",
          duration: 10000,
          isClosable: true,
          position: 'bottom-right',
          status: 'error'
        })
        console.error("Could not submit transaction: " + error)
        props.onClose(false)
      }

    } catch (err) {
        toast({
          title: "Execute Swap Error",
          description: "Could not submit transaction",
          duration: 10000,
          isClosable: true,
          position: 'bottom-right',
          status: 'error'
        })
        console.error("Execute swap submit tx failed", err)
        props.onClose(false)
    }
  }
  
  if (!props.isOpen) return null;

  return (
    <Modal onClose={handleClose} size='xs' isOpen={props.isOpen}>
        <ModalOverlay/>
        <ModalContent>
          <ModalHeader>Buy Tickets</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Center>
              <Spinner size="xl" color='blue.500'/>
            </Center>
          </ModalBody>
          <ModalFooter>
            <Button onClick={handleClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
  )
};

