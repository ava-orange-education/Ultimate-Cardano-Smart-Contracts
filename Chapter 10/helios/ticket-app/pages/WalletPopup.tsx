import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { 
  Box,
  Button,
  Link,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Stack,
  Text,
  useToast } from '@chakra-ui/react';

  import { ExternalLinkIcon } from '@chakra-ui/icons'
  
import { WalletChoice } from '../common/types'
import { walletSupported } from '../config/walletSupported';

declare global {
  interface Window {
    cardano: any;
  }
}

interface WalletPopupProps {
  isOpen: boolean;
  onClose: (isOpen: boolean) => void;
  onSelectChoice: (choice: WalletChoice) => void;
  onWalletAPI: (walletAPI: any) => void;
}

export default function WalletPopup (props: WalletPopupProps) {
  
  const toast = useToast()
  const [wallets, setWallets] = useState<WalletChoice[]>([]);
  const [selectedChoice, setSelectedChoice] = useState<WalletChoice>({name: '',
                                                                      imgSrc: '',
                                                                      api: ''});

  useEffect(() => {
    const checkWallets = async () => {
      setWallets(await getAvailableWallets());
    };
    checkWallets();
  }, []);

  useEffect(() => {
    const checkWallet = async () => {
      if (selectedChoice && (await checkIfWalletFound())) {
        await enableWallet(selectedChoice.api)
      }
    };
    checkWallet();
  }, [selectedChoice]);

  async function handleError (errorMsg: string) {
    toast({
      title: 'Wallet Error',
      description: errorMsg,
      duration: 10000,
      isClosable: true,
      position: 'bottom-left',
      status: 'error'
    })
  }

  function isValidName(name: string) {
    return typeof name === 'string' && name.trim() !== '';
  }

  function isValidAPI(api: any, cardano: any) {
    return typeof api === 'string' && typeof cardano[api] === 'object';
  }

  async function getAvailableWallets (): Promise<WalletChoice[]> {
    const wallets: WalletChoice[] = [];
    walletSupported.forEach((wallet: WalletChoice) => {
      if (isValidName(wallet.name)) {
        if (window?.cardano && isValidAPI(wallet.api, window.cardano)) {
          wallets.push(wallet);
        } 
      } 

    });
    return wallets;
  }

  async function checkIfWalletFound () {
    if (isValidName(selectedChoice.name)) {  
      if (window?.cardano && isValidAPI(selectedChoice.api, window.cardano)) {
          return true;
      }
    } 
    
    if (selectedChoice.name !== '') {
      handleError(selectedChoice.name + ' Wallet not found');
      setSelectedChoice({name: '',
                         imgSrc: '',
                         api: ''});
      // Set WaletAPI as undefined if wallet not found
      props.onWalletAPI(undefined);
      
    }
    return false;
  };

  async function enableWallet (api: string) {
    if (window?.cardano && isValidAPI(api, window.cardano)) {
      try {
          const walletAPI = await window.cardano[api].enable();
          props.onWalletAPI(walletAPI);
          props.onSelectChoice(selectedChoice);
          props.onClose(false);
          return true;
      } catch (err) {
          console.error("enableWallet error: ", err);
          handleError('Cannot connect to ' + selectedChoice.name + ' wallet. Please check that the wallet is enabled and granted access to this website.');
          setSelectedChoice({ name: '',
                              imgSrc: '',
                              api: ''});
          props.onSelectChoice({  name: '',
                      imgSrc: '',
                      api: ''});
      }
    }
    return false;
  };
  
  async function handleClose () {
    props.onClose(false);
  }

  async function handleSelect (choice: WalletChoice) {
    // Check if selecting the same wallet
    if (choice.name == selectedChoice.name) {
      props.onClose(false);
    } else {
      // Otherwise, select a new wallet
      setSelectedChoice(choice);
    }
  };

  if (!props.isOpen) return null;

  if (wallets.length == 0) {
    return (
      <Modal onClose={handleClose} isOpen={props.isOpen}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Connect Wallet</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack>
            <Box>
                <Text fontSize="lg" as="b">No Browser Wallets Installed</Text>
                <Text>Please install a Cardano Browser Wallet to use Ticket Time. 
                  For more information, follow the link to Cardano Docs</Text>
                <Link href='https://docs.cardano.org/new-to-cardano/types-of-wallets/' isExternal>
                  https://docs.cardano.org/new-to-cardano/types-of-wallets/
                  <ExternalLinkIcon mx='2px' />
                </Link>
              </Box>
            </Stack>
          </ModalBody>
          <ModalFooter>
            <Button onClick={handleClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    )
  }

  return (
    <Modal onClose={handleClose} size='xs' isOpen={props.isOpen}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Connect Wallet</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack alignContent="center" ml="15px" mr="15px">
            {wallets.map((wallet, index) => (
              <Box key={index}>
                <Button onClick={() => handleSelect(wallet)}>
                  <Image src={wallet.imgSrc} alt="Description" width={30} />
                  <Text width="200px">{wallet.name}</Text>
                </Button>
              </Box>))
            }
            </Stack>
          </ModalBody>
          <ModalFooter>
            <Button mr="15px" onClick={handleClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
  )
};
