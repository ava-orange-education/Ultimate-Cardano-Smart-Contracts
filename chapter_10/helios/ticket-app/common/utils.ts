export { 
	assert,
	convertIpfsUrl
}

/**
 * Throws an error if 'cond' is false.
 * @param {boolean} cond 
 * @param {string} msg 
 */
function assert(cond : Boolean, msg: string = "assertion failed") {
	if (!cond) {
		throw new Error(msg);
	}
}

/**
 * Converts ipfs://CID to https://ipfs.io/CID
 * @param {string} ipfsUrl
 */
function convertIpfsUrl(ipfsUrl: string): string {
    const ipfsPrefix = 'ipfs://';
    const httpGatewayPrefix = 'https://ipfs.io/ipfs/';

    if (ipfsUrl.startsWith(ipfsPrefix)) {
        return httpGatewayPrefix + ipfsUrl.slice(ipfsPrefix.length);
    }

    throw new Error('Invalid IPFS URL');
}
