import React, { useState } from 'react';

import { 
  Box,
  Button,
  HStack,
  VStack,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text  
} from '@chakra-ui/react';

import { Filter } from '../common/types';

interface FilterCardProps {
    isOpen: boolean;
    onClose: (isOpen: boolean) => void;
    filter: Filter;
    setFilter: (filter: Filter) => void;
}

export default function FilterPopup (props: FilterCardProps ) {
  
  const [text, setText] = useState('');
  const [offeredAsset, setOfferedAsset] = useState('');
  const [offeredAssetQty, setOfferedAssetQty] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [askedAsset, setAskedAsset] = useState('');
  const [askedAssetQty, setAskedAssetQty] = useState('');

  const handleClose = () => {
    props.onClose(false);
  }
  
  const onFilter = () => {

    props.setFilter({
      text: text,
      offeredAsset: offeredAsset,
      offeredAssetQty: offeredAssetQty,
      startDate: startDate,
      endDate: endDate,
      askedAsset: askedAsset,
      askedAssetQty: askedAssetQty
    })
  };

  const onClearFilter = () => {

    setText('');
    setOfferedAsset('');
    setOfferedAssetQty('');
    setStartDate('');
    setEndDate('');
    setAskedAssetQty('');

    props.setFilter({
      text: '',
      offeredAsset: '',
      offeredAssetQty: '',
      startDate: '',
      endDate: '',
      askedAsset: '',
      askedAssetQty: ''
    })
  };


  return (
    <Modal onClose={handleClose} size='xs' isOpen={props.isOpen}>
        <ModalOverlay/>
        <ModalContent>
          <ModalHeader>Filter Tickets</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
                <VStack>
                    <Box>
                        <Text>Text Search</Text>
                        <Input
                            type="text"
                            placeholder="Text Search"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                        ></Input>
                    </Box>
                    <Box>
                        <Text>Offered Asset</Text>
                        <Input
                            type="string" 
                            value={offeredAsset}
                            placeholder="Offered Asset"
                            onChange={(e) => setOfferedAsset(e.target.value)}
                        ></Input>
                    </Box>
                    <Box>
                        <Text>Offered Quantity</Text>
                        <Input
                            type="string" 
                            value={offeredAssetQty}
                            placeholder="Ticket Name"
                            onChange={(e) => setOfferedAssetQty(e.target.value)}
                        ></Input>
                    </Box>
                    <Box>
                        <Text>Asked Asset</Text>
                        <Input
                            type="string" 
                            value={askedAsset}
                            placeholder="Asked Asset"
                            onChange={(e) => setAskedAsset(e.target.value)}
                        ></Input>
                    </Box>
                    <Box>
                        <Text>Asked Asset Price</Text>
                        <Input
                            type="string" 
                            value={askedAssetQty}
                            placeholder="Asked Asset Quantity"
                            onChange={(e) => setAskedAssetQty(e.target.value)}
                        ></Input>
                    </Box>
                </VStack>
            
          </ModalBody>
          <ModalFooter>
            <HStack mr="15px">
                <Button colorScheme="blue" onClick={() => onFilter()}>Apply Filter</Button>
                <Button colorScheme="red" onClick={() => onClearFilter()}>Clear Filter</Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
  )
};

