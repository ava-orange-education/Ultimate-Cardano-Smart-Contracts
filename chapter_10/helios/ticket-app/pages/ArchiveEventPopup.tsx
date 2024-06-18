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
import { useSWRConfig } from 'swr';

import {  
  blockConfirmDisabled,
  getAssetUtxo,
  getNetworkParams,
  getTicketMetadataCIP25,
  network,
  signSubmitTx,
  updateEvent,
} from '../common/network';
import HoldingValidator from '../public/contracts/holding.hl';
import NFTMinting from '../public/contracts/ticket.hl';
import BeaconPolicy from '../public/contracts/beacon.hl'
import { 
  Event
} from '../common/types';
import {
  Address,
  config,
  Cip30Wallet,
  hexToBytes,
  NetworkParams,
  PubKeyHash,
  StakeAddress,
  Value,
  Tx,
  WalletHelper,
} from "@hyperionbt/helios";

import {
  optimize
} from '../config/heliosCompiler';

// Helios config settings
config.set({AUTO_SET_VALIDITY_RANGE: true})

interface ArchiveEventProps {
  isOpen: boolean;
  onClose: (isOpen: boolean) => void;
  event: Event;
  walletAPI: any;
}

export default function ArchiveEventPopup (props: ArchiveEventProps) {

  const toast = useToast();
  const { mutate } = useSWRConfig();

  useEffect(() => {
    const archiveEventStart = async () => {
      await archive();
    };
    if (props.isOpen) {
    archiveEventStart();
    }
  }, [props.isOpen]); 

  const handleClose = async () => {
    props.onClose(false);
  }

  const archive = async () => {

    const ownerPkh = process.env.NEXT_PUBLIC_OWNER_PKH!;

    if (!props.walletAPI) {
      toast({
        title: "Archive Event Error",
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
      beaconPolicy.parameters = {["OWNER_PKH"] : ownerPkh};
 
      // Compile the helios minting script
      const beaconCompiledPolicy = beaconPolicy.compile(optimize);
      const beaconMPH = beaconCompiledPolicy.mintingPolicyHash;

      // Load in the vesting validator script (program)
      const holdingValidator = new HoldingValidator();
      holdingValidator.parameters = {["STAKE_PKH"] : baseAddr.stakingHash};
      holdingValidator.parameters = {["TN"] : Buffer.from(props.event.name).toString('hex')};
      holdingValidator.parameters = {["BEACON_MPH"] : beaconMPH.hex};

      // Compile the vesting validator
      const holdingCompiledValidator = holdingValidator.compile(optimize);

      // Get the validator address
      const holdValAddr = Address.fromHashes(holdingCompiledValidator.validatorHash);

      // Get the UTXO of the holding assets
      const holdingUtxo = await getAssetUtxo(holdValAddr.toBech32(), props.event.asset);
 
      // Add the holding script as a witness to the transaction
      tx.attachScript(holdingCompiledValidator);

      // Create the holding redeemer
      const holdingRedeemer = (new holdingValidator.types.Redeemer.Burn())._toUplcData();
      
      // Add the holding validator UTXO as an input
      tx.addInput(holdingUtxo, holdingRedeemer);

      // Get ticket contract params
      const ticketParams = await getTicketMetadataCIP25(props.event.asset)

      const ticketMinting = new NFTMinting();
      ticketMinting.parameters = {["TX_ID"] : ticketParams.txId};
      ticketMinting.parameters = {["TX_IDX"] : ticketParams.txIdx};
      ticketMinting.parameters = {["TN"] : ticketParams.tokenName};
      ticketMinting.parameters = {["SHOWTIME"] : ticketParams.showtime};
      ticketMinting.parameters = {["QTY"] : ticketParams.tokenQty};
      ticketMinting.parameters = {["PAYMENT_PKH"] : ticketParams.paymentPKH};
      ticketMinting.parameters = {["STAKE_PKH"] : ticketParams.stakePKH};
      ticketMinting.parameters = {["HOLD_VAL_HASH"] : ticketParams.holdValHash};
      ticketMinting.parameters = {["MIN_LOVELACE"] : ticketParams.minLovelace};

      // Compile the helios minting script
      const ticketCompiledMinting = ticketMinting.compile(optimize);

      // Add the script as a witness to the transaction
      tx.attachScript(ticketCompiledMinting);

      // Create the minting claim redeemer
      const mintRedeemer = (new ticketMinting.types.Redeemer.Burn())
                              ._toUplcData();

      // Create the minted tokens
      const tokens = [[hexToBytes(ticketParams.tokenName), BigInt(-1 * props.event.holding)]] as [[number[], bigint]];

      // Add the new minted token to the transaction which includes
      // the minting policy hash, the token name, amount and the redeemer 
      tx.mintTokens(
          ticketCompiledMinting.mintingPolicyHash, 
          tokens, 
          mintRedeemer 
      )

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
      tx.addSigner(new PubKeyHash(ownerPkh));
      
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
        const txHash = await signSubmitTx(tx);
        console.log("txHash", txHash);

        const eventUpdate = {
          ...props.event,
            allocated: props.event.allocated + props.event.holding,
            holding: 0,
            active: false,
            txId: txHash,
            confirmed: blockConfirmDisabled
        }
        // Update event to DB
        await updateEvent(eventUpdate);

        toast({
          title: "Archive Event Success",
          description: <Box fontSize='x-small'>TxId: {txHash}</Box>,
          duration: 10000,
          isClosable: true,
          position: 'bottom-right',
          status: 'success'
        })
        // Refresh event view
        await mutate(StakeAddress.fromAddress(baseAddr).toBech32());
        await handleClose();
        
      } catch (error) {
        toast({
          title: "Archive Event Error",
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
          title: "Archive Event Error",
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
          <ModalHeader>Archive Event</ModalHeader>
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

