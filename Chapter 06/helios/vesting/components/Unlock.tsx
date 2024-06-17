import { ChangeEvent, useState } from 'react'

const Unlock = ({ onUnlock } : any) => {
    const [message, setMessage] = useState('');
    const onSubmit = (e : any) => {  
        e.preventDefault() // prevent full page refresh
        onUnlock([message]);
    }
    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
        const inputValue = event.target.value;
        setMessage(inputValue);
      };
    return (
        <form onSubmit={onSubmit}>
        <div className="p-4 border">
            <span>Redemeer Message</span>
                <label className="flex items-center space-x-2">
                    <input
                        type="text"
                        name="message"
                        id="message"
                        placeholder="Enter Redeemer Text Message"
                        value={message}
                        onChange={(e) => handleChange(e)}
                    />
                </label>              
        </div>
        <button type='submit' className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded">
            <span>Unlock UTXO</span>
        </button>
        </form>
    )
}

export default Unlock