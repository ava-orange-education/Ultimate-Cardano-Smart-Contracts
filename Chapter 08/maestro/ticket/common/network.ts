import axios from 'axios';
import { TicketInfo } from './types';

export {
    getTicketMetadata,
    network
}

const network = "preprod"
const env = process.env.NEXT_PUBLIC_ENV as string;
const host = process.env.NEXT_PUBLIC_HOST as string;
const port = env == "dev" ? process.env.NEXT_PUBLIC_PORT as string : "";
const protocol = process.env.NEXT_PUBLIC_PROTOCOL as string;
const baseURL = protocol + '://' + host + port;
if (host === "" || protocol == "") {
    alert("Please make sure you host and protocol environment variables are set");
    throw console.error("Please make sure you host, port and protocol environment variables are set");
}

const getTicketMetadata = async (ticketPolicyId: string, ticketTokenName: string): Promise<TicketInfo> => {

    const payload = { 
        ticketPolicyId: ticketPolicyId,
        ticketTokenName: ticketTokenName
    }
    const api = "/api/getTicketMetadata";

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
          console.error("getTicketMetadata Error: ", res);
          throw res.data;
        }   
    }
    catch (err) {
        console.error("getTicketMetadata Failed: ", err);
        throw err;
    }
  }  

