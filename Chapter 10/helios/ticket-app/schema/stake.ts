import { client } from '../lib/redis'
import { Schema, Repository } from 'redis-om'

// Stake account schema
const stakeSchema = new Schema('stake', {
  stakeAddr: {type: 'string'},
  assets: {type: 'string[]'}
  })

// Create the repositories
const stakeRepository = new Repository(stakeSchema, client)

// Create the indexes
stakeRepository.createIndex()

export { stakeRepository }