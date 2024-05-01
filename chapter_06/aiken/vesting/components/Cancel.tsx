const cancel = ({ onCancel } : any) => {

    const onSubmit = (e : any) => {
        
        e.preventDefault() // prevent full page refresh
        onCancel();
    }

    return (
        <form onSubmit={onSubmit}>
        <button type='submit' className="flex items-center space-x-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded">
              <span>Cancel UTXO</span>
        </button>
        </form>
    )
}

export default cancel