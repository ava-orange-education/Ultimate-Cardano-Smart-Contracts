import { client } from '../lib/redis'
import { Schema, Repository } from 'redis-om'

// Ticket schema
const ticketsSchema = new Schema('tickets', {
  asset: {type: 'string'},
  pkh: {type: 'string'},
  used: {type: 'boolean'}
  })

// Create the repositories
const ticketsRepository = new Repository(ticketsSchema, client)

// Create the indexes
ticketsRepository.createIndex()

export { ticketsRepository }