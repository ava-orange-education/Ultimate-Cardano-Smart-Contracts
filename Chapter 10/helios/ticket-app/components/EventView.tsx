import { 
  Button,
  Center,
  Container,
  Stack,
  Text } from "@chakra-ui/react"
import React, { useState } from 'react';
import useSWR from "swr";

import EventCard from './EventCard';
import MintTicketsPopup from '../pages/MintTicketsPopup';
import { WalletInfo } from '../common/types';
import { getEvents } from '../common/network';

interface EventViewProps {
  walletAPI: any,
  walletInfo: WalletInfo,
  setSwapViewRefresh: (swapRefresh: number) => void;
}

export default function EventView (props: EventViewProps) {

  const [page, setMyPage] = useState(1);
  const { data } = useSWR(props.walletInfo.stakeAddr, getEvents, {
    refreshInterval: 15000  // 15s refresh
  });
  const [isMintTicketsOpen, setIsMintTicketsOpen] = useState(false);

  const eventsPerPage = 2;
  const startIndex = (page - 1) * eventsPerPage;
  const endIndex = startIndex + eventsPerPage;
  const displayedEvents = data?.slice(startIndex, endIndex);
  
  const onMintTickets = () => {
    setIsMintTicketsOpen(true);
  };

  const handlePageChange = (newPage: number) => {
    setMyPage(newPage);
  };

  if (!props.walletAPI) {
    return(
      <Container mt="60px" mb="60px" centerContent>
          <Text fontSize="x-large">Please connect your wallet</Text>
      </Container> 
    )
  }

  return (
    <>
      <Button mb="25px" colorScheme="blue" onClick={() => onMintTickets()}>New Event</Button>
      <Stack spacing="5px">
        {displayedEvents?.map((event) => (
            <EventCard key={event.asset} 
              event={event}
              walletAPI={props.walletAPI}
              setSwapViewRefresh={props.setSwapViewRefresh} />
        ))}
      </Stack>
      <Center mt="25px">
        { data && page > 1 && (
              <Button
                onClick={() => handlePageChange(page - 1)}
              >
                Previous
              </Button>
            )
        }
        {data && endIndex < data.length && (
              <Button
                ml="10px" 
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                onClick={() => handlePageChange(page + 1)}
              >
                Next
              </Button>
            )
        }  
      </Center>
      <MintTicketsPopup
          isOpen={isMintTicketsOpen}
          onClose={setIsMintTicketsOpen}
          walletAPI={props.walletAPI}
      />
    </>
  )
};


