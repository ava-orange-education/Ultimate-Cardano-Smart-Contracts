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
 } from "@chakra-ui/react";
 import { useSWRConfig } from 'swr';

import {  
  blockConfirmDisabled,
  closeSwap,
  getAssetUtxo,
  getNetworkParams,
  isTestnet,
  network,
  submitTx,
  updateEvent,
} from '../common/network';
import HoldingValidator from '../public/contracts/holding.hl';
import SwapValidator from '../public/contracts/swap.hl';
import BeaconPolicy from '../public/contracts/beacon.hl'
import { 
  Event,
  Swap } from '../common/types';
import {
  Address,
  Assets,
  config,
  Cip30Wallet,
  Datum,
  hexToBytes,
  ListData,
  NetworkParams,
  Value,
  StakeAddress,
  TxOutput,
  Tx,
  WalletHelper,
  ValidatorHash,
  MintingPolicyHash} from "@hyperionbt/helios";

  import {
    optimize
  } from '../config/heliosCompiler';

// Helios config settings
config.set({AUTO_SET_VALIDITY_RANGE: true})

interface CloseSwapProps {
  isOpen: boolean;
  onClose: (isOpen: boolean) => void;
  event: Event;
  swap: Swap;
  setSwapViewRefresh: (swapRefresh: number) => void;
  walletAPI: any;
}

export default function UpdateSwapPopup (props: CloseSwapProps) {

  const toast = useToast();
  const { mutate } = useSWRConfig();

  useEffect(() => {
    const closeSwapStart = async () => {
      await close();
    };
    if (props.isOpen) {
    closeSwapStart();
    }
  }, [props.isOpen]); 

  const handleClose = async () => {
    props.setSwapViewRefresh(Date.now());
    props.onClose(false);
  }

  const close = async () => {

    const lovelaceHex = Buffer.from('lovelace').toString('hex');
    const askedAssetMPH = props.swap.askedAsset.length <= 56 ? '' : props.swap.askedAsset.slice(0,56);
    const askedAssetTN = props.swap.askedAsset.length <= 56 ? lovelaceHex : props.swap.askedAsset.slice(56);
    const offeredAssetMPH = props.swap.offeredAsset.slice(0,56);
    const offeredAssetTN = props.swap.offeredAsset.slice(56);


    if (!props.walletAPI) {
      toast({
        title: "Close Swap Error",
        description: "Wallet is not connected",
        duration: 10000,
        isClosable: true,
        position: 'bottom-right',
        status: 'warning'
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

      // Read in the beacon minting policy and apply the contract parameters
      const beaconPolicy = new BeaconPolicy();
      beaconPolicy.parameters = {["OWNER_PKH"] : props.swap.ownerPKH};
 
      // Compile the helios minting script
      const beaconCompiledPolicy = beaconPolicy.compile(optimize);
      const beaconMPH = MintingPolicyHash.fromHex(props.swap.beaconAsset.slice(0,56));
      
      // Construct the beacon redeemer for burning
      const burnRedeemer = (new beaconPolicy.types.Redeemer
        .Burn())._toUplcData();

      const beaconTN = hexToBytes(props.swap.beaconAsset.slice(56));
      const beaconToken = [[beaconTN, BigInt(-1)]] as [[number[], bigint]];

      // Add the script as a witness to the transaction
      tx.attachScript(beaconCompiledPolicy);

      // Add the new minted token to the transaction 
      tx.mintTokens(
        beaconMPH, 
        beaconToken, 
        burnRedeemer 
      )

      // Load in the vesting validator script (program)
      const holdingValidator = new HoldingValidator();
      holdingValidator.parameters = {["STAKE_PKH"] : baseAddr.stakingHash};
      holdingValidator.parameters = {["TN"] : offeredAssetTN};
      holdingValidator.parameters = {["BEACON_MPH"] : beaconMPH.hex};

      // Compile the vesting validator
      const holdingCompiledValidator = holdingValidator.compile(optimize);

      // Get the validator address
      const holdValAddr = Address.fromHashes(holdingCompiledValidator.validatorHash);

      // Try to get UTXO at holding script if it exits
      try {
          // Get the UTXO of the released assets
          const holdingUtxo = await getAssetUtxo(holdValAddr.toBech32(), props.swap.offeredAsset);
          
          // Add the holding script as a witness to the transaction
          tx.attachScript(holdingCompiledValidator);

          // Create the holding redeemer
          const holdingRedeemer = (new holdingValidator.types.Redeemer.Return())._toUplcData();

          // Add the holding validator UTXO as an input
          tx.addInput(holdingUtxo, holdingRedeemer);
      } catch (err) {
        console.error("CloseSwapPop: ", err)
      }

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
      const swapRedeemer = (new swapValidator.types.Redeemer.Close())._toUplcData();
      
      // Add the swap validator UTXO as an input
      tx.addInput(swapUtxo, swapRedeemer);

      
      // Create offered asset value
      const holding = props.event.holding + props.swap.offeredAssetQty;
      var offeredAssetValue;
      if (offeredAssetMPH === "") {
        offeredAssetValue = new Value(BigInt(holding));
      } else {
        const offeredAsset = new Assets();
        offeredAsset.addComponent(
          MintingPolicyHash.fromHex(offeredAssetMPH),
          offeredAssetTN,
          BigInt(holding)
        );
        offeredAssetValue = new Value(BigInt(0), offeredAsset);
      }
      
      // Create the dummy datum
      const datum = new ListData([]); // Dummy datum

      // Attach the output with beacon token and offered asset
      const swapValue = (new Value(minLovelace))
                          .add(offeredAssetValue);

      // Construct output to lock offered asset at holding address
      tx.addOutput(new TxOutput(
          Address.fromHash(new ValidatorHash(props.swap.holdValHash), isTestnet),
          swapValue,
          Datum.inline(datum)
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

        const eventUpdate = {
          ...props.event,
            holding: props.event.holding + props.swap.offeredAssetQty,
            released: props.event.released - props.swap.offeredAssetQty,
            txId: txHash,
            confirmed: blockConfirmDisabled
        }
        // Update event to DB
        await updateEvent(eventUpdate);

        const swapClose = {
          ...props.swap,
          txId: txHash,
          confirmed: blockConfirmDisabled
        }

        await closeSwap(swapClose);

        toast({
          title: "Close Swap Success",
          description: <Box fontSize='x-small'>TxId: {txHash}</Box>,
          duration: 10000,
          isClosable: true,
          position: 'bottom-right',
          status: 'success'
        })
        // Refresh event view
        await mutate(StakeAddress.fromAddress(baseAddr).toBech32());
        await handleClose()
        
      } catch (error) {
        toast({
          title: "Close Swap Error",
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
          title: "Close Swap Error",
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
          <ModalHeader>Close Ticket Swap</ModalHeader>
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

