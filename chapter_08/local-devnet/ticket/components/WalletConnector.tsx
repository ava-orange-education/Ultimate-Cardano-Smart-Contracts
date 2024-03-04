import { useState, useEffect } from "react";
/*
declare global {
  interface Window {
    cardano: any;
  }
}
*/

interface WalletConnectorProps {
    onWalletAPI: (walletAPI: any) => void;
}

interface WalletDetails {
    [key: string]: {
      api: string;
      label: string;
    };
  }
  
  const walletDetails: WalletDetails = {
    eternl: {
      api: "eternl",
      label: "Eternl",
    },
    lace: {
      api: "nami",
      label: "Nami",
    }
    // Add more wallets if required
  };
  
  const WalletConnector: React.FC<WalletConnectorProps> = ({ onWalletAPI }) => {
    const [selectedWallet, setSelectedWallet] = useState<string | undefined>(undefined);
    const [walletIsEnabled, setWalletIsEnabled] = useState(false);
  
    useEffect(() => {
      const checkWallet = async () => {
        if (selectedWallet && (await checkIfWalletFound())) {
          setWalletIsEnabled(await enableWallet(selectedWallet));
        }
      };
      checkWallet();
    }, [selectedWallet]);
  
    const checkIfWalletFound = async () => {
        if (selectedWallet !== undefined) {  
            const walletApi = walletDetails[selectedWallet]?.api;
            if (window?.cardano?.[walletApi]) {
                console.log("Wallet found!");
                return true;
            }
        }
        // Set false by default
        setWalletIsEnabled(false);
        onWalletAPI(undefined);
        console.error('Wallet not found'); 
        return false;
    };
  
    const enableWallet = async (walletChoice: string) => {
      const walletName = walletDetails[walletChoice]?.api;
      if (walletName) {
        try {
          const walletAPI = await window.cardano[walletName].enable();
          onWalletAPI(walletAPI);
          return true;
        } catch (err) {
          console.error("enableWallet error", err);
        }
      }
      return false;
    };
  
    const handleWalletSelect = (obj: React.ChangeEvent<HTMLInputElement>) => {
      setSelectedWallet(obj.target.value);
    };
  
    return (
      <div className="p-4 border">
        {Object.keys(walletDetails).map((walletKey) => (
          <p className="border border-gray-400 p-2 rounded mb-2" key={walletKey}>
            <label className="flex items-center space-x-2">
              <input
                type="radio"
                name="wallet"
                value={walletKey}
                onChange={handleWalletSelect}
              />
              <span>{walletDetails[walletKey].label}</span>
            </label>
          </p>
        ))}
      </div>
    );
  };
    

export default WalletConnector;