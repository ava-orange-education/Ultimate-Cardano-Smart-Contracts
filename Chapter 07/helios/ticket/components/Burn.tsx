import { useState } from 'react'

const Burn = ({ onBurn } : any) => {

    const [policyId, setAddress] = useState('');
    const [tokenName, setName] = useState('');
    const [qty, setQty] = useState('');

    const onSubmit = (e : any) => {  
        e.preventDefault() // prevent full page refresh
        onBurn([policyId, tokenName, qty]);
    }

    return (
        <form onSubmit={onSubmit}>
        <div className="p-4 border">
            <span>Minting Policy ID</span>
                <label className="flex items-center space-x-2">
                    <input
                        type="text"
                        name="policyId"
                        id="policyId"
                        placeholder="Enter Minting Policy ID"
                        value={policyId}
                        onChange={(e) => setAddress(e.target.value)}
                    />
                </label>              
        </div>
        <div className="p-4 border">
            <span>Token Name</span>
                <label className="flex items-center space-x-2">
                    <input
                        type="text"
                        name="tokenName"
                        id="tokenName"
                        placeholder="Enter Token Name"
                        value={tokenName}
                        onChange={(e) => setName(e.target.value)}
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
                        placeholder="Number of tickets to burn"
                        value={qty}
                        onChange={(e) => setQty(e.target.value)}
                    />
                </label>              
        </div>
        <button type='submit' className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded">
            <span>Burn Ticket</span>
        </button>
        </form>
    )
}

export default Burn