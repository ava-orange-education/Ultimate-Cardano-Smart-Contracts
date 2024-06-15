import React, { useState, useEffect } from 'react';
import { 
  Button,
  Center,
  HStack,
  Stack 
} from '@chakra-ui/react';
import 
  useSWR,
  { useSWRConfig } from "swr";

import { 
  getFilterSwaps
} from '../common/network';
import { 
  Filter,
  WalletInfo 
} from '../common/types';
import SwapCard from './SwapCard';
import FilterPopup from '../pages/FilterPopup';

interface SwapViewProps {
  walletAPI: any,
  walletInfo: WalletInfo,
  swapRefresh: number,
  setSwapViewRefresh: (swapRefresh: number) => void;
}

export default function SwapView (props: SwapViewProps) {
  
  const [page, setMyPage] = useState(1);
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>({
      text: '',
      offeredAsset: '',
      offeredAssetQty: '',
      startDate: '',
      endDate: '',
      askedAsset:'',
      askedAssetQty:''
  });

  const { data } = useSWR(filter, getFilterSwaps, {
    refreshInterval: 15000  // 15s refresh
  });
  const swapsPerPage = 2;
  const startIndex = (page - 1) * swapsPerPage;
  const endIndex = startIndex + swapsPerPage;
  const displayedSwaps = data?.slice(startIndex, endIndex);
  const { mutate } = useSWRConfig();
  useEffect( () => {
    const filterSwaps = async () => {
        try {
          await mutate(filter); // trigger cache refresh
        } catch (err) {
          console.log("No swaps found"); // No swaps found
        }
    }
     filterSwaps();
  }, [props.swapRefresh, filter]);


  const handlePageChange = (newPage: number) => {
    setMyPage(newPage);
  };

  return (
    <>
      <Button mb="25px" colorScheme="blue" onClick={() => setIsOpen(true)}>Filter</Button>
      <Stack spacing="5px">
          {displayedSwaps?.map((swap) => (
              <SwapCard 
                key={swap.beaconAsset} 
                swap={swap}
                walletAPI={props.walletAPI}
                walletInfo={props.walletInfo}
                setSwapViewRefresh={props.setSwapViewRefresh} 
              />))
          }
      </Stack>
      <Center mt="25px">
        <HStack>
        {data && page > 1 && (
            <Button
              onClick={() => handlePageChange(page - 1)}
            >
              Previous
            </Button>
          )}
          {data && endIndex < data.length && (
            <Button
              ml="10px"
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              onClick={() => handlePageChange(page + 1)}
            >
              Next
            </Button>
          )}
        </HStack>
      </Center>
      <FilterPopup
        isOpen={isOpen}
        onClose={setIsOpen}
        filter={filter}
        setFilter={setFilter}
      />
    </> 
  )
};

