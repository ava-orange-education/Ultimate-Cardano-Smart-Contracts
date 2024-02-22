## Getting Started

You must set the following bash shell environment variables.
```
export NEXT_PUBLIC_HOST=localhost
export NEXT_PUBLIC_PORT=:3000
export NEXT_PUBLIC_PROTOCOL=http
export NEXT_PUBLIC_ENV=dev
export NEXT_PUBLIC_NETWORK=preprod
export REDIS_PASSWORD=your-redis-password
export REDIS_HOST=redis-host-name
export REDIS_PORT=redis-port
export BLOCKFROST_API=blockfrost-api-url
export BLOCKFROST_API_KEY=blockfrost-api-key
export WEBHOOK_AUTH_TOKEN=blockfrost-webhook-auth-token
export OWNER_PRIVATE_KEY=owner-private-key
export NEXT_PUBLIC_OWNER_PKH=owner-public-key
```

See ./init folder for generation of owner private & public key

Once env variables have been set then start application
```
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to launch the application.

