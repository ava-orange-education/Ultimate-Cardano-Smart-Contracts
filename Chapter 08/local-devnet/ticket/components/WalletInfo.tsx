const Item = ({ mph, tn, qty} : any) => {
     
    return(
    <tr>
        <td>{mph}</td>
        <td>{tn}</td>
        <td>{qty}</td>
    </tr>
  );
}


const WalletInfo = ({ walletInfo } : any) => {

    return (
        <div className="w-full">
          <b className="font-bold">Wallet Address</b> <span className="text-xs">{walletInfo.addr}</span><br/><br/>
          <b className="font-bold">Wallet Balance</b><hr/>
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left">Minting Policy Hash</th>
                <th className="text-left">Token Name</th>
                <th className="text-left">Token Quantity</th>
              </tr>
            </thead>
            <tbody>
              {walletInfo.balance.map((item: any) => (
                <Item
                  mph={item.mph}
                  tn={item.tn}
                  qty={item.qty}
                  key={item.mph + item.tn}
                />
              ))}
            </tbody>
          </table>
        </div>
      );      
}

export default WalletInfo