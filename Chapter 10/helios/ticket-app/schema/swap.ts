import { client } from '../lib/redis'
import { Schema, Repository } from 'redis-om'

//Swap schema
const swapSchema = new Schema('swapKey', {
    name: {type: 'text'},
    location: {type: 'text'},
    showtime: {type: 'number'},
    image: {type: 'string'},
    description: {type: 'text'},
    askedAsset: {type: 'string'},
    askedAssetQty: {type: 'number'},
    offeredAsset: {type: 'string'},
    offeredAssetQty: {type: 'number'},
    beaconAsset: {type: 'string'},
    holdValHash: {type: 'string'},
    paymentPKH: {type: 'string'},
    stakePKH: {type: 'string'},
    ownerPKH: {type: 'string'},
    minLovelace: {type: 'number'},
    txId: {type: 'string'},
    confirmed: {type: 'boolean'},
    active: {type: 'boolean'},
  })

// Create the repositories
const swapRepository = new Repository(swapSchema, client)

// Create the indexes
swapRepository.createIndex()

export { swapRepository }