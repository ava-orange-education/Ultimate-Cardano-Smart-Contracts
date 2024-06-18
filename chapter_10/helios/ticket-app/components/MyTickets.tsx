import { useEffect, useState } from "react"

import { 
    Container,
    Image,
    Table,
    TableContainer,
    Tbody,
    Td,
    Th,
    Thead,
    Tr,
    Text, 
    Button,
} from "@chakra-ui/react"

import { 
  PrintTicketInfo,
  WalletInfo } from "../common/types"
import { convertIpfsUrl } from "../common/utils"
import { getTicketMetadataCIP68 } from "../common/network"
import PrintTicketPopup from '../pages/PrintTicketPopup';


interface PrintTicketProps {
  walletAPI: any,
  walletInfo: WalletInfo
}

export default function PrintTicket(props: PrintTicketProps) {

  const [ticketSelected, setTicketSelected] = useState<undefined|PrintTicketInfo>(undefined)
  const [printTicketOpen, setPrintTicketOpen] = useState(false);
  const [printTicketRefresh, setPrintTicketRefresh] = useState(false);
  const [printTickets, updatePrintTicketsArray] = useState<PrintTicketInfo[]>([]);

  async function getPrintTicketInfo() {
    const printTicketArrayUpdate = props.walletInfo.assets.map(async (assetInfo) => {
      const printTicketInfo = await getTicketMetadataCIP68(assetInfo.asset)
      return printTicketInfo
    })
    return printTicketArrayUpdate
  }

  useEffect( () => {
    const updatePrintTickets = async () => {

        try { 
          Promise.all(await getPrintTicketInfo())
                  .then(printTicketInfoArray => {
                    updatePrintTicketsArray([...printTicketInfoArray])
                  })
                  .catch(err => {
                    console.log("No tickets found");
                  })
        
        } catch (err) {
          // No assets found, set to 0
          updatePrintTicketsArray([])
        }
    }
    updatePrintTickets();

  }, [props.walletInfo, printTicketRefresh]);


  async function printTicketNow (ticket: PrintTicketInfo) {
    setTicketSelected(ticket)
    setPrintTicketOpen(true)
  }

  if (!props.walletAPI) {
    return(
      <Container mt="60px" mb="60px" centerContent>
          <Text fontSize="x-large">Please connect your wallet</Text>
      </Container> 
    )
  }

  return (
    <>
        <TableContainer>
          <Table variant='simple' colorScheme='blue'>
            <Thead>
              <Tr>
                <Th></Th>
                <Th>Event Name</Th>
                <Th>Location</Th>
                <Th>Showtime</Th>
                <Th>Ticket Action</Th>
              </Tr>
            </Thead>
            <Tbody>
              {printTickets.map((ticket, index) => (
                    <Tr key={ticket.asset}>
                      <Td>
                          <Image src={convertIpfsUrl(ticket.image)}/>
                      </Td>
                      <Td>{ticket.name.split("|")[0]}</Td>
                      <Td>{ticket.location}</Td>
                      <Td>{new Date(ticket.showtime).toLocaleString()}</Td>
                      <Td>
                          <Button
                            colorScheme="blue"
                            onClick={() => printTicketNow(ticket)}
                          >
                          Print Ticket
                          </Button>
                          </Td>
                    </Tr>
                    ))
                }
            </Tbody>
          </Table>
        </TableContainer>
        <PrintTicketPopup
            isOpen={printTicketOpen}
            onClose={setPrintTicketOpen}
            walletAPI={props.walletAPI}
            ticket={ticketSelected}
            onPrintTicketRefresh={setPrintTicketRefresh}
            printTicketRefresh={printTicketRefresh}
          />
      </>

  )
}
