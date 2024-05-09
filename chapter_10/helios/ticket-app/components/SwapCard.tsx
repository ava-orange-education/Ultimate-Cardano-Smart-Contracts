import React, { useEffect, useState } from 'react';
import { 
  Button,
  Box,
  Card,
  CardBody,
  CardFooter,
  Center,
  Heading,
  HStack,
  Image,
  Input,
  InputGroup,
  InputLeftAddon,
  SimpleGrid,
  Spinner,
  Stack,
  Tooltip,
  useToast
} from '@chakra-ui/react';

import { CheckCircleIcon } from '@chakra-ui/icons';

import { 
  getEvent,
  isTestnet 
} from '../common/network';
import { convertIpfsUrl } from '../common/utils';
import {  
  Event, 
  Swap,
  WalletInfo 
} from '../common/types';
import ExecuteSwapPopup from '../pages/ExecuteSwapPopup';
import UpdateSwapPopup from '../pages/UpdateSwapPopup';
import CloseSwapPopup from '../pages/CloseSwapPopup';

import {
  PubKeyHash, 
  StakeAddress
} from '@hyperionbt/helios';

interface SwapCardProps {
  swap: Swap;
  walletAPI: any;
  walletInfo: WalletInfo
  setSwapViewRefresh: (swapRefresh: number) => void;
}

export default function SwapCard (props: SwapCardProps) {
  
  // Check if asked asset is in lovelace to show user the amount in Ada
  const askedAssetCheck = props.swap.askedAsset === 'lovelace' ? 'Ada' : props.swap.askedAsset
  const askedAssetQtyCheck = props.swap.askedAsset === 'lovelace' ? Number(props.swap.askedAssetQty) / 1_000_000 : props.swap.askedAssetQty

  const [buySwapOpen, setBuySwapOpen] = useState(false);
  const [updateSwapOpen, setUpdateSwapOpen] = useState(false);
  const [closeSwapOpen, setCloseSwapOpen] = useState(false);
  const [askedAsset, setAskedAsset] = useState(askedAssetCheck);
  const [askedAssetQty, setAskedAssetQty] = useState(askedAssetQtyCheck);
  const [buyQty, setBuyQty] = useState('');
  const [event, setEvent] = useState<Event>();
  const [amountTotal, setAmounTotal] = useState(0);
  const toast = useToast();
  const showtime = new Date(props.swap.showtime)

  useEffect( () => {
    const updateEventsInfo = async () => {

        try {
          const event = await getEvent(props.swap.offeredAsset);        
          setEvent(event);
          setBuyQty('')
        } catch (err) {
          // No events found, set to 0
          //console.error("SwapCard: updateEventsInfo: ", err);
          setEvent(undefined);
          setBuyQty('')
        }
    }
     updateEventsInfo();
  }, [props.swap]);

  useEffect( () => {
    setAmounTotal(Number(buyQty) * askedAssetQty)
  }, [buyQty]);


  const onBuySwap = () => {
    if (buyQty === '') {
      toast({
        title: "Buy Swap Error",
        description: "Buy Quantity not set",
        duration: 10000,
        isClosable: true,
        position: 'bottom-right',
        status: 'error'
      })
      console.error("Buy Quantity not set")
      return
    } 
    if (Number(buyQty) < 1) {
      toast({
        title: "Buy Swap Error",
        description: "Buy Quantity must be one or greater",
        duration: 10000,
        isClosable: true,
        position: 'bottom-right',
        status: 'error'
      })
      console.error("Buy Quantity must be one or greater")
      return
    }
    setBuySwapOpen(true);
  };

  const onUpdateSwap = () => {

    if (Number(askedAssetQty) < 1) {
      toast({
        title: "Buy Swap Error",
        description: "Price must be one or greaterr",
        duration: 10000,
        isClosable: true,
        position: 'bottom-right',
        status: 'error'
      })
      console.error("Price must be one or greater")
      return
    }
    setUpdateSwapOpen(true);
  };

  const onCloseSwap = () => {
    setCloseSwapOpen(true);
  };

  if (!event) {
    return  (
      <Center>
        <Heading>Loading Ticket</Heading>
      <Spinner size='xl' color='blue.500'/>
      </Center>
    )
  }

  const swapCardStakeAddr = StakeAddress.fromHash(isTestnet, new PubKeyHash(props.swap.stakePKH)).toBech32();

    // Show user updatedable swap if the stake key matches
    if (props.walletAPI && swapCardStakeAddr === props.walletInfo.stakeAddr) {
    
      return (
        <>
          <Card
            direction={{ base: 'column', sm: 'row' }}
            overflow='hidden'
            variant='outline'
          >
          <Image
            objectFit='cover'
            maxW={{ base: '100%', sm: '200px' }}
            src={convertIpfsUrl(props.swap.image)} 
            alt={props.swap.name}
          />
    
          <Stack>
            <CardBody>
              <Heading size='md'>{props.swap.name}</Heading>
              <Box borderWidth='1px' borderRadius='sm' p="5px" mt="5px">
                <SimpleGrid columns={2} spacing={1}>
                  <Box>Location</Box>
                  <Box>{props.swap.location}</Box>
                  <Box>Description</Box>
                  <Box>{props.swap.description}</Box>
                  <Box>Showtime</Box>
                  <Box>{showtime.toLocaleString()}</Box>
                  <Box>Tickets Available</Box>
                  <Box>{props.swap.offeredAssetQty}</Box>
                </SimpleGrid>
              </Box>
              <InputGroup size="sm" mt="5px">
                <InputLeftAddon fontFamily="monospace">
                {askedAsset}
                </InputLeftAddon>
                <Input
                  id={props.swap.beaconAsset} 
                  type='price' 
                  placeholder={askedAssetQty.toString()}
                  value={askedAssetQty.toString()}
                  onChange={(e) => setAskedAssetQty(Number(e.target.value))}
                />
              </InputGroup>
            </CardBody>
            <CardFooter>
              <HStack>
                <Button
                  colorScheme="blue"
                  isDisabled={!props.swap.confirmed}
                  onClick={() => onUpdateSwap()}>Update Swap
                </Button>
                <Button 
                  colorScheme="red"
                  isDisabled={!props.swap.confirmed}
                  onClick={() => onCloseSwap()}>Close Swap
                </Button>
                <Tooltip label={props.swap.confirmed?"Blockchain confirmed":"Waiting for blockchain confirmations"}>
                  <CheckCircleIcon color={props.swap.confirmed?"green":"grey"}/>
                </Tooltip>
              </HStack>
            </CardFooter>
          </Stack>
        </Card>
        <UpdateSwapPopup
            isOpen={updateSwapOpen}
            onClose={setUpdateSwapOpen}
            askedAssetQty={askedAsset === 'Ada' ? Number(askedAssetQty) * 1_000_000 : Number(askedAssetQty)}
            swap={props.swap}
            setSwapViewRefresh={props.setSwapViewRefresh}
            walletAPI={props.walletAPI}
        />
        <CloseSwapPopup
            isOpen={closeSwapOpen}
            onClose={setCloseSwapOpen}
            event={event}
            swap={props.swap}
            setSwapViewRefresh={props.setSwapViewRefresh}
            walletAPI={props.walletAPI}
          />
        </>
      )
    }
    else {

      return (
        <>
          <Card
            direction={{ base: 'column', sm: 'row' }}
            overflow='hidden'
            variant='outline'
          >
          <Image
            objectFit='cover'
            maxW={{ base: '100%', sm: '200px' }}
            src={convertIpfsUrl(props.swap.image)} 
            alt={props.swap.name}
          />
    
          <Stack>
            <CardBody>
              <Heading size='md'>{props.swap.name}</Heading>
              <Box borderWidth='1px' borderRadius='sm' p="5px" mt="5px">
                <SimpleGrid columns={2} spacing={1}>
                  <Box>Location</Box>
                  <Box>{props.swap.location}</Box>
                  <Box>Description</Box>
                  <Box>{props.swap.description}</Box>
                  <Box>Showtime</Box>
                  <Box>{showtime.toLocaleString()}</Box>
                  <Box>Tickets Available</Box>
                  <Box>{props.swap.offeredAssetQty}</Box>
                  <Box>Price</Box>
                  <Box>{askedAssetQty} {askedAsset}</Box>
                  <Box>{askedAsset} Total</Box>
                  <Box>{amountTotal}</Box>
                </SimpleGrid>
              </Box>
              <InputGroup size="sm" mt="5px">
                <InputLeftAddon fontFamily="monospace">
                  Qty
                </InputLeftAddon>
              <Input
                id={props.swap.beaconAsset}
                type='number' 
                placeholder='Number Of Tickets To Buy' 
                value={buyQty}
                onChange={(e) => setBuyQty(e.target.value)}
              />            
            </InputGroup>
            </CardBody>
            <CardFooter>
              <HStack>
                <Button
                  colorScheme="blue"
                  isDisabled={!props.swap.confirmed}
                  onClick={() => onBuySwap()}>Buy Tickets
                </Button>
                <Tooltip label={props.swap.confirmed?"Blockchain confirmed":"Waiting for blockchain confirmations"}>
                  <CheckCircleIcon color={props.swap.confirmed?"green":"grey"}/>
                </Tooltip>
              </HStack>
            </CardFooter>
          </Stack>
        </Card>
        <ExecuteSwapPopup
              isOpen={buySwapOpen}
              onClose={setBuySwapOpen}
              event={event}
              swap={props.swap}
              setSwapViewRefresh={props.setSwapViewRefresh}
              buyQty={Number(buyQty)}
              walletAPI={props.walletAPI}
          />
      </>
    )
  }  
};
