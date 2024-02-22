import { createClient, RedisClientType } from 'redis';

declare global {
  var _redisClientPromise: undefined | RedisClientType
}

let client: RedisClientType;
let redisClient: RedisClientType;

if (!global._redisClientPromise) {
  redisClient = createClient({
    password: process.env.REDIS_PASSWORD,
    socket: {
      host: process.env.REDIS_HOST,
      port: Number(process.env.REDIS_PORT)
    }
  });
  redisClient.connect().then(() => {
      console.info(
          `NextJS Redis client connected..`
      );
  }).catch((error) => {
      console.error(`[ERROR] Couldn't connect to Redis client: ${error}`);
  });
  global._redisClientPromise = redisClient as RedisClientType;
}
client = global._redisClientPromise

client.on('error', (err) => console.log(err))

export { client }