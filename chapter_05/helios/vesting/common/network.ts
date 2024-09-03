import axios from 'axios';
import { 
    config,    
} from "@hyperionbt/helios";

export {
    getNetworkParams,
    network
}

// Define Cardano network
const network = "preprod"
config.set({ ...config, IS_TESTNET: true });

async function getNetworkParams(network: string) {

    var networkParamsUrl;
    if (network === "preview") {
        networkParamsUrl = "http://localhost:3000/params/preview.json";
    } else if (network === "preprod") {
        networkParamsUrl = "http://localhost:3000/params/preprod.json";
    } else if (network === "mainnet") {
        networkParamsUrl = "http://localhost:3000/params/mainnet.json";
    } else {
        alert("Network not set");
        throw console.error("getNetworkParams: network not set");
    }

    try {
       let res = await axios({
            url: networkParamsUrl,
            method: 'get',
            timeout: 8000,
            headers: {
                'Content-Type': 'application/json'
            }
        })
        if(res.status == 200){
            return res.data;
        } else {
          throw console.error("getNetworkParams: error getting network params: ", res);
        }   
    }
    catch (err) {
        throw console.error("getNetworkParams: error getting network params: ", err);
    }
}
