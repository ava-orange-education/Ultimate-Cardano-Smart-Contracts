const lock = ({ onLock } : any) => {

    const onSubmit = (e : any) => {
        
        e.preventDefault() // prevent full page refresh
        onLock();
    }

    return (
        <form onSubmit={onSubmit}>
        <button type='submit' className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded">
            <span>Lock UTXO</span>
        </button>
        </form>
    )
}

export default lock