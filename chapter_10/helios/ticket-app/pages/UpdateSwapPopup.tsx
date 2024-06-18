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
  network,
  submitTx,
  updateSwap
} from '../common/network';
import SwapValidator from '../public/contracts/swap.hl';
import { 
  Swap } from '../common/types';
import {
  Address,
  Assets,
  config,
  Cip30Wallet,
  Datum,
  NetworkParams,
  Value,
  TxOutput,
  Tx,
  WalletHelper,
  MintingPolicyHash} from "@hyperionbt/helios";

import {
  optimize
} from '../config/heliosCompiler';

// Helios config settings
config.set({AUTO_SET_VALIDITY_RANGE: true})

interface UpdateSwapProps {
  isOpen: boolean;
  onClose: (isOpen: boolean) => void;
  askedAssetQty: number;
  swap: Swap;
  setSwapViewRefresh: (swapRefresh: number) => void;
  walletAPI: any;
}

export default function UpdateSwapPopup (props: UpdateSwapProps) {
  
  const toast = useToast();

  useEffect(() => {
    const updateSwapStart = async () => {
      await update();
    };
    if (props.isOpen) {
    updateSwapStart();
    }
  }, [props.isOpen]); 

  const handleClose = async () => {
    props.setSwapViewRefresh(Date.now());
    props.onClose(false);
  }

  const update = async () => {

    const lovelaceHex = Buffer.from('lovelace').toString('hex');
    const askedAssetMPH = props.swap.askedAsset.length <= 56 ? '' : props.swap.askedAsset.slice(0,56);
    const askedAssetTN = props.swap.askedAsset.length <= 56 ? lovelaceHex : props.swap.askedAsset.slice(56);
    const offeredAssetMPH = props.swap.offeredAsset.slice(0,56);
    const offeredAssetTN = props.swap.offeredAsset.slice(56);

    if (props.askedAssetQty < 1) {
      toast({
        title: "Update Swap Error",
        description: "Aksed Asset Quantify must be one or greater",
        duration: 10000,
        isClosable: true,
        position: 'bottom-right',
        status: 'error'
      })
      console.error("Aksed Asset Quantify must be one or greater")
      return
    }

    if (!props.walletAPI) {
      toast({
        title: "Update Swap Error",
        description: "Wallet is not connected",
        duration: 10000,
        isClosable: true,
        position: 'bottom-right',
        status: 'error'
      })
      console.error("Wallet is not connected")
      return
    }

    try {
      const cip30WalletAPI = new Cip30Wallet(props.walletAPI);
      const walletHelper = new WalletHelper(cip30WalletAPI);
      const minLovelace : number = 2000000; // minimum lovelace needed to send an NFT
      const maxTxFee: number = 500000; // maximum estimated transaction fee
      const minChangeAmt: number = 1000000; // minimum lovelace needed to be sent back as change
      const minUTXOVal = new Value(BigInt(minLovelace + maxTxFee + minChangeAmt));  

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

      // Construct the swap script
      const swapValidator = new SwapValidator();
      const showtime = new Date(props.swap.showtime);
      swapValidator.parameters = {["ASKED_MPH"] : askedAssetMPH};
      swapValidator.parameters = {["ASKED_TN"] : askedAssetTN};
      swapValidator.parameters = {["OFFERED_MPH"] : offeredAssetMPH};
      swapValidator.parameters = {["OFFERED_TN"] : offeredAssetTN};
      swapValidator.parameters = {["BEACON_MPH"] : props.swap.beaconAsset.slice(0,56)};
      swapValidator.parameters = {["BEACON_TN"] : props.swap.beaconAsset.slice(56)};
      swapValidator.parameters = {["HOLD_VAL_HASH"] : props.swap.holdValHash};
      swapValidator.parameters = {["SHOWTIME"] : BigInt(showtime.getTime())};
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
      const swapRedeemer = (new swapValidator.types.Redeemer.Update())._toUplcData();
      
      // Add the swap validator UTXO as an input
      tx.addInput(swapUtxo, swapRedeemer);

      // Construct the asked asset value
      var askedAssetValue;
      if (askedAssetMPH === "") {
        askedAssetValue = new Value(BigInt(props.askedAssetQty));
      } else {
        const askedAsset = new Assets();
        askedAsset.addComponent(
          MintingPolicyHash.fromHex(askedAssetMPH),
          askedAssetTN,
          BigInt(props.askedAssetQty)
        );
        askedAssetValue = new Value(BigInt(0), askedAsset);
      }

      // Create offered asset value
      var offeredAssetValue;
      if (offeredAssetMPH === "") {
        offeredAssetValue = new Value(BigInt(props.swap.offeredAssetQty));
      } else {
        const offeredAsset = new Assets();
        offeredAsset.addComponent(
          MintingPolicyHash.fromHex(offeredAssetMPH),
          offeredAssetTN,
          BigInt(props.swap.offeredAssetQty)
        );
        offeredAssetValue = new Value(BigInt(0), offeredAsset);
      }

      // Construct the swap datum
      const swapDatum = new (swapValidator.types.Datum)(
        askedAssetValue,
        offeredAssetValue
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
                          .add(offeredAssetValue)
                          .add(beaconValue);

      // Construct output to lock offered asset at swap address
      tx.addOutput(new TxOutput(
          swapAddr,
          swapValue,
          Datum.inline(swapDatum)
      ));

      // Specify when this transaction is valid from. This is needed so
      // time is included in the transaction which will be use by the 
      // scripts. Add two hours for time to live and offset the current time
      // by 5 mins.
      const currentTime = new Date().getTime();
      const earlierTime = new Date(currentTime - 5 * 60 * 1000);
      const laterTime = new Date(currentTime + 2 * 60 * 60 * 1000);

      tx.validFrom(earlierTime);
      tx.validTo(laterTime);
  
      // Swap updates required stake key hash signature
      tx.addSigner(baseAddr.stakingHash!);

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
        
        const swapUpdate = {
          ...props.swap,
          askedAssetQty: props.askedAssetQty,
          txId: txHash,
          confirmed: blockConfirmDisabled
        }

        await updateSwap(swapUpdate);
        toast({
          title: "Update Swap Success",
          description: <Box fontSize='x-small'>TxId: {txHash}</Box>,
          duration: 10000,
          isClosable: true,
          position: 'bottom-right',
          status: 'success'
        })
        await handleClose();
        
      } catch (error) {
        toast({
          title: "Update Swap Error",
          description: "Could not submit transaction",
          duration: 10000,
          isClosable: true,
          position: 'bottom-right',
          status: 'error'
        })
        console.error("Could not submit transaction: " + error)
        props.onClose(false);
      }

    } catch (err) {
        toast({
          title: "Update Swap Error",
          description: "Could not submit transaction",
          duration: 10000,
          isClosable: true,
          position: 'bottom-right',
          status: 'error'
        })
        console.error("Could not submit transaction", err)
        props.onClose(false)
    }
  }
  
  if (!props.isOpen) return null;

  return (
    <Modal onClose={handleClose} size='xs' isOpen={props.isOpen}>
        <ModalOverlay/>
        <ModalContent>
          <ModalHeader>Update Ticket Swap</ModalHeader>
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
