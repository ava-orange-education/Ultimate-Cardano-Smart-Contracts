import { promises as fs } from 'fs';
import {
    Address,
    Assets, 
    NetworkEmulator,
    NetworkParams,
    Program, 
    Value, 
    textToBytes,
    TxOutput,
    Tx, 
} from "@hyperionbt/helios";


// Create an Instance of NetworkEmulator
const network = new NetworkEmulator();

// Create wallets
const alice = network.createWallet(BigInt(10_000_000));
network.tick(10n);

// Set the Helios compiler optimizer flag
let optimize = false;
const minAda = 2_000_000n;  // minimum lovelace needed to send an NFT

// Dummy validator script
const someScript = await fs.readFile('./someScript.hl', 'utf8');
const someProgram  = Program.new(someScript);
const someCompProgram = someProgram.compile(optimize);
const someValAddr = Address.fromHashes(someCompProgram.validatorHash)
  
// Network Parameters
const networkParamsFile = await fs.readFile('./preprod.json', 'utf8');
const networkParams = new NetworkParams(JSON.parse(networkParamsFile.toString()));


/**
* Usage: npm run dev
*/
const main = async () => {

    // Initalize the state of the emulator with NFT UTXOs
    await mint(); 

    console.log("");
    console.log("Alice Wallet");
    console.log("------------");
    (await alice.utxos).forEach((utxo) => {console.log(utxo.value.dump())})
    console.log("");
    console.log("Buy Validator Address");
    console.log("---------------------");
    (await network.getUtxos(someValAddr)).forEach((utxo) => {console.log(utxo.value.dump())})

}


const mint = async () => {

    try {
        // Start building a transaction to lock assets at validator
        const tx = new Tx();

        // Add the UTXO as inputs
        network.createUtxo(alice, 5_000_000n);
        network.tick(10n);
        const utxos = await network.getUtxos(alice.address);
        const utxoId = utxos[0].outputId.txId.hex;
        const utxoIdx = utxos[0].outputId.utxoIdx;
        tx.addInputs(utxos);

        // Read in the minting script
        const mintScript = await fs.readFile('./threadToken.hl', 'utf8');
        const mintProgram  = Program.new(mintScript);
        mintProgram.parameters = {["TX_ID"] : utxoId};
        mintProgram.parameters = {["TX_IDX"] : utxoIdx};
        const mintCompProgram = mintProgram.compile(optimize);

        // Add the script as a witness to the transaction
        tx.attachScript(mintCompProgram);

        // Create the minting claim redeemer
        const mintRedeemer = (new mintProgram.types.Redeemer.Burn())._toUplcData();

        // Create the minted tokens
        const token = [[textToBytes("Thread Token"), 1n]];
        const tokens = [[textToBytes("Thread Token"), 2n]];

        // Create the minted assets
        const asset = new Assets([[mintCompProgram.mintingPolicyHash, token]])

        // Mint the thread token
        tx.mintTokens(
            mintCompProgram.mintingPolicyHash, 
            tokens, 
            mintRedeemer 
        )

        // Construct the output to send token to an address
        tx.addOutput(new TxOutput(
            someValAddr,
            new Value(minAda, asset)
        ));

         // Construct the output to send token to an address
         tx.addOutput(new TxOutput(
            alice.address,
            new Value(minAda, asset)
        ));

        await tx.finalize(networkParams, alice.address, utxos);

        // Submit Tx to the network
        const txId = await network.submitTx(tx);
        network.tick(10n);
        console.log("TxId", txId.dump());

    } catch (err) {
        console.error(err);
    }
}


main();

