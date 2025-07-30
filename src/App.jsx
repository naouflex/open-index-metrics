import { ChakraProvider, extendTheme, ColorModeScript } from '@chakra-ui/react'
import DeFiDashboard from './components/DeFiDashboard'

// Custom theme
const theme = extendTheme({
  config: {
    initialColorMode: 'dark',
    useSystemColorMode: false,
  },
  colors: {
    brand: {
      50: '#e6fffa',
      100: '#b2f5ea',
      200: '#81e6d9',
      500: '#38b2ac',
      900: '#234e52',
    },
  },
  fonts: {
    heading: 'Inter, sans-serif',
    body: 'Inter, sans-serif',
  },
})

function App() {
  return (
    <>
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />
    <ChakraProvider theme={theme}>
      <DeFiDashboard />
    </ChakraProvider>
    </>
  )
}

export default App
