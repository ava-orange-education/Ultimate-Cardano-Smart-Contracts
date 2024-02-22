import { 
    LockIcon,
    UnlockIcon } from "@chakra-ui/icons"
import { 
    Button,
    Box,
    Image,
    HStack,
    Text,
    useToast } from "@chakra-ui/react"
import { useEffect, useState } from "react";
import { 
    Cip30Wallet,
    WalletHelper } from "@hyperionbt/helios";

import { 
    WalletChoice,
    WalletInfo } from "../common/types"
import { getWalletInfo } from '../common/network';
import WalletPopup from "../pages/WalletPopup";


interface WalletConnectProps {
    walletAPI: any
    onWalletAPI: (walletAPI: any) => void;
    walletInfo: any
    onWalletInfo: (walletInfo: WalletInfo) => void;
    }

export default function WalletConnect(props: WalletConnectProps) {

    const [isPopupOpen, setIsPopupOpen] = useState(false);
    const [selectedChoice, setSelectedChoice] = useState<WalletChoice>({name: '',
                                                                        imgSrc: '',
                                                                        api: ''});
    const toast = useToast()

    useEffect(() => {
        const updateWalletInfo = async () => {

            if (props.walletAPI) {
                const addr = await getWalletAddr() as string;
                const walletInfoUpdate = await getWalletInfo(addr);
                props.onWalletInfo({
                ...props.walletInfo,
                addr: walletInfoUpdate.addr,
                stakeAddr: walletInfoUpdate.stakeAddr,
                lovelace: walletInfoUpdate.lovelace,
                assets: walletInfoUpdate.assets
                });
            } else {
                // Zero out wallet info if no walletAPI is present
                props.onWalletInfo({
                    addr: '',
                    stakeAddr: '',
                    lovelace: 0,
                    assets: []
                })
            }
        }
        updateWalletInfo();
        // Referesh every 30 seconds to update wallet balance
        const intervalId = setInterval(() => {
            updateWalletInfo();
          }, 30000);
        
        return () => clearInterval(intervalId);

    }, [props.walletAPI])


    async function getWalletAddr () {
        try {
            const cip30WalletAPI = new Cip30Wallet(props.walletAPI);
            const walletHelper = new WalletHelper(cip30WalletAPI);
            const changeAddr = await walletHelper.baseAddress;
            return changeAddr.toBech32();

        } catch (error) {
            toast({
                title: "Wallet Error",
                description: "Can't connect to wallet",
                duration: 10000,
                isClosable: true,
                position: 'bottom-right',
                status: 'error'
            })
            console.error('Error in getWalletAddr:', error);
        }
    }

    function handleDisconnect () {
        setSelectedChoice({ name: '',
                              imgSrc: '',
                              api: ''})
        props.onWalletInfo({
            addr: '',
            stakeAddr: '',
            lovelace: 0,
            assets: []
        })
        props.onWalletAPI(undefined)
    }

    if (selectedChoice.name === '') {
        return (
            <HStack spacing="20px"> 
                <Button
                    colorScheme="blue"
                    onClick={() => setIsPopupOpen(true)}>
                    <LockIcon/>
                    <Text display={["none", "block", "block"]} ml="5px">Connect Wallet</Text>
                </Button>
                <WalletPopup
                    isOpen={isPopupOpen}
                    onClose={setIsPopupOpen}
                    onSelectChoice={setSelectedChoice}
                    onWalletAPI={props.onWalletAPI}
                />
            </HStack>
        )
    }

    return (
        <HStack spacing="5px">
            <Box display={["none", "block", "block"]}>
                <Image src={selectedChoice.imgSrc.src} alt={selectedChoice.name} width={30} />
            </Box>
            <Box display={["none", "block", "block"]}>
                <Text ml="5px">₳ {(props.walletInfo.lovelace / 1_000_000).toLocaleString()}</Text>
            </Box>
            <Box ml="10px">
                <Button
                    colorScheme="blue"
                    onClick={() => handleDisconnect()}>
                    <UnlockIcon />
                </Button>
            </Box>
            <WalletPopup
                isOpen={isPopupOpen}
                onClose={setIsPopupOpen}
                onSelectChoice={setSelectedChoice}
                onWalletAPI={props.onWalletAPI}
            />
        </HStack>
        
  )
}
