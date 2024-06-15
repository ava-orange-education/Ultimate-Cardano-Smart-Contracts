import { client } from '../lib/redis'
import { Schema, Repository } from 'redis-om'

// Beacon schema
const beaconSchema = new Schema('beacon', {
  beaconMPH: {type: 'string'},
  beaconTN: {type: 'string[]'},
  })

// Create the repositories
const beaconRepository = new Repository(beaconSchema, client)

// Create the indexes
beaconRepository.createIndex()

export { beaconRepository }