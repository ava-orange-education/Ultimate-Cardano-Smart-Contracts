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
  
  ) : any {
   
  // Attached the metadata for the minting transaction
  const metadata = {"map": [[policyId, 
                        {"map": [[tokenName,
                          { "map": [["project", "Ticket"],
                                    ["designer", "Ada Lovelace"],
                                    ["name", tokenName],
                                    ["description", description],
                                    ["image", "ipfs://" + image +""],
                                    ["decimals", "0"],
                                    ["qty", qty.toString()],
                                    ["utxoId", utxoId],
                                    ["utxoIdx", utxoIdx.toString()],
                                    ["files", { "map": [["mediaType", "image/png"],
                                                        ["name", tokenName],
                                                        ["src", "ipfs://" + image +""]]
                                              }
                                    ]
                                  ]
                            }
                        ]]}
                    ]]}


    return metadata;
};
