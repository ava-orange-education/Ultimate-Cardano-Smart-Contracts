export {
  generateMetadata
}

/**
 * Generates label 721 metadata and returns a json string
 * @param {string} policyId 
 * @param {string} tokenName 
 * @param {string} description
 * @param {string} image
 * @param {bigint} qty
 * @param {string} utxoId
 * @param {number} utxoIdx   
 * @returns {string} label 721 metadata 
 */
function generateMetadata(
  policyId: string,
  tokenName: string,
  description: string,
  image: string,
  qty: bigint,
  utxoId: string,
  utxoIdx: number,

): JSON {
 
  // Generate the metadata
  const metadata =  
    `{
        "`+ policyId +`": {
            "Project": "Ticket",
            "Designer": "Ada Lovelace",
            "files": [
              {
                "mediaType": "image/png",
                "name": "Final",
                "src": "ipfs://` + image +`"
              }
            ],
            "`+ tokenName +`": {
            "image": "ipfs://` + image +`",
            "mediaType": "image/png",
            "name": "`+ tokenName +`",
            "description": "`+ description +`",
            "decimals": "0",
            "qty": "`+ qty +`",
            "utxoId": "`+ utxoId + `",
            "utxoIdx": "`+ utxoIdx +`"
          }
        }
      }`;
    
  return JSON.parse(metadata);
}
  