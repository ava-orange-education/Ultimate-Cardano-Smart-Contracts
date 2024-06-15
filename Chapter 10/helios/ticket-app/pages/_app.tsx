// pages/_app.js
import { ChakraProvider } from '@chakra-ui/react'
import type { AppProps } from 'next/app'
import { ColorModeScript } from '@chakra-ui/react'
import theme from '../config/theme'
import Layout from '../components/Layout'

function MyApp({ Component, pageProps } : AppProps) {
  return (
    <ChakraProvider theme={theme}>
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </ChakraProvider>
  )
}

export default MyApp