import { promises as fs } from 'fs';
import path from 'path';

import { 
  assert, 
  describe, 
  expect, 
  test,
} from 'vitest';

import {
  Address,
  NetworkParams,
  NetworkEmulator,
  Program,
  Value
} from "@hyperionbt/helios";

import {
    network,
    optimize
  } from '../config/settings';
import lock from '../off-chain/lock';
import cancel from '../off-chain/cancel';
import { ReturnType } from '../off-chain/types';
import { 
  getNetworkParams
} from '../off-chain/network';
import { 
  generateReport 
} from './utils';
import { NetworkName } from '../off-chain/types'


//Find the absolute path of the contracts directory
const contractDirectory = path.join(process.cwd(), 'contracts')
const validatorScript = await fs.readFile(contractDirectory + '/validators/vesting.hl', 'utf8');
  
// Read in the network parameter file
const networkParamsJson = await getNetworkParams(network);
const networkParams = new NetworkParams(networkParamsJson);

// Create an Instance of NetworkEmulator
const emulator = new NetworkEmulator();

// Create a Wallet - we add 10ADA to start
const ACCOUNT_0 = emulator.createWallet(30000000000n);
const ACCOUNT_1 = emulator.createWallet(60000000000n);
emulator.tick(10n);

let exCosts = [] as ReturnType[]

/**
* Unlock Test Cases
*/
describe('Cancel Test Cases', async () => {

  // Get validator adddress
  const vestingProgram  = Program.new(validatorScript);
  const compiledProgram = vestingProgram.compile(optimize);
  const contractAddress = Address.fromHashes(compiledProgram.validatorHash)

  // Amount of lovelace to lock
  const lockAmount = BigInt(2_000_000);

  test('Lock 2 Ada to script address', async () => {

    // Pre-condition
    const lockedValueStart = new Value(0n);
    const contractUtxosStart = await emulator.getUtxos(contractAddress);
    const contractValueStart = contractUtxosStart.reduce((amount, utxo) => 
      amount.add(utxo.output.value), new Value(0n)
    );

    assert(contractValueStart.eq(lockedValueStart));

    const result = await lock({
      lockAmount: lockAmount,
      wallet: ACCOUNT_0,
      params: networkParams,
      validator: validatorScript.toString(),
      network: {networkName: NetworkName.EMULATOR, emulator: emulator}
    });

    expect(result.status == 200).toBeTruthy();
    exCosts.push(result);
    emulator.tick(10n);

    // Post conditions
    const lockedValue = new Value(lockAmount);
    const contractUtxosEnd = await emulator.getUtxos(contractAddress);
    const contractValueEnd = contractUtxosEnd[1].output.value;

    assert(contractValueEnd.eq(lockedValue));
  })

  test('Cancel with wrong wallet', async () => {

    // Pre-condition
    const contractUtxosStart = await emulator.getUtxos(contractAddress);
    const contractValueStart = contractUtxosStart.reduce((amount, utxo) => 
      amount.add(utxo.output.value), new Value(0n)
    );

    const result = await cancel({
      lockAmount: lockAmount,
      wallet: ACCOUNT_1,
      params: networkParams,
      validator: validatorScript.toString(),
      network: {networkName: NetworkName.EMULATOR, emulator: emulator}
    });

    expect(result.status == 200).toBeFalsy();
    emulator.tick(10n);

    // Post conditions
    const contractUtxosEnd = await emulator.getUtxos(contractAddress);
    const contractValueEnd = contractUtxosEnd.reduce((amount, utxo) => 
      amount.add(utxo.output.value), new Value(0n)
    );

    assert(contractValueEnd.eq(contractValueStart));
  })

  test('Cancel with correct wallet', async () => {

    // Pre-condition
    const walletUtxosStart = await emulator.getUtxos(ACCOUNT_0.address);
    const walletValueStart = walletUtxosStart.reduce((amount, utxo) => 
      amount.add(utxo.output.value), new Value(0n)
    );
    
    const result = await cancel({
      lockAmount: lockAmount,
      wallet: ACCOUNT_0,
      params: networkParams,
      validator: validatorScript.toString(),
      network: {networkName: NetworkName.EMULATOR, emulator: emulator}
    });

    console.log(result.msg);
    expect(result.status == 200).toBeTruthy();
    exCosts.push(result);
    emulator.tick(10n);

    // Post conditions
    const remainingValue = walletValueStart.add(new Value(lockAmount)).sub(new Value(exCosts[1].fee))
    const walletUtxosEnd = await emulator.getUtxos(ACCOUNT_0.address);
    const walletValueEnd = walletUtxosEnd.reduce((amount, utxo) => 
      amount.add(utxo.output.value), new Value(0n)
    );

    // User wallet canceled for 2 Ada minus fees
    assert(walletValueEnd.eq(remainingValue));
    generateReport(exCosts);
  })
})
