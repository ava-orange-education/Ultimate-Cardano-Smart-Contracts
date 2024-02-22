import { promises as fs } from 'fs';
import {
    Address,
    Assets, 
    Datum,
    MintingPolicyHash,
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
const bob = network.createWallet(BigInt(300_000_000));
network.tick(10n);

// Set the Helios compiler optimizer flag
let optimize = false;
const minAda = 2_000_000n;  // minimum lovelace needed to send an NFT

// NFT A
const nftATN = textToBytes('NFT A');
const nftAMPH = MintingPolicyHash.fromHex(
    '16aa5486dab6527c4697387736ae449411c03dcd20a3950453e6779a'
);
const nftA = new Assets();
nftA.addComponent(nftAMPH, nftATN, 1n);

// NFT B
const nftBTN = textToBytes('NFT B');
const nftBMPH = MintingPolicyHash.fromHex(
    '16aa5486dab6527c4697387736ae449411c03dcd20a3950453e6779b'
);
const nftB = new Assets();
nftB.addComponent(nftBMPH, nftBTN, 1n);

// Read in the buy validator script
const buyScript = await fs.readFile('./buy.hl', 'utf8');
const buyProgram  = Program.new(buyScript);
buyProgram.parameters = {["NFT_TN"] : nftATN};
buyProgram.parameters = {["NFT_MPH"] : nftAMPH};
const buyCompProgram = buyProgram.compile(optimize);
const buyValAddr = Address.fromHashes(buyCompProgram.validatorHash)
  
// Network Parameters
const networkParamsFile = await fs.readFile('./preprod.json', 'utf8');
const networkParams = new NetworkParams(JSON.parse(networkParamsFile.toString()));


/**
* Usage: npm run dev
*/
const main = async () => {

    // Initalize the state of the emulator with NFT UTXOs
    await setup(); 
    await buy();

    console.log("");
    console.log("Alice Wallet");
    console.log("------------");
    (await alice.utxos).forEach((utxo) => {console.log(utxo.value.dump())})
    console.log("");
    console.log("Bob Wallet");
    console.log("----------");
    (await bob.utxos).forEach((utxo) => {console.log(utxo.value.dump())})
    console.log("");
    console.log("Buy Validator Address");
    console.log("---------------------");
    (await network.getUtxos(buyValAddr)).forEach((utxo) => {console.log(utxo.value.dump())})

}


const setup = async () => {

    try {
         // Add additional tokens to wallet alice
         network.createUtxo(alice, 2_000_000n, nftA);
         network.createUtxo(alice, 2_000_000n, nftB);
         network.tick(10n);

         // Start building a transaction to lock assets at validator
        const tx = new Tx();

        // Add the UTXO as inputs
        const utxos = await network.getUtxos(alice.address);
        tx.addInputs(utxos);

        // Construct the vesting datum for NFT A
        const buyDatumA = new (buyProgram.types.Datum)(
            alice.pubKeyHash,
            new Value(100_000_000n)
        )

        // Attach the output to lock NFT A
        tx.addOutput(new TxOutput(
            buyValAddr,
            new Value(minAda, nftA),
            Datum.inline(buyDatumA)
        ));

        // Construct the vesting datum for NFT B
        const buyDatumB = new (buyProgram.types.Datum)(
            alice.pubKeyHash,
            new Value(150_000_000n)
        )

        // Attach the output to lock NFT B
        tx.addOutput(new TxOutput(
            buyValAddr,
            new Value(minAda, nftB),
            Datum.inline(buyDatumB)
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


const buy = async () => {

    try {
        // Start building a transaction to lock assets at validator
        const tx = new Tx();

        tx.addInputs(await bob.utxos);

        // Create the vesting claim redeemer
        const buyRedeemer = (new buyProgram .types.Redeemer.Buy(bob.pubKeyHash))
                              ._toUplcData();

        // Add the UTXO as inputs
        const utxos = await network.getUtxos(buyValAddr);
        const filteredUtxos = utxos.filter(utxo => 
            utxo.value.assets.has(nftAMPH, nftATN)
        )

        console.log(" filteredUtxos: ", filteredUtxos);
        tx.addInputs(filteredUtxos, buyRedeemer);

        // Add the script as a witness to the transaction
        tx.attachScript(buyCompProgram);

        // Attach the output to send both NFT A & B to bob
        //tx.addOutput(new TxOutput(
        //    bob.address,
        //    new Value(minAda, nftA).add(new Value(0n, nftB))
        //));

        tx.addOutput(new TxOutput(
            bob.address,
            new Value(minAda, nftA)
        ));

        // Attach the output to pay alice
        tx.addOutput(new TxOutput(
            alice.address,
            new Value(150_000_000n)
        ));

        await tx.finalize(networkParams, bob.address, utxos);

        console.log("tx: ", tx.dump);

        // Submit Tx to the network
        const txId = await network.submitTx(tx);
        network.tick(10n);
        console.log("TxId", txId.dump());
        
   } catch (err) {
       console.error(err);
   }
}

main();

