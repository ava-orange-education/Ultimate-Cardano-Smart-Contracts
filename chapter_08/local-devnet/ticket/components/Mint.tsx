import { ChangeEvent, useState } from 'react'

const mint = ({ onMint } : any) => {

    const [address, setAddress] = useState('');
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [image, setImage] = useState('');
    const [qty, setQty] = useState('');

    const onSubmit = (e : any) => {  
        e.preventDefault() // prevent full page refresh
        onMint([address, name, description, image, qty]);
    }

    return (
        <form onSubmit={onSubmit}>
        <div className="p-4 border">
            <span>Destination Address</span>
                <label className="flex items-center space-x-2">
                    <input
                        type="text"
                        name="address"
                        id="address"
                        placeholder="Enter Destination Address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                    />
                </label>              
        </div>
        <div className="p-4 border">
            <span>Ticket Name</span>
                <label className="flex items-center space-x-2">
                    <input
                        type="text"
                        name="name"
                        id="name"
                        placeholder="Enter Ticket Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </label>              
        </div>
        <div className="p-4 border">
            <span>Ticket Description</span>
                <label className="flex items-center space-x-2">
                    <input
                        type="text"
                        name="description"
                        id="description"
                        placeholder="Enter Ticket Description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </label>              
        </div>
        <div className="p-4 border">
            <span>Ticket Image</span>
                <label className="flex items-center space-x-2">
                    <input
                        type="text"
                        name="image"
                        id="image"
                        placeholder="Enter Ticket Image CID"
                        value={image}
                        onChange={(e) => setImage(e.target.value)}
                    />
                </label>              
        </div>
        <div className="p-4 border">
            <span>Ticket Quantity</span>
                <label className="flex items-center space-x-2">
                    <input
                        type="number"
                        name="qty"
                        id="qty"
                        placeholder="Number of tickets to mint"
                        value={qty}
                        onChange={(e) => setQty(e.target.value)}
                    />
                </label>              
        </div>
        <button type='submit' className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 0c-5.523 0-10 4.477-10 10s4.477 10 10 10 10-4.477 10-10-4.477-10-10-10zm8 10h-8v-8h8v8zm-10 2v-1c0-.553.447-1 1-1s1 .447 1 1v1h1c.553 0 1 .447 1 1s-.447 1-1 1h-1v1c0 .553-.447 1-1 1s-1-.447-1-1v-1h-1c-.553 0-1-.447-1-1s.447-1 1-1h1z"/>
            </svg>
            <span>Mint Tickets</span>
        </button>
        </form>
    )
}

export default mint