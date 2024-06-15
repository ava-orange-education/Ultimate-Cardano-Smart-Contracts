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
import { ReturnType } from '../off-chain/types';
import { 
  getNetworkParams
} from '../off-chain/network';
import { NetworkName } from '../off-chain/types'
import { 
  generateReport 
} from './utils';

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
emulator.tick(10n);

let exCosts = [] as ReturnType[]

/**
* Lock Ada Test Cases
*/
describe('Lock Test Cases', async () => {

  // Get validator adddress
  const vestingProgram  = Program.new(validatorScript);
  const compiledProgram = vestingProgram.compile(optimize);
  const contractAddress = Address.fromHashes(compiledProgram.validatorHash)

  // Amount of lovelace to lock
  const lockAmount = BigInt(2_000_000);

  test('Lock 2 Ada at script address', async () => {

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
    generateReport(exCosts);
  })
})






