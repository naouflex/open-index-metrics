import {
  Box,
  useColorModeValue
} from '@chakra-ui/react';
import Header from './Header';
import Footer from './Footer';

export default function Layout({ children }) {
  const bgColor = useColorModeValue('gray.50', 'gray.900');

  return (
    <Box
      minH="100vh"
      maxH="100vh"
      w="100vw"
      maxW="100vw"
      bg={bgColor}
      position="relative"
      overflow="hidden"
      display="flex"
      flexDirection="column"
    >
      {/* Header - fixed to viewport width */}
      <Header />

      {/* Main content area - scrollable within viewport */}
      <Box
        flex="1"
        overflow="hidden"
        position="relative"
        w="100%"
        maxW="100%"
      >
        {children}
      </Box>

      {/* Footer - fixed to viewport width */}
      <Footer />
    </Box>
  );
} 