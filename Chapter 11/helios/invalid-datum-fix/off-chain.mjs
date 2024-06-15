import { promises as fs } from 'fs';
import {
    Address,
    Datum,
    NetworkEmulator,
    NetworkParams,
    Program, 
    Value, 
    TxOutput,
    Tx, 
} from "@hyperionbt/helios";


// Create an Instance of NetworkEmulator
const network = new NetworkEmulator();

// Create wallets
const alice = network.createWallet(BigInt(10_000_000));
const bob = network.createWallet(BigInt(20_000_000));
const carol = network.createWallet(BigInt(30_000_000));
network.createUtxo(alice, 100_000_000n);
network.tick(10n);

// Set the Helios compiler optimizer flag
let optimize = false;
const lockAmount = 100_000_000n;  // minimum lovelace needed to send an NFT

// Read in the multi-sig validator script
const multiSigScript = await fs.readFile('./multisig.hl', 'utf8');
const multiSigProgram  = Program.new(multiSigScript);
multiSigProgram.parameters = {["ALICE_PKH"] : alice.pubKeyHash};
multiSigProgram.parameters = {["CAROL_PKH"] : carol.pubKeyHash};
const multiSigCompProgram = multiSigProgram.compile(optimize);
const multiSigValAddr = Address.fromHashes(multiSigCompProgram.validatorHash)
  
// Network Parameters
const networkParamsFile = await fs.readFile('./preprod.json', 'utf8');
const networkParams = new NetworkParams(JSON.parse(networkParamsFile.toString()));


/**
* Usage: npm run dev
*/
const main = async () => {

    // Initalize the state of the emulator with NFT UTXOs
    await setup(); 
    await sign();
    await withdraw();

    console.log("");
    console.log("Alice Wallet");
    console.log("------------");
    (await alice.utxos).forEach((utxo) => {console.log(utxo.value.dump())})
    console.log("");
    console.log("Bob Wallet");
    console.log("----------");
    (await bob.utxos).forEach((utxo) => {console.log(utxo.value.dump())})
    console.log("");
    console.log("Carol Wallet");
    console.log("----------");
    (await carol.utxos).forEach((utxo) => {console.log(utxo.value.dump())})
    console.log("");
    console.log("Multi-Sig Address");
    console.log("---------------------");
    (await network.getUtxos(multiSigValAddr)).forEach((utxo) => {console.log(utxo.dump())})

}


const setup = async () => {

    try {
         // Start building a transaction to lock assets at validator
        const tx = new Tx();

        // Add the UTXO as inputs
        const utxos = await network.getUtxos(alice.address);
        tx.addInputs(utxos);

        // Construct the multisig datum for NFT A
        const multiSigDatum = new (multiSigProgram.types.Datum)(
            2,                          // required signatures
            new Value(lockAmount),      // 100 Ada amount
            bob.pubKeyHash,             // benificiary
            []          // signature list
        )

        // Attach the output to lock amount and datum
        tx.addOutput(new TxOutput(
            multiSigValAddr,
            new Value(lockAmount),
            Datum.inline(multiSigDatum)
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


const sign = async () => {

    try {
         // Start building a transaction to lock assets at validator
        const tx = new Tx();

        // Add the UTXO as inputs
        const utxos = await network.getUtxos(carol.address);
        tx.addInputs(utxos);

        // Create the multisig sign redeemer
        const signRedeemer = (new multiSigProgram.types.Redeemer.Sign(carol.pubKeyHash))
                              ._toUplcData();

        // Add the UTXO as inputs
        const valUtxos = await network.getUtxos(multiSigValAddr);

        //console.log("utxos: ", valUtxos[0].dump());
        tx.addInputs(valUtxos, signRedeemer);

        // Add the script as a witness to the transaction
        tx.attachScript(multiSigCompProgram);

        // Construct the multisig datum
        const multiSigDatum = new (multiSigProgram.types.Datum)(
            1,                                      // hack, change req to 1
            new Value(lockAmount),                  // 100 Ada amount
            bob.pubKeyHash,                         // benificiary
            [carol.pubKeyHash]    // signature list
        )

        // Attach the output to lock amount and datum
        tx.addOutput(new TxOutput(
            multiSigValAddr,
            new Value(lockAmount),
            Datum.inline(multiSigDatum)
        ));

        tx.addSigner(carol.pubKeyHash);

        await tx.finalize(networkParams, carol.address, utxos);

        // Submit Tx to the network
        const txId = await network.submitTx(tx);
        network.tick(10n);
        console.log("TxId", txId.dump());

    } catch (err) {
        console.error(err);
    }
}


const withdraw = async () => {

    try {
        // Start building a transaction to lock assets at validator
        const tx = new Tx();

        tx.addInputs(await bob.utxos);

        // Create the vesting claim redeemer
        const withdrawRedeemer = (new multiSigProgram.types.Redeemer.Withdraw())
                              ._toUplcData();

        // Add the UTXO as inputs
        const utxos = await network.getUtxos(multiSigValAddr);

        console.log("utxos: ", utxos);
        tx.addInputs(utxos, withdrawRedeemer);

        // Add the script as a witness to the transaction
        tx.attachScript(multiSigCompProgram);

        // Attach the output to withdraw amount
        tx.addOutput(new TxOutput(
            bob.address,
            new Value(lockAmount)
        ));

        tx.addSigner(bob.pubKeyHash);

        await tx.finalize(networkParams, bob.address, utxos);

        // Submit Tx to the network
        const txId = await network.submitTx(tx);
        network.tick(10n);
        console.log("TxId", txId.dump());
        
   } catch (err) {
       console.error(err);
   }
}

main();

