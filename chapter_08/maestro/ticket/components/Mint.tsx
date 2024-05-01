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
                        min="1"
                        name="qty"
                        id="qty"
                        placeholder="Number of tickets to mint"
                        value={qty}
                        onChange={(e) => setQty(e.target.value)}
                    />
                </label>              
        </div>
        <button type='submit' className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded">
            <span>Mint Tickets</span>
        </button>
        </form>
    )
}

export default mint