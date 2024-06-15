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

import { generateMetadataBeacon } from '../common/metadata';
import {  
  blockConfirmDisabled,
  getAssetUtxo,
  getNetworkParams,
  network,
  setBeacon,
  setSwap,
  signSubmitTx,
  updateEvent
} from '../common/network';
import BeaconPolicy from '../public/contracts/beacon.hl'
import SwapValidator from '../public/contracts/swap.hl';
import HoldingValidator from '../public/contracts/holding.hl';
import { 
  Event, 
  Swap 
} from '../common/types';

import {
  Address,
  Assets,
  bytesToHex,
  config,
  Cip30Wallet,
  Crypto,
  Datum,
  hexToBytes,
  ListData,
  NetworkParams,
  PubKeyHash,
  StakeAddress,
  ValidatorHash,
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

const isTestnet = true;

interface OpenSwapProps {
  askedAsset: string;
  askedAssetQty: number;
  offeredAssetQty: number;
  description: string;
  isOpen: boolean;
  walletAPI: any;
  onClose: (isOpen: boolean) => void;
  event: Event;
  setSwapViewRefresh: (swapRefresh: number) => void;
}

export default function OpenSwapPopup (props: OpenSwapProps) {
  
  const toast = useToast();
  const { mutate } = useSWRConfig();

  useEffect(() => {
    const openSwapStart = async () => {
      await open();
    };
    if (props.isOpen) {
    openSwapStart();
    }
  }, [props.isOpen]); 

  const handleClose = async () => {
    props.setSwapViewRefresh(Date.now());
    props.onClose(false);
  }

  const open = async () => {

    const offeredAsset = props.event.asset;
    if (offeredAsset.length <= 56) {

      toast({
        title: "Open Swap Error",
        description: "Offered asset is not a valid token",
        duration: 10000,
        isClosable: true,
        position: 'bottom-right',
        status: 'error'
      })
      props.onClose(false)
      console.error("Offered asset is not a valid token")
      return
    }

    const lovelaceHex = Buffer.from('lovelace').toString('hex');
    const askedAssetMPH = props.askedAsset.length <= 56 ? '' : props.askedAsset.slice(0,56);
    const askedAssetTN = props.askedAsset.length <= 56 ? lovelaceHex: props.askedAsset.slice(56);
    const offeredAssetMPH = offeredAsset.slice(0,56);
    const offeredAssetTN = offeredAsset.slice(56);

    if (props.askedAssetQty < 1) {
      toast({
        title: "Open Swap Error",
        description: "Aksed Asset Quantify must be one or greater",
        duration: 10000,
        isClosable: true,
        position: 'bottom-right',
        status: 'error'
      })
      props.onClose(false)
      console.error("Aksed Asset Quantify must be one or greater")
      return
    }

    if (!props.walletAPI) {
      toast({
        title: "Open Swap Error",
        description: "walletAPI is not set",
        duration: 10000,
        isClosable: true,
        position: 'bottom-right',
        status: 'error'
      })
      props.onClose(false),
      console.error("walletAPI is not set")
      return
    }

    if (props.description === "") {
      toast({
        title: "Open Swap Error",
        description: "No description provided",
        duration: 10000,
        isClosable: true,
        position: 'bottom-right',
        status: 'error'
      })
      props.onClose(false),
      console.error("description not provided")
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

      if (!baseAddr.stakingHash) {
        toast({
          title: "Open Swap Error",
          description: "Invalid wallet address, no stake key found",
          duration: 10000,
          isClosable: true,
          position: 'bottom-right',
          status: 'error'
        })
        props.onClose(false),
        console.error("Invalid wallet address, no stake key found")
        return
      }

      // Start building the transaction
      const tx = new Tx();

      // Add the UTXO as inputs
      tx.addInputs(utxos[0]);

      // Read in the beacon minting policy and apply the contract parameters
      const beaconPolicy = new BeaconPolicy();
      const pkh = PubKeyHash.fromHex(ownerPkh);
      beaconPolicy.parameters = {["OWNER_PKH"] : pkh.hex};
 
      // Compile the helios minting script
      const beaconCompiledPolicy = beaconPolicy.compile(optimize);
      const beaconMPH = beaconCompiledPolicy.mintingPolicyHash;

      // Add the script as a witness to the transaction
      tx.attachScript(beaconCompiledPolicy);

      // Load in the vesting validator script (program)
      const holdingValidator = new HoldingValidator();
      holdingValidator.parameters = {["STAKE_PKH"] : baseAddr.stakingHash};
      holdingValidator.parameters = {["TN"] : offeredAssetTN};
      holdingValidator.parameters = {["BEACON_MPH"] : beaconMPH.hex};

      // Compile the vesting validator
      const holdingCompiledValidator = holdingValidator.compile(optimize);

      // Get the validator address
      const holdValAddr = Address.fromHashes(holdingCompiledValidator.validatorHash);

      // Get the UTXO of the released assets
      const holdingUtxo = await getAssetUtxo(holdValAddr.toBech32(), offeredAsset);
      
      // Add the holding script as a witness to the transaction
      tx.attachScript(holdingCompiledValidator);

      // Create the holding redeemer
      const holdingRedeemer = (new holdingValidator.types.Redeemer.Transfer())._toUplcData();
      
      // Add the holding validator UTXO as an input
      tx.addInput(holdingUtxo, holdingRedeemer);

      // Create the Mint redeemer using txId and 
      // txIdx to create unique beacon token name
      const utxoId = utxos[0][0].outputId.txId.hex;
      const utxoIdx = utxos[0][0].outputId.utxoIdx;
      const mintRedeemer = (new beaconPolicy.types.Redeemer
                              .Mint(utxoId, utxoIdx.toString()))
                              ._toUplcData();

      // Create the minted tokens using the txId as a the token name
      const beaconTN = Crypto.blake2b(hexToBytes(utxoId + 
                          Buffer.from(utxoIdx.toString()).toString('hex')));
      const beaconToken = [[beaconTN, BigInt(1)]] as [[number[], bigint]];
      const beaconAssetHex = beaconMPH.hex + bytesToHex(beaconTN);
 
      // Create the minted assets
      const beaconAsset = new Assets([[beaconCompiledPolicy.mintingPolicyHash, 
                                  beaconToken]]);
      // Create the beacon value
      const beaconValue = new Value(BigInt(0), beaconAsset);

      // Add the new minted token to the transaction 
      tx.mintTokens(
          beaconMPH, 
          beaconToken, 
          mintRedeemer 
      )

      // Construct the swap script
      const showtime = new Date(props.event.showtime);
      const swapValidator = new SwapValidator();
      swapValidator.parameters = {["ASKED_MPH"] : askedAssetMPH};
      swapValidator.parameters = {["ASKED_TN"] : askedAssetTN};
      swapValidator.parameters = {["OFFERED_MPH"] : offeredAssetMPH};
      swapValidator.parameters = {["OFFERED_TN"] : offeredAssetTN};
      swapValidator.parameters = {["BEACON_MPH"] : beaconAssetHex.slice(0,56)};
      swapValidator.parameters = {["BEACON_TN"] : beaconAssetHex.slice(56)};
      swapValidator.parameters = {["HOLD_VAL_HASH"] : props.event.holdValHash};
      swapValidator.parameters = {["SHOWTIME"] : BigInt(showtime.getTime())};
      swapValidator.parameters = {["PAYMENT_PKH"] : props.event.paymentPKH};
      swapValidator.parameters = {["STAKE_PKH"] : props.event.stakePKH};
      swapValidator.parameters = {["MIN_LOVELACE"] : BigInt(minLovelace)};
   
      // Compile the helios swap validator
      const swapCompiledValidator = swapValidator.compile(optimize);

      // Get swap address
      const swapAddr = Address.fromHashes(swapCompiledValidator.validatorHash);

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
        offeredAssetValue = new Value(BigInt(props.offeredAssetQty));
      } else {
        const offeredAsset = new Assets();
        offeredAsset.addComponent(
          MintingPolicyHash.fromHex(offeredAssetMPH),
          offeredAssetTN,
          BigInt(props.offeredAssetQty)
        );
        offeredAssetValue = new Value(BigInt(0), offeredAsset);
      }

      // Construct the swap datum
      const swapDatum = new (swapValidator.types.Datum)(
        askedAssetValue,
        offeredAssetValue
      )

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

      // Check for holding validator for change to send back if any
      const datum = new ListData([]); // Dummy datum
      const assetChange = props.event.allocated - props.event.released - props.offeredAssetQty - props.event.converted;
      if ( assetChange > 0) {
        const offeredAsset = new Assets();
        offeredAsset.addComponent(
          MintingPolicyHash.fromHex(offeredAssetMPH),
          offeredAssetTN,
          BigInt(assetChange)
        );
        const offeredAssetChangeValue = new Value(BigInt(0), offeredAsset);
        tx.addOutput(new TxOutput(
          Address.fromHash(new ValidatorHash(props.event.holdValHash), isTestnet),
          (new Value(minLovelace)).add(offeredAssetChangeValue),
          Datum.inline(datum)
        ));

      }

      // Attached the metadata for the beacon minting transaction
      tx.addMetadata( 2000,
                      generateMetadataBeacon( 
                          props.askedAsset,
                          offeredAsset,
                          beaconAssetHex,
                          holdingCompiledValidator.validatorHash.hex,
                          showtime.toISOString(),
                          props.event.paymentPKH,
                          props.event.stakePKH,
                          ownerPkh,
                          minLovelace.toString()
                      )
        );

      // Specify when this transaction is valid from. This is needed so
      // time is included in the transaction which will be use by the 
      // scripts. Add two hours for time to live and offset the current time
      // by 5 mins.
      const currentTime = new Date().getTime();
      const earlierTime = new Date(currentTime - 5 * 60 * 1000);
      const laterTime = new Date(currentTime + 2 * 60 * 60 * 1000);

      tx.validFrom(earlierTime);
      tx.validTo(laterTime);
      
      // Minting the beacon token requires the owner pkh signature
      tx.addSigner(PubKeyHash.fromHex(ownerPkh));

      // Moving tickets from holding script requires stake key hash signature
      tx.addSigner(baseAddr.stakingHash!);

      // Read in the network parameter file
      const networkParamsJson = await getNetworkParams(network);
      const networkParams = new NetworkParams(networkParamsJson);

      console.log("tx: ", tx);
      // Send any change back to the buyer
      await tx.finalize(networkParams, changeAddr, utxos[1]);

      // Sign the unsigned tx to get the witness
      const signatures = await cip30WalletAPI.signTx(tx);
      tx.addSignatures(signatures);

      // Sign tx with owner signature and submit tx
      try {
        const txHash = await signSubmitTx(tx);
        console.log("txHash", txHash);

        // Add beacon token to DB
        await setBeacon(beaconMPH.hex, bytesToHex(beaconTN));

        const eventUpdate = {
          ...props.event,
          holding: props.event.holding - props.offeredAssetQty,
          released: props.event.released + props.offeredAssetQty
        }

        // Update DB with updated event
        await updateEvent(eventUpdate);

        // Add swap to DB
        const swap = new Swap(
          props.event.name,
          props.event.location,
          showtime.getTime(),
          props.event.image,
          props.description,
          props.askedAsset,
          props.askedAssetQty,
          props.event.asset,
          props.offeredAssetQty,
          beaconAssetHex,
          props.event.holdValHash,
          props.event.paymentPKH,
          props.event.stakePKH,
          ownerPkh,
          minLovelace,
          txHash,
          blockConfirmDisabled,
        )
        await setSwap(swap);

        toast({
          title: "Open Swap Success",
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
          title: "Open Swap Error",
          description: "Transaction Could Not Be Submitted",
          duration: 10000,
          isClosable: true,
          position: 'bottom-right',
          status: 'error'
        })
        console.error("Open swap failed: " + error);
        props.onClose(false)
      }

    } catch (err) {
        toast({
          title: "Open Swap Error",
          description: "Transaction Could Not Be Submitted",
          duration: 10000,
          isClosable: true,
          position: 'bottom-right',
          status: 'error'
        })
        console.error("Open swap submit tx failed", err);
        props.onClose(false)
    }
  }
  
  if (!props.isOpen) return null;

  return (
    <Modal onClose={handleClose} size='xs' isOpen={props.isOpen}>
        <ModalOverlay/>
        <ModalContent>
          <ModalHeader>Open Ticket Swap</ModalHeader>
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


