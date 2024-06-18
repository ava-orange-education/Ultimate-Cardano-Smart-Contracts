import { 
    bytesToHex, 
    RootPrivateKey
} from "@hyperionbt/helios";

/***************************************************
* Usage:
* export ENTROPY="ridge cereal poet happy borrow melody fashion donor amateur calm erupt horror traffic onion crack brick cycle dawn wall thing census parent bachelor next"
* node ./generatePrivateKey.mjs
* @output {string} PrivateKeyHex PublicKeyHex
****************************************************/

const main = async () => {

    if (!process.env.ENTROPY) {
        console.error("ENTROPY must be set as an environment variable");
        return;
    }

    const rootKey = RootPrivateKey.fromPhrase(process.env.ENTROPY.split(" "));
    const privateKey = rootKey.deriveSpendingKey();
    const publicKey = privateKey.derivePubKey();
 
    console.log(`export OWNER_PRIVATE_KEY=${bytesToHex(privateKey.bytes)}`);
    console.log(`export NEXT_PUBLIC_OWNER_PKH=${publicKey.pubKeyHash.hex}`);

}

main();