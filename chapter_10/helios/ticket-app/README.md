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

#
### Please Note: This is a project-based learning example and not intended for production use

### Legal Notice
```
MIT License

Copyright (c) 2023 Context Solutions Inc

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
