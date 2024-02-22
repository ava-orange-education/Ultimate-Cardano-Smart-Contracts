import { useState } from 'react';
import { 
    Button,
    Input,
    Stack,
    Text
 } from '@chakra-ui/react';

interface MintTicketProps {
    onMint: any;
  }

export default function mint (props: MintTicketProps) {

    const [name, setName] = useState('');
    const [location, setLocation] = useState('');
    const [image, setImage] = useState('');
    const [qty, setQty] = useState('');
    const [showtime, setShowtime] = useState(new Date());

    const handleShowtime = (date: string) => {
        setShowtime(new Date(date))
    }
    
    const onSubmit = (e : any) => {  
        e.preventDefault() // prevent full page refresh
        props.onMint([name, location, image, qty, showtime]);
    }

    return (
        <form id="mintForm" onSubmit={onSubmit}>
            <Stack spacing={0}>
                <Text>Name</Text>
                <Input
                    type="text"
                    name="name"
                    id="name"
                    placeholder="Enter Event Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
                <Text mt="5px">Location</Text>
                <Input
                    type="text"
                    name="location"
                    id="location"
                    placeholder="Enter Event Location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                />
                <Text mt="5px">Event Image</Text>
                <Input
                    type="text"
                    name="image"
                    id="image"
                    placeholder="Enter Event Image URL"
                    value={image}
                    onChange={(e) => setImage(e.target.value)}
                />
                <Text mt="5px">Ticket Quantity</Text>
                <Input
                    type="number"
                    name="qty"
                    id="qty"
                    placeholder="Number of tickets to mint"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                />
                <Text mt="5px">Showtime</Text>
                <Input
                    placeholder="Select Date and Time"
                    size="md"
                    type="datetime-local"
                    onChange={(e) => handleShowtime(e.target.value)} 
                />
                <Button
                    colorScheme="blue"
                    type='submit'
                    mt="25px"
                >
                    Mint Tickets
                </Button>
            </Stack>
        </form>
    )
}
