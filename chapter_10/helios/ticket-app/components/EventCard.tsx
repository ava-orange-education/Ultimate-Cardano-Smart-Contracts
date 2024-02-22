import { useState, useEffect } from 'react'
import { Event } from '../common/types';
import OpenSwapPopup from '../pages/OpenSwapPopup';
import ArchiveEventPopup from '../pages/ArchiveEventPopup';
import { 
  Box,
  Card,
  CardBody,
  CardFooter,
  Heading,
  Image,
  Input,
  InputLeftAddon,
  InputGroup,
  SimpleGrid,
  Stack,
  Textarea,
  Tooltip,
  useToast,
  HStack,
  Button } from '@chakra-ui/react'

  import { CheckCircleIcon } from '@chakra-ui/icons';

interface EventCardProps {
  event: Event;
  walletAPI: any;
  setSwapViewRefresh: (swapRefresh: number) => void;
}

export default function EventCard (props: EventCardProps) {
  
  const [isOpenSwapOpen, setIsOpenSwapOpen] = useState(false);
  const [isCloseEventOpen, setIsCloseEventOpen] = useState(false);
  const [cardEvent, setCardEvent] = useState<Event>(props.event);
  const [description, setDescription] = useState('');
  const [askedAsset, setAskedAsset] = useState('Ada');
  const [askedAssetQty, setAskedAssetQty] = useState('');
  const [offeredAssetQty, setOfferedAssetQty] = useState('');
  
  const toast = useToast()

  useEffect( () => {
    const updateEventsInfo = async () => {
      setAskedAssetQty('')
      setDescription('')
      setCardEvent(props.event)
    }
     updateEventsInfo();
  }, [props.event]);

  const onOpenSwap = () => {
    if (cardEvent.released + Number(offeredAssetQty) > cardEvent.allocated) {
      toast({
        title: "Open Swap Error",
        description: "Exceeded the amount of tickets that can be sold",
        duration: 10000,
        isClosable: true,
        position: 'bottom-right',
        status: 'error'
      })
      console.error("Exceeded the amount of tickets that can be sold")
      return
    }
    if (!askedAsset) {
      toast({
        title: "Open Swap Error",
        description: "Currency for the ticket sale not set",
        duration: 10000,
        isClosable: true,
        position: 'bottom-right',
        status: 'error'
      })
      console.error("Currency for the ticket sale not set")
      return
    }
    if (!askedAssetQty) {
      toast({
        title: "Open Swap Error",
        description: "Invalid ticket price",
        duration: 10000,
        isClosable: true,
        position: 'bottom-right',
        status: 'error'
      })
      console.error("Invalid ticket price")
      return
    }
    if (!offeredAssetQty) {
      toast({
        title: "Open Swap Error",
        description: "Invalid number of tickest to sell",
        duration: 10000,
        isClosable: true,
        position: 'bottom-right',
        status: 'error'
      })
      console.error("Invalid number of tickest to sell")
      return
    }
    setIsOpenSwapOpen(true);
  };

  const onArchiveEvent = () => {
    setIsCloseEventOpen(true)
  };

  const showdate = new Date(cardEvent.showtime);

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
        src={cardEvent.image} 
        alt={cardEvent.name}
      />

      <Stack>
        <CardBody>
          <Heading size='md'>{cardEvent.name}</Heading>
          <Heading mt="10px" size='sm'>Ticket Info</Heading>
          {!cardEvent.active && <Heading color="red" mt="10px" size='sm'>Archived</Heading>}
            <Box borderWidth='1px' p="5px">
              <SimpleGrid columns={2} spacing={1}>
              <Box>Location</Box>
              <Box>{cardEvent.location}</Box>
              <Box>Showtime</Box>
              <Box>{showdate.toLocaleDateString() + ' ' + showdate.toLocaleTimeString()}</Box>
              <Box>Allocated</Box>
              <Box>{cardEvent.allocated}</Box>
              <Box>Holding</Box>
              <Box>{cardEvent.holding}</Box>
              <Box>Released</Box>
              <Box>{cardEvent.released}</Box>
              <Box>Converted</Box>
              <Box>{cardEvent.converted}</Box>
              </SimpleGrid>
            </Box>
            <Box mt="5px">
              <Textarea
                id={cardEvent.txId + '-description'}
                name="description" 
                placeholder="Enter Event Description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <InputGroup size="sm" mt="5px">
                <InputLeftAddon fontFamily="monospace">
                  ADA
                </InputLeftAddon>
                <Input
                  id={cardEvent.txId + '-price'} 
                  type='price' 
                  placeholder='Price For Each Ticket' 
                  value={askedAssetQty}
                  onChange={(e) => setAskedAssetQty(e.target.value)}
                />
              </InputGroup>
              <InputGroup size="sm" mt="5px">
                <InputLeftAddon fontFamily="monospace">
                  Qty
                </InputLeftAddon>
                <Input
                  id={cardEvent.txId + '-qty'}
                  type='number' 
                  placeholder='Number Of Tickets To Sell' 
                  value={offeredAssetQty}
                  onChange={(e) => setOfferedAssetQty(e.target.value)}
                />            
              </InputGroup>
            </Box>
        </CardBody>
        <CardFooter>
          <HStack>
            <Button
              colorScheme="blue"
              isDisabled={!cardEvent.active || !cardEvent.confirmed}
              onClick={() => onOpenSwap()}>Sell Tickets
            </Button>
            <Button 
              colorScheme="red"
              isDisabled={!cardEvent.active || !cardEvent.confirmed}
              onClick={() => onArchiveEvent()}>Archive Event
            </Button>
            <Tooltip label={cardEvent.confirmed?"Blockchain confirmed":"Waiting for blockchain confirmations"}>
                  <CheckCircleIcon color={cardEvent.confirmed?"green":"grey"}/>
            </Tooltip>
          </HStack>
        </CardFooter>
      </Stack>
    </Card>
    <OpenSwapPopup
      askedAsset={askedAsset === 'Ada' ? 'lovelace' : askedAsset}
      askedAssetQty={askedAsset === 'Ada' ? Number(askedAssetQty) * 1_000_000 : Number(askedAssetQty)}
      offeredAssetQty={Number(offeredAssetQty)}
      description={description}
      isOpen={isOpenSwapOpen}
      walletAPI={props.walletAPI}
      onClose={setIsOpenSwapOpen}
      event={props.event}
      setSwapViewRefresh={props.setSwapViewRefresh}
    />
    <ArchiveEventPopup
      isOpen={isCloseEventOpen}
      walletAPI={props.walletAPI}
      onClose={setIsCloseEventOpen}
      event={props.event}
    />
  </>
  )
}

