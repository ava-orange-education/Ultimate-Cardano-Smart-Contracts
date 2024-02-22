import { client } from '../lib/redis'
import { Schema, Repository } from 'redis-om'


//Event schema
const eventSchema = new Schema('event_key', {
    asset: {type: 'string'},  
    name: {type: 'text'},
    location: {type: 'text'},
    showtime: {type: 'string'},
    image: {type: 'string'},
    allocated: {type: 'number'},
    holding: {type: 'number'},
    released: {type: 'number'},
    converted: {type: 'number'},
    holdValHash: {type: 'string'},
    paymentPKH: {type: 'string'},
    stakePKH: {type: 'string'},
    txId: {type: 'string'},
    confirmed: {type: 'boolean'},
    active: {type: 'boolean'},
  })

// Create the repositories
const eventRepository = new Repository(eventSchema, client)

// Create the indexes
eventRepository.createIndex()

export { eventRepository }