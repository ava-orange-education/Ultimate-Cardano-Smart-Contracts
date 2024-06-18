import { 
  HStack,
  Heading,
  Image
} from "@chakra-ui/react"
import TicketTime from '../assets/img/ticket-time.png';

export default function Header() {
return (

      <HStack padding="20px">
        <Image src={TicketTime.src} alt="Ticket Time" width={50} />
        <Heading>Ticket Time</Heading>
      </HStack>
 
)
}
