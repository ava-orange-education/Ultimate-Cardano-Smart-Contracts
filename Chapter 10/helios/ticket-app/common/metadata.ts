export {
    generateMetadataBeacon,
    generateMetadataTicket
  }
  
  /**
   * Generates label CIP-0025 beacon metadata, version 1 and returns a json string
   * @param {string} askedAsset 
   * @param {string} offeredAsset 
   * @param {string} beaconAsset
   * @param {string} holdValHash
   * @param {string} showtime
   * @param {string} paymentPKH
   * @param {string} stakePKH
   * @param {string} ownerPKH
   * @param {string} minLovelace
   * @returns {string} label 721 metadata 
   */
  function generateMetadataBeacon(
    askedAsset: string,
    offeredAsset: string,
    beaconAsset: string,
    holdValHash: string,
    showtime: string,
    paymentPKH: string,
    stakePKH: string,
    ownerPKH: string,
    minLovelace: string
  ) : any {
   
  // Attached the metadata for the minting transaction
  const metadata = {"map": [[beaconAsset.slice(0,56), 
                        {"map": [[beaconAsset.slice(56),
                          { "map": [["askedAsset", askedAsset],
                                    ["offeredAsset", offeredAsset],
                                    ["beaconAsset", beaconAsset],
                                    ["holdValHash", holdValHash],
                                    ["showtime", showtime],
                                    ["paymentPKH", paymentPKH],
                                    ["stakePKH", stakePKH],
                                    ["ownerPKH", ownerPKH],
                                    ["minLovelace", minLovelace]
                                  ]
                            }
                        ]]}
                    ]]}


    return metadata;
};


/**
 * Generates label CIP-0025 721 ticket metadata, version 1 and returns a json string
 * @param {string} policyId 
 * @param {string} name 
 * @param {string} location
 * @param {string} showtime
 * @param {string} image
 * @param {bigint} qty
 * @param {string} paymentPKH
 * @param {string} stakePKH
 * @param {string} utxoId
 * @param {number} utxoIdx
 * @param {string} holdValHash    
 * @param {number} minLovelace
 * @returns {string} label 721 metadata 
 */
function generateMetadataTicket(
  policyId: string,
  name: string,
  location: string,
  showtime: string,
  image: string,
  qty: bigint,
  paymentPKH: string,
  stakePKH: string,
  utxoId: string,
  utxoIdx: number,
  holdValHash: string,
  minLovelace: number,
) : any {

  const metadata = {"map": [[policyId, 
                      {"map": [[name,
                        { "map": [["project", "Ticket Time"],
                                  ["designer", "Ada Lovelace"],
                                  ["name", name],
                                  ["location", location],
                                  ["showtime", showtime],
                                  ["image", image],
                                  ["qty", qty.toString()],
                                  ["paymentPKH", paymentPKH],
                                  ["stakePKH", stakePKH],
                                  ["utxoId", utxoId],
                                  ["utxoIdx", utxoIdx.toString()],
                                  ["holdValHash", holdValHash],
                                  ["minLovelace", minLovelace.toString()],
                                  ["files", { "map": [["mediaType", "image/png"],
                                                      ["name", name],
                                                      ["src", image]]
                                            }
                                  ]
                                ]
                          }
                      ]]}
                  ]]}


  return metadata;
};
