import { useState } from "react";
import { 
  Flex,
  Spacer,
  Tab,
  Tabs,
  TabList,
  TabPanel,
  TabPanels
} from "@chakra-ui/react"

import SwapView from "../components/SwapView";
import { WalletInfo } from "../common/types";
import EventView from "../components/EventView";
import MyTickets from "../components/MyTickets";
import WalletConnect from "../components/WalletConnect";

export default function Tickets() {

  const [walletAPI, setWalletAPI] = useState<undefined | any>(undefined);
  const [walletInfo, setWalletInfo] = useState<WalletInfo>({ 
      addr: '',
      stakeAddr:'',
      lovelace: 0,
      assets: []
    });
  
  const [swapViewRefresh, setSwapViewRefresh] = useState(0);
 
  return (

    <Tabs>
      <Flex as="nav" p="10px" mb="5px" alignItems="center">
        <TabList>
          <Tab>Get Tickets</Tab>
          <Tab>My Events</Tab>
          <Tab>My Tickets</Tab>
        </TabList>
        <Spacer/>
        <WalletConnect
          walletAPI={walletAPI}
          onWalletAPI={setWalletAPI}
          walletInfo={walletInfo}
          onWalletInfo={setWalletInfo}
        />
      </Flex>
      <TabPanels>
        <TabPanel>
          <SwapView
            walletAPI={walletAPI}
            walletInfo={walletInfo}
            swapRefresh={swapViewRefresh}
            setSwapViewRefresh={setSwapViewRefresh}
          />
        </TabPanel>
        <TabPanel>
          <EventView
            walletAPI={walletAPI}
            walletInfo={walletInfo}
            setSwapViewRefresh={setSwapViewRefresh}
          />
        </TabPanel>
        <TabPanel>
          <MyTickets
            walletAPI={walletAPI}
            walletInfo={walletInfo}
          />
        </TabPanel>
      </TabPanels>
    </Tabs>
  )
}
