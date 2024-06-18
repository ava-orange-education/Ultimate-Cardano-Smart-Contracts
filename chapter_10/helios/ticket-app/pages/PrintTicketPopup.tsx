import React, { useState, useEffect } from 'react';
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
  Spinner,
  Text,
  Heading,
  VStack,
  HStack
 } from "@chakra-ui/react"

import {  
  getAssetUtxo,
  getNetworkParams,
  getTicketPkh,
  network,
  printTicket,
  verifyTicket,
  signSubmitTx
} from '../common/network';

import TicketRefVal from '../public/contracts/ticketRefVal.hl'
import { 
  PrintTicketInfo,
} from '../common/types';
import {
  Address,
  Assets,
  ByteArrayData,
  config,
  Cip30Wallet,
  ConstrData,
  Datum,
  hexToBytes,
  IntData,
  MapData,
  NetworkParams,
  Signature,
  Value,
  textToBytes,
  TxOutput,
  Tx,
  WalletHelper,
  PubKeyHash
} from "@hyperionbt/helios";

import QRCodeGenerator from '../components/QRCodeGenerator';

import {
  optimize
} from '../config/heliosCompiler';

// Helios config settings
config.set({AUTO_SET_VALIDITY_RANGE: true})

interface PrintTicketProps {
  isOpen: boolean;
  onClose: (isOpen: boolean) => void;
  walletAPI: any;
  ticket: undefined | PrintTicketInfo;
  onPrintTicketRefresh: (isOpen: boolean) => void;
  printTicketRefresh: boolean;
}

export default function printTicketPopup (props: PrintTicketProps) {

  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
 
  // Used For Ticket Verification Simulation Only
  const [verifyQRCode, setQRCode] = useState('')

  const toast = useToast();
 
  useEffect(() => {
    const printTicketPopupStart = async () => {
      const name = props.ticket!.name.split("|")[0]
      const location = props.ticket!.location
      const date = (new Date(props.ticket!.showtime)).toLocaleString()
      setName(name)
      setLocation(location)
      setDate(date)
      await printTicketTransaction();
    };
    if (props.isOpen) {
    printTicketPopupStart();
    }
  }, [props.isOpen]); 

  const handleVerify = async () => {
    
    try {

      const qrCodeItems = verifyQRCode.split("|")
      const qrAsset = qrCodeItems[0]
      const qrTicketMsg = qrCodeItems[1]
      const qrTicketSig = qrCodeItems[2]
      
      const ticketPkh = await getTicketPkh(qrAsset)
      const sig = Signature.fromCbor(hexToBytes(qrTicketSig))
      if (sig.pubKeyHash.hex !== ticketPkh) {
        throw new Error("ticket pkh does not match signature")
      }
      sig.verify(hexToBytes(qrTicketMsg))
      await verifyTicket(props.ticket!.asset, ticketPkh)

      toast({
        title: "Ticket Verification",
        description: "Ticket Verification Success!!!",
        duration: 10000,
        isClosable: true,
        position: 'bottom-right',
        status: 'success'
      })

    } catch (err) {
      console.error("handleVerify: ", err)
      toast({
        title: "Ticket Verification",
        description: "Ticket Verification Failed",
        duration: 10000,
        isClosable: true,
        position: 'bottom-right',
        status: 'error'
      })
    }
  }

  const handleClose = async () => {
    props.onPrintTicketRefresh(true)
    props.onClose(false);
  }

  const printTicketTransaction = async () => {

    if (!props.walletAPI) {
      toast({
        title: "Show Ticket Error",
        description: "Wallet is not connected",
        duration: 10000,
        isClosable: true,
        position: 'bottom-right',
        status: 'warning'
      })
      console.error("Wallet is not connected")
      return
    }

    if (!props.ticket) {
      toast({
        title: "Show Ticket Error",
        description: "No ticket was selected",
        duration: 10000,
        isClosable: true,
        position: 'bottom-right',
        status: 'warning'
      })
      console.error("No ticket was selected")
      return
    }
    setIsLoading(true);
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
      
      // Load in the ticket reference validator script (program)
      const ticketRefVal = new TicketRefVal();
      ticketRefVal.parameters = {["OWNER_PKH"] : ownerPkh};
      ticketRefVal.parameters = {["TN"] : props.ticket.name.split("|")[1]};

      // Compile the vesting validator
      const ticketRefValCompiled = ticketRefVal.compile(optimize);

      // Add the holding script as a witness to the transaction
      tx.attachScript(ticketRefValCompiled);
      
      // Build unique token name for each converted ticket
      // and follow CIP-67 label convention
      const label100hex = "000643b0";   // Reference Token Label
      const reftokenName = label100hex + Buffer.from(props.ticket.name).toString('hex')

      const refToken = [hexToBytes(reftokenName),
                        BigInt(1)] as [number[], bigint];

      const refAssets = new Assets([[props.ticket.mph , [refToken]]])
        
      // Get the validator address
      const ticketRefValAddr = Address.fromHashes(ticketRefValCompiled.validatorHash);

      // Get the UTXO with reference token
      const refTokenUtxo = await getAssetUtxo(ticketRefValAddr.toBech32(),props.ticket.mph + reftokenName);
      
      // Create the holding redeemer
      const holdingRedeemer = (new ticketRefVal.types.Redeemer.Used())._toUplcData();
      
      // Add the holding validator UTXO as an input
      tx.addInput(refTokenUtxo, holdingRedeemer);
      
      // Build the CIP-068 metadata datum
      const nameKey = new ByteArrayData(textToBytes("name"));
      const nameValue = new ByteArrayData(textToBytes(props.ticket.name));
      const locationKey = new ByteArrayData(textToBytes("location"));
      const locationValue = new ByteArrayData(textToBytes(props.ticket.location));
      const imageKey = new ByteArrayData(textToBytes("image"));
      const imageValue = new ByteArrayData(textToBytes(props.ticket.image));
      const showtimeKey = new ByteArrayData(textToBytes("showtime"));
      const showtimeValue = new IntData(BigInt(props.ticket.showtime));
      const pkhKey = new ByteArrayData(textToBytes("pkh"));
      const pkhValue = new ByteArrayData(hexToBytes(baseAddr.pubKeyHash!.hex));
      const mapData = new MapData([ [nameKey, nameValue],
                                    [imageKey, imageValue]] );
      const version = new IntData(BigInt(1));
      const extraData = new MapData([ [locationKey, locationValue],
                                      [showtimeKey, showtimeValue],
                                      [pkhKey, pkhValue]] );
      const cip068Datum = new ConstrData(0, [mapData, version, extraData]);
      const cip68InlineDatum = Datum.inline(cip068Datum);
      
      // Create the output for the reference token update
      tx.addOutput(new TxOutput(
        ticketRefValAddr,
        new Value(minLovelace, refAssets),
        cip68InlineDatum
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
  
      // Reference token requires the current ticket holder and owner pkh
      tx.addSigner(baseAddr.pubKeyHash!);
      tx.addSigner(new PubKeyHash(ownerPkh))

      // Read in the network parameter file
      const networkParamsJson = await getNetworkParams(network);
      const networkParams = new NetworkParams(networkParamsJson);

     // Send any change back to the buyer
      await tx.finalize(networkParams, changeAddr, utxos[1]);

      // Sign the unsigned tx to get the witness
      const signatures = await cip30WalletAPI.signTx(tx);
      tx.addSignatures(signatures);
 
      // Sign tx with owner signature and submit tx
      try {
        const txHash = await signSubmitTx(tx);
        
        await printTicket(
          props.ticket.asset,
          baseAddr.pubKeyHash!.hex
        )

        toast({
          title: "Print Ticket Success",
          description: <Box fontSize='x-small'>TxId: {txHash}</Box>,
          duration: 10000,
          isClosable: true,
          position: 'bottom-right',
          status: 'success'
        })
        setIsLoading(false)
 
        const qrCode = props.ticket.asset + "|" + txHash + "|" + signatures[0].toCborHex()
        setQRCode(qrCode)

      } catch (error) {
        toast({
          title: "Print Ticket Error",
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
          title: "Print Ticket Error",
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
          <ModalHeader>Print Ticket</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Center>
              {isLoading && <Spinner size="xl" color='blue.500'/>}
              {!isLoading && 
                <VStack>
                  <Heading size="sm">{name}</Heading>
                  <Text>{location}</Text>
                  <Text>{date}</Text>
                  <QRCodeGenerator text={verifyQRCode}/>
                </VStack>
              }
            </Center>
          </ModalBody>
          <ModalFooter>
          {!isLoading &&
            <HStack mr="30px">
              <Button 
                colorScheme="blue" 
                onClick={handleVerify}>Verify Ticket</Button>
              <Button onClick={handleClose}>Close</Button>
            </HStack>
          }
          </ModalFooter>
        </ModalContent>
      </Modal>
  )
};

