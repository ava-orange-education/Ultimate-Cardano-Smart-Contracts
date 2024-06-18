import { NetworkEmulator } from "@hyperionbt/helios";

export type ReturnType = {  
    status: number;
    txName: string;
    msg: undefined | string;
    txId: undefined | string;
    cpu: undefined | bigint;
    mem: undefined | bigint;
    fee: undefined | bigint;
}

export enum NetworkName {
    PROD = "prod",
    PREPROD = "preprod",
    PREVIEW = "preview",
    DEVNET = "devnet",
    EMULATOR = "emulator"
}

export type Network = {
    networkName: NetworkName,
    emulator: undefined | NetworkEmulator
}
