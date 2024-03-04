const WalletInfo = ({ walletInfo } : any) => {

    return (
        <>
            <p className="font-semibold text-lg">Wallet Info</p>
            <p className="mt-2 text-sm">
                Balance In Lovelace:
                <span className="ml-4">{walletInfo.balance}</span>
            </p>
        </>
      );
}

export default WalletInfo