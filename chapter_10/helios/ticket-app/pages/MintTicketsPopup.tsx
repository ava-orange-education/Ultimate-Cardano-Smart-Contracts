import React, { useState } from 'react';
import NextLink from 'next/link';
import { useSWRConfig } from 'swr';
import validator from 'validator';

import { generateMetadataTicket } from '../common/metadata';
import {  
  blockConfirmDisabled,
  getNetworkParams,
  network,
  setEvent, 
  setStakeKey,
  signSubmitTx
} from '../common/network';
import BeaconPolicy from '../public/contracts/beacon.hl'
import MintTickets from '../components/MintTickets';
import NFTMinting from '../public/contracts/ticket.hl';
import HoldingValidator from '../public/contracts/holding.hl';
import { Event } from '../common/types';
import { 
  Box,
  Button,
  Center,
  Link,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Spinner,
  Text,
  useToast  } from '@chakra-ui/react';

import {
  Address,
  Assets,
  config,
  Cip30Wallet,
  Datum,
  hexToBytes,
  ListData,
  NetworkParams,
  PubKeyHash,
  Value,
  StakeAddress,
  TxOutput,
  Tx,
  WalletHelper} from "@hyperionbt/helios";

import {
  optimize
} from '../config/heliosCompiler';

// Helios config settings
config.set({AUTO_SET_VALIDITY_RANGE: true})

interface MintTicketsPopupProps {
  isOpen: boolean;
  walletAPI: any;
  onClose: (isOpen: boolean) => void;
}

export default function MintTicketsPopup (props: MintTicketsPopupProps) {
  
  const [isLoading, setIsLoading] = useState(false);
  const [tx, setTx] = useState({ txId : '' });
  const toast = useToast();
  const { mutate } = useSWRConfig();

  const handleClose = async () => {
    props.onClose(false);
    setTx({ txId : ''});
  }

  const mint = async (params: any) => {

    if (params[0].length < 5 ){
      toast({
        title: "Mint Tickets Error",
        description: "Invalid inputs",
        duration: 10000,
        isClosable: true,
        position: 'bottom-right',
        status: 'error'
      })
      console.error("Invalid input");
    }
    // TODO sanitize inputs
    const name = params[0] as string;
    const location = params[1] as string;
    const tokenName = Buffer.from(name).toString('hex');
    const image = params[2] as string;
    const qty = parseInt(params[3] as string);
    const showtimeLocalStr = params[4] as string;
    const showtimeLocal = new Date(showtimeLocalStr);
    const showtime = new Date(showtimeLocal.toUTCString());

    if (qty < 1) {
      toast({
        title: "Mint Tickets Error",
        description: "Ticket quantify must be one or greater",
        duration: 10000,
        isClosable: true,
        position: 'bottom-right',
        status: 'error'
      })
      console.error("Ticket quantify must be one or greater")
      return
    }
    if (!props.walletAPI) {
      toast({
        title: "Mint Tickets Error",
        description: "Wallet is not connected",
        duration: 10000,
        isClosable: true,
        position: 'bottom-right',
        status: 'error'
      })
      console.error("Wallet is not connected");
      return
    }
    setIsLoading(true);
    try {
      const cip30WalletAPI = new Cip30Wallet(props.walletAPI);
      const walletHelper = new WalletHelper(cip30WalletAPI);
      const minLovelace : number = 2000000; // minimum lovelace needed to send an NFT
      const maxTxFee: number = 500000; // maximum estimated transaction fee
      const minChangeAmt: number = 1000000; // minimum lovelace needed to be sent back as change
      const minLovelaceVal = new Value(BigInt(minLovelace));
      const minUTXOVal = new Value(BigInt(minLovelace + maxTxFee + minChangeAmt));  
      const ownerPkh = process.env.NEXT_PUBLIC_OWNER_PKH!;

      // Get wallet UTXOs
      const utxos = await walletHelper.pickUtxos(minUTXOVal);

      // Get change address
      const changeAddr = await walletHelper.changeAddress;

      // Get base address
      const baseAddr = await walletHelper.baseAddress;

      if (!baseAddr.pubKeyHash) {
        toast({
          title: "Mint Tickets Error",
          description: "Invalid wallet address, no public spending key found",
          duration: 10000,
          isClosable: true,
          position: 'bottom-right',
          status: 'error'
        })
        console.error("Invalid wallet address, no public spending key found")
        setIsLoading(false);
        return
      }

      if (!baseAddr.stakingHash) {
        toast({
          title: "Mint Tickets Error",
          description: "Invalid wallet address, no staking key found",
          duration: 10000,
          isClosable: true,
          position: 'bottom-right',
          status: 'error'
        })
        console.error("Invalid wallet address, no staking key found")
        setIsLoading(false);
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

      // Load in the vesting validator script (program)
      const holdingValidator = new HoldingValidator();
      holdingValidator.parameters = {["STAKE_PKH"] : baseAddr.stakingHash};
      holdingValidator.parameters = {["TN"] : tokenName};
      holdingValidator.parameters = {["BEACON_MPH"] : beaconMPH.hex};

      // Compile the vesting validator
      const holdingCompiledValidator = holdingValidator.compile(optimize);

      // Get the validator address
      const holdValHash = holdingCompiledValidator.validatorHash;
      const holdValAddr = Address.fromHashes(holdValHash);

      // Read in the ticket minting policy and apply the contract parameters
      const utxoId = utxos[0][0].outputId.txId.hex;
      const utxoIdx = utxos[0][0].outputId.utxoIdx;
      const ticketMinting = new NFTMinting();
      ticketMinting.parameters = {["TX_ID"] : utxoId};
      ticketMinting.parameters = {["TX_IDX"] : utxoIdx};
      ticketMinting.parameters = {["TN"] : tokenName};
      ticketMinting.parameters = {["SHOWTIME"] : BigInt(showtime.getTime())};
      ticketMinting.parameters = {["QTY"] : BigInt(qty)};
      ticketMinting.parameters = {["PAYMENT_PKH"] : baseAddr.pubKeyHash!.hex};
      ticketMinting.parameters = {["STAKE_PKH"] : baseAddr.stakingHash!.hex};
      ticketMinting.parameters = {["HOLD_VAL_HASH"] : holdValHash.hex};
      ticketMinting.parameters = {["MIN_LOVELACE"] : BigInt(minLovelace)};

      // Compile the helios minting script
      const ticketCompiledMinting = ticketMinting.compile(optimize);

      // Add the script as a witness to the transaction
      tx.attachScript(ticketCompiledMinting);

      // Create the minting claim redeemer
      const mintRedeemer = (new ticketMinting.types.Redeemer.Mint())
                              ._toUplcData();

      // Create the minted tokens
      const tokens = [[hexToBytes(tokenName), BigInt(qty)]] as [[number[], bigint]];

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

      // Create a dummy datum
      const datum = new ListData([]);

      // Construct the output to send ticket token(s) to the address
      // from the user input
      tx.addOutput(new TxOutput(
        holdValAddr,
        new Value(minLovelaceVal.lovelace, assets),
        Datum.inline(datum)
      ));

      // Attached the metadata for the minting transaction
      tx.addMetadata( 721,
                      generateMetadataTicket( 
                          ticketCompiledMinting.mintingPolicyHash.hex,
                          name,
                          location,
                          showtime.toUTCString(),
                          image,
                          BigInt(qty),
                          baseAddr.pubKeyHash.hex,
                          baseAddr.stakingHash.hex,
                          utxoId,
                          utxoIdx,
                          holdValHash.hex,
                          minLovelace
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

      tx.addSigner(baseAddr.pubKeyHash);
      tx.addSigner(baseAddr.stakingHash);
      tx.addSigner(new PubKeyHash(ownerPkh));

      // Read in the network parameter file
      const networkParamsJson = await getNetworkParams(network);
      const networkParams = new NetworkParams(networkParamsJson);

     // Send any change back to the buyer
      await tx.finalize(networkParams, changeAddr, utxos[1]);

      // Sign the unsigned tx to get the witness
      const signatures = await cip30WalletAPI.signTx(tx);
      tx.addSignatures(signatures);

      // Submit the signed tx
      const txHash = await signSubmitTx(tx);
      console.log("txHash", txHash);

      // Update DB, linking stake key to asset
      const asset = ticketCompiledMinting.mintingPolicyHash.hex + tokenName;
      await setStakeKey( StakeAddress.fromAddress(baseAddr).toBech32(), asset);
      
      const event = new Event(
                        asset,
                        name,
                        location,
                        showtime.toUTCString(),
                        image,
                        qty,  // allocate tickets
                        qty,  // ticket at holding validator
                        0,    // tickets released to swaps
                        0,    // converted (sold) tickets
                        holdValHash.hex,
                        baseAddr.pubKeyHash.hex,
                        baseAddr.stakingHash.hex,
                        txHash,
                        blockConfirmDisabled,
                        true
                      )
      // Update DB with new event
      await setEvent(event);

      //props.setEventViewRefresh(true);

      setTx({ txId: txHash });
      setIsLoading(false);

      toast({
        title: "Mint Ticket Success",
        description: <Box fontSize='x-small'>TxId: {txHash}</Box>,
        duration: 10000,
        isClosable: true,
        position: 'bottom-right',
        status: 'success',
      })
      // Refresh event view
      await mutate(StakeAddress.fromAddress(baseAddr).toBech32());
      await handleClose();

    } catch (err) {
        setIsLoading(false);
        toast({
          title: "Mint Tickets Error",
          description: "Could not submit transaction",
          duration: 10000,
          isClosable: true,
          position: 'bottom-right',
          status: 'error'
        })
        console.error("Could not submit transaction", err)
    }
  }
  
  if (!props.isOpen) return null;

  return (
    <Modal onClose={handleClose} size='xs' isOpen={props.isOpen}>
        <ModalOverlay/>
        <ModalContent>
          <ModalHeader>Mint Tickets</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Center>
              { props.walletAPI && !tx.txId && !isLoading && 
                <MintTickets onMint={mint}/>
              }
              { isLoading && 
                <Spinner size='xl' color='blue.500'/>
              }
            </Center>
            <Center>
              <Link as={NextLink} 
                    href='/contracts/ticket.hl'
                    size='xs'
                    mt='10px'>
                <Text fontSize='sm'>Smart Contract: ticket.hl</Text>
              </Link>
            </Center>
          </ModalBody>
          <ModalFooter>
            <Button 
              onClick={handleClose}
              mr="15px"
            >Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
  )
};

