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
      <Container maxW="none" px={6} py={4}>
        <VStack spacing={3} align="center">
          <Text fontSize="sm" color="gray.500" textAlign="center">
            Data sources: CoinGecko, DeFiLlama, The Graph Protocol, Curve API
          </Text>
          <Text fontSize="xs" color="gray.400" textAlign="center">
            Last updated: {new Date().toLocaleString()}
          </Text>
          <HStack spacing={4} justify="center" flexWrap="wrap">
            <Text fontSize="xs" color="gray.400" textAlign="center">
              Made with{' '}
              <Text as="span" color="blue.500">💙</Text>
              {' '}by{' '}
              <Link href="https://x.com/naouufel" isExternal color="blue.400" _hover={{ color: 'blue.300' }}>
                Naoufel
              </Link>
            </Text>
            <Text fontSize="xs" color="gray.400">•</Text>
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
              Contribute on GitHub
              <ExternalLinkIcon boxSize={2} />
            </Link>
          </HStack>
        </VStack>
      </Container>
    </Box>
  );
} 