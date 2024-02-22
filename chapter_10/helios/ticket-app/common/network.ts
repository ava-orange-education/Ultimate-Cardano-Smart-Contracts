import axios from 'axios';
import { 
    Event,
    Filter,
    PrintTicketInfo,
    Swap,
    Ticket,
    WalletInfo } from './types';
import { 
    bytesToHex,
    TxInput, 
    Tx } from '@hyperionbt/helios';

export {
    blockConfirmDisabled,
    closeSwap,
    getNetworkParams,
    getWalletInfo,
    getAssetUtxo,
    getEvent,
    getEvents,
    getFilterSwaps,
    getTicketPkh,
    getTicketMetadataCIP25,
    getTicketMetadataCIP68,
    isTestnet,
    printTicket,
    setBeacon,
    setEvent,
    setStakeKey,
    setSwap,
    submitTx,
    signSubmitTx,
    updateEvent,
    updateSwap,
    verifyTicket,
    network
}

const blockConfirmDisabled = true; // disable block confirmations
const isTestnet = true;
const network="preprod"
const env = process.env.NEXT_PUBLIC_ENV as string;
const host = process.env.NEXT_PUBLIC_HOST as string;
const port = env == "dev" ? process.env.NEXT_PUBLIC_PORT as string : "";
const protocol = process.env.NEXT_PUBLIC_PROTOCOL as string;
const baseURL = protocol + '://' + host + port;
if (host === "" || protocol == "") {
    alert("Please make sure you host and protocol environment variables are set");
    throw console.error("Please make sure you host, port and protocol environment variables are set");
}

const closeSwap = async (swap: Swap): Promise<void> => {

    const payload = { 
        swap: swap
    }
    const api = "/api/closeSwap";

    try {
        let res = await axios({
            baseURL: baseURL,
            url: api,
            data: payload,
            method: 'post',
            timeout: 8000,
            headers: {
                'Content-Type': 'application/json'
            }
        })
        if(res.status == 200){
            return res.data;
        } else {
            console.error("closeSwap Error: ", res);
            throw res.data;
        }   
    }
    catch (err) {
        console.error("closeSwap Failed: ", err);
        throw err;
    }
}  

async function getNetworkParams(network: string) {

    var networkParamsUrl;
    if (network === "preview") {
        networkParamsUrl = "https://d1t0d7c2nekuk0.cloudfront.net/preview.json";
    } else if (network === "preprod") {
        networkParamsUrl = "https://d1t0d7c2nekuk0.cloudfront.net/preprod.json";
    } else if (network === "mainnet") {
        networkParamsUrl = "https://d1t0d7c2nekuk0.cloudfront.net/mainnet.json";
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

const getWalletInfo = async (address: string): Promise<WalletInfo> => {

    const payload = { 
        addr: address
    }
    const api = "/api/getWalletInfo";

    try {
        let res = await axios({
            baseURL: baseURL,
            url: api,
            data: payload,
            method: 'post',
            timeout: 8000,
            headers: {
                'Content-Type': 'application/json'
            }
        })
        if(res.status == 200){
            return res.data;
        } else {
            console.error("getAddrAssetsInfo Error: ", res);
            throw res.data;
        }   
    }
    catch (err) {
        console.error("getAddrAssetsInfo Failed: ", err);
        throw err;
    }
}  


const getAssetUtxo = async (address: string,
                            asset: string): Promise<TxInput> => {

    const payload = { 
        addr: address,
        asset: asset
    }
    const api = "/api/getAssetUtxo";

    try {
        let res = await axios({
            baseURL: baseURL,
            url: api,
            data: payload,
            method: 'post',
            timeout: 8000,
            headers: {
                'Content-Type': 'application/json'
            }
        })
        if(res.status == 200){
            return TxInput.fromFullCbor(res.data);
        } else {
            console.error("getAssetUtxo Error: ", res);
            throw res.data;
        }   
    }
    catch (err) {
        console.error("getAssetUtxo Failed: ", err);
        throw err;
    }
}  


const getEvent = async (asset: string): Promise<Event> => {
    
    if (!asset) {
        throw console.error('getEvent: no asset provided');
    }
    const payload = { 
        asset: asset
    }

    const api = "/api/getEvent";

    try {
        let res = await axios({
            baseURL: baseURL,
            url: api,
            data: payload,
            method: 'post',
            timeout: 8000,
            headers: {
                'Content-Type': 'application/json'
            }
        })
        if(res.status == 200){
            return res.data;
        } else if (res.status == 400){
            // No stake key found
            console.log("No event found");
            return res.data;
        } else {
            console.error("getEvent Error: ", res);
            throw res.data;
        }   
    }
    catch (err) {
        console.error("getEvent Failed: ", err);
        throw err;
    }
}

const getEvents = async (stakeAddress: string | null): Promise<Event[]> => {
    
    if (!stakeAddress) {
        console.log('getEvents: no staked key provided');
        return [];
    }
    const payload = { 
        stakeAddr: stakeAddress
    }

    const api = "/api/getEvents";

    try {
        let res = await axios({
            baseURL: baseURL,
            url: api,
            data: payload,
            method: 'post',
            timeout: 8000,
            headers: {
                'Content-Type': 'application/json'
            }
        })
        if(res.status == 200){
            return res.data;
        } else if (res.status == 201){
            // No stake key found
            return [];
        } else {
            console.error("getEvents Error: ", res);
            throw res.data;
        }   
    }
    catch (err) {
        throw err;
    }
}


const getFilterSwaps = async (filter: Filter): Promise<Swap[]> => {
    
    const payload = { 
        filter: filter
    }

    const api = "/api/getFilterSwaps";

    try {
        let res = await axios({
            baseURL: baseURL,
            url: api,
            data: payload,
            method: 'post',
            timeout: 8000,
            headers: {
                'Content-Type': 'application/json'
            }
        })
        if(res.status == 200){
            return res.data;
        } else if (res.status == 400){
            // No beaconMPH found
            console.log("No swaps found");
            return [];
        } else {
            console.error("getFilterSwap Error: ", res);
            throw res.data;
        }   
    }
    catch (err) {
        console.error("getFilterSwap Failed: ", err);
        throw err;
    }
}


const getTicketPkh = async (asset: string): Promise<string> => {

    const payload = { 
        asset: asset
    }
    const api = "/api/getTicketPkh";

    try {
        let res = await axios({
            baseURL: baseURL,
            url: api,
            data: payload,
            method: 'post',
            timeout: 8000,
            headers: {
                'Content-Type': 'application/json'
            }
        })
        if(res.status == 200){
            return res.data;
        } else {
            console.error("getTicketPkh Error: ", res);
            throw res.data;
        }   
    }
    catch (err) {
        console.error("getTicketPkh Failed: ", err);
        throw err;
    }
}  


const getTicketMetadataCIP25 = async (ticketAsset: string): Promise<Ticket> => {

    const payload = { 
        asset: ticketAsset
    }
    const api = "/api/getTicketMetadataCIP25";

    try {
      let res = await axios({
            baseURL: baseURL,
            url: api,
            data: payload,
            method: 'post',
            timeout: 8000,
            headers: {
                'Content-Type': 'application/json'
            }
        })
        if(res.status == 200){
            return res.data;
        } else {
          console.error("getTicketMetadataCIP25 Error: ", res);
          throw res.data;
        }   
    }
    catch (err) {
        console.error("getTicketMetadataCIP25 Failed: ", err);
        throw err;
    }
}  

const getTicketMetadataCIP68 = async (ticketAsset: string): Promise<PrintTicketInfo> => {

    const payload = { 
        asset: ticketAsset
    }
    const api = "/api/getTicketMetadataCIP68";

    try {
      let res = await axios({
            baseURL: baseURL,
            url: api,
            data: payload,
            method: 'post',
            timeout: 8000,
            headers: {
                'Content-Type': 'application/json'
            }
        })
        if(res.status == 200){
            return res.data;
        } else {
          console.error("getTicketMetadataCIP68 Error: ", res);
          throw res.data;
        }   
    }
    catch (err) {
        console.error("getTicketMetadataCIP68 Failed: ", err);
        throw err;
    }
}  

const printTicket = async (asset: string, pkh: string): Promise<void> => {

    const payload = { 
        asset: asset,
        pkh: pkh 
    }
    const api = "/api/printTicket";

    try {
        let res = await axios({
            baseURL: baseURL,
            url: api,
            data: payload,
            method: 'post',
            timeout: 8000,
            headers: {
                'Content-Type': 'application/json'
            }
        })
        if(res.status == 200){
            return res.data;
        } else {
            console.error("printTicket Error: ", res);
            throw res.data;
        }   
    }
    catch (err) {
        console.error("printTicket Failed: ", err);
        throw err;
    }
}  


const setBeacon = async (   beaconMPH: string,
                            beaconTN : string): Promise<void> => {

    const payload = { 
        beaconMPH: beaconMPH,
        beaconTN: beaconTN
    }
    const api = "/api/setBeacon";

    try {
        let res = await axios({
            baseURL: baseURL,
            url: api,
            data: payload,
            method: 'post',
            timeout: 8000,
            headers: {
                'Content-Type': 'application/json'
            }
        })
        if(res.status == 200){
            return res.data;
        } else {
            console.error("setBeacon Error: ", res);
            throw res.data;
        }   
    }
    catch (err) {
        console.error("setBeacon Failed: ", err);
        throw err;
    }
}  

const setStakeKey = async ( stakeAddress: string,
                            asset: string): Promise<void> => {

    const payload = { 
        stakeAddr: stakeAddress,
        asset: asset
    }
    const api = "/api/setStakeKey";

    try {
        let res = await axios({
            baseURL: baseURL,
            url: api,
            data: payload,
            method: 'post',
            timeout: 8000,
            headers: {
                'Content-Type': 'application/json'
            }
        })
        if(res.status == 200){
            return res.data;
        } else {
            console.error("setStakeKey Error: ", res);
            throw res.data;
        }   
    }
    catch (err) {
        console.error("setStakeKey Failed: ", err);
        throw err;
    }
}  



const setEvent = async (event: Event): Promise<void> => {

    const payload = { 
        event: event
    }
    const api = "/api/setEvent";

    try {
        let res = await axios({
            baseURL: baseURL,
            url: api,
            data: payload,
            method: 'post',
            timeout: 8000,
            headers: {
                'Content-Type': 'application/json'
            }
        })
        if(res.status == 200){
            return res.data;
        } else {
            console.error("setEvent Error: ", res);
            throw res.data;
        }   
    }
    catch (err) {
        console.error("setEvent Failed: ", err);
        throw err;
    }
}  


const setSwap = async (swap: Swap): Promise<void> => {

    const payload = { 
        swap: swap
    }
    const api = "/api/setSwap";

    try {
        let res = await axios({
            baseURL: baseURL,
            url: api,
            data: payload,
            method: 'post',
            timeout: 8000,
            headers: {
                'Content-Type': 'application/json'
            }
        })
        if(res.status == 200){
            return res.data;
        } else {
            console.error("setSwap Error: ", res);
            throw res.data;
        }   
    }
    catch (err) {
        console.error("setSwap Failed: ", err);
        throw err;
    }
}  

const submitTx = async (tx: Tx) : Promise<string> => {
    
    const payload = bytesToHex(tx.toCbor());
    const urlAPI = "/api/submitTx";

    try {
        let res = await axios({
            baseURL: baseURL,
            url: urlAPI,
            data: payload,
            method: 'post',
            timeout: 8000,
            headers: {
                'Content-Type': 'application/cbor'
            }
        })
        if(res.status == 200){
            return res.data;
        } else {
            console.error("sumitTx API Error: ", res);
            throw res.data;
        }   
    }
    catch (err) {
        console.error("submitTx Failed: ", err);
        throw err;
    }
}

const signSubmitTx = async (tx: Tx) : Promise<string> => {
    
    const payload = bytesToHex(tx.toCbor());
    const urlAPI = "/api/signSubmitTx";

    try {
        let res = await axios({
            baseURL: baseURL,
            url: urlAPI,
            data: payload,
            method: 'post',
            timeout: 8000,
            headers: {
                'Content-Type': 'application/cbor'
            }
        })
        if(res.status == 200){
            return res.data;
        } else {
            console.error("signSumitTx API Error: ", res);
            throw res.data;
        }   
    }
    catch (err) {
        console.error("signSubmitTx Failed: ", err);
        throw err;
    }
}

const updateEvent = async (event: Event): Promise<void> => {

    const payload = { 
        event: event
    }
    const api = "/api/updateEvent";

    try {
        let res = await axios({
            baseURL: baseURL,
            url: api,
            data: payload,
            method: 'post',
            timeout: 8000,
            headers: {
                'Content-Type': 'application/json'
            }
        })
        if(res.status == 200){
            return res.data;
        } else {
            console.error("updateEvent Error: ", res);
            throw res.data;
        }   
    }
    catch (err) {
        console.error("updateEvent Failed: ", err);
        throw err;
    }
}  

const updateSwap = async (swap: Swap): Promise<void> => {

    const payload = { 
        swap: swap
    }
    const api = "/api/updateSwap";

    try {
        let res = await axios({
            baseURL: baseURL,
            url: api,
            data: payload,
            method: 'post',
            timeout: 8000,
            headers: {
                'Content-Type': 'application/json'
            }
        })
        if(res.status == 200){
            return res.data;
        } else {
            console.error("updateSwap Error: ", res);
            throw res.data;
        }   
    }
    catch (err) {
        console.error("updateSwap Failed: ", err);
        throw err;
    }
}  

const verifyTicket = async (asset: string, pkh: string): Promise<void> => {

    const payload = { 
        asset: asset,
        pkh: pkh 
    }
    const api = "/api/verifyTicket";

    try {
        let res = await axios({
            baseURL: baseURL,
            url: api,
            data: payload,
            method: 'post',
            timeout: 8000,
            headers: {
                'Content-Type': 'application/json'
            }
        })
        if(res.status == 200){
            return res.data;
        } else {
            console.error("verifyTicket Error: ", res);
            throw res.data;
        }   
    }
    catch (err) {
        console.error("usedTicket Failed: ", err);
        throw err;
    }
}  

