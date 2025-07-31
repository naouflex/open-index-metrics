import {
  Box,
  Text,
  VStack,
  HStack,
  Link,
  Container,
  useColorModeValue
} from '@chakra-ui/react';
import { ExternalLinkIcon } from '@chakra-ui/icons';

export default function Footer() {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  return (
    <Box 
      as="footer" 
      bg={bgColor}
      borderTop="1px solid"
      borderColor={borderColor}
      w="100vw"
      maxW="100vw"
      overflow="hidden"
    >
      <Container maxW="none" px={{ base: 4, md: 6 }} py={{ base: 1, md: 2 }}>
        <VStack spacing={{ base: 0.5, md: 1 }} align="center">
          <Text fontSize={{ base: "xs", md: "sm" }} color="gray.500" textAlign="center">
            Data sources: CoinGecko, DeFiLlama, The Graph Protocol, Curve API
          </Text>
          <Text fontSize="xs" color="gray.400" textAlign="center">
            Last updated: {new Date().toLocaleString()}
          </Text>
          <HStack spacing={{ base: 2, md: 4 }} justify="center" flexWrap="wrap">
            <Text fontSize="xs" color="gray.400" textAlign="center">
              Made with{' '}
              <Text as="span" color="blue.500">💙</Text>
              {' '}by{' '}
              <Link href="https://x.com/naouufel" isExternal color="blue.400" _hover={{ color: 'blue.300' }}>
                Naoufel
              </Link>
            </Text>
            <Text fontSize="xs" color="gray.400" display={{ base: "none", sm: "inline" }}>•</Text>
            <Link 
              href="https://github.com/naouflex/open-index-metrics/" 
              isExternal 
              color="blue.400" 
              _hover={{ color: 'blue.300' }}
              fontSize="xs"
              display="flex"
              alignItems="center"
              gap={1}
            >
              <Text display={{ base: "none", sm: "inline" }}>Contribute on GitHub</Text>
              <Text display={{ base: "inline", sm: "none" }}>GitHub</Text>
              <ExternalLinkIcon boxSize={2} />
            </Link>
          </HStack>
        </VStack>
      </Container>
    </Box>
  );
} 