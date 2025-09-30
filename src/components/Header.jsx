import {
  Box,
  Heading,
  Container,
  IconButton,
  Tooltip,
  useColorMode,
  useColorModeValue,
  Flex,
  Image,
  HStack,
  Text,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  useDisclosure,
  VStack,
  Badge,
  Link
} from '@chakra-ui/react';
import { SunIcon, MoonIcon, InfoIcon, ExternalLinkIcon } from '@chakra-ui/icons';

function ColorModeToggle() {
  const { colorMode, toggleColorMode } = useColorMode();
  
  return (
    <Tooltip label={`Switch to ${colorMode === 'light' ? 'dark' : 'light'} mode`} hasArrow>
      <IconButton
        aria-label="Toggle color mode"
        icon={colorMode === 'light' ? <MoonIcon /> : <SunIcon />}
        onClick={toggleColorMode}
        variant="ghost"
        size="md"
        _hover={{
          bg: useColorModeValue('gray.200', 'gray.600')
        }}
      />
    </Tooltip>
  );
}

function DataSourcesModal() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  
  const dataSources = [
    {
      name: "CoinGecko API",
      description: "Market data, trading volume, token prices, exchange listings",
      url: "https://docs.coingecko.com/reference/introduction",
      category: "Market Data"
    },
    {
      name: "DeFiLlama API", 
      description: "Protocol TVL (Total Value Locked), DeFi analytics",
      url: "https://defillama.com/docs/api",
      category: "DeFi Analytics"
    },
    {
      name: "Uniswap V3 Subgraph",
      description: "Uniswap V3 pools, trading volumes, and liquidity data",
      url: "https://thegraph.com/explorer/subgraphs/5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV",
      category: "DEX Data"
    },
    {
      name: "Uniswap V2 Subgraph",
      description: "Uniswap V2 pairs, trading volumes, and liquidity data",
      url: "https://thegraph.com/explorer/subgraphs/EYCKATKGBKLWvSfwvBjzfCBmGwYNdVkduYXVivCsLRFu",
      category: "DEX Data"
    },
    {
      name: "Balancer V2 Subgraph",
      description: "Balancer V2 pools, trading volumes, and liquidity data",
      url: "https://thegraph.com/explorer/subgraphs/C4ayEZP2yTXRAB8vSaTrgN4m9anTe9Mdm2ViyiAuV9TV",
      category: "DEX Data"
    },
    {
      name: "SushiSwap Subgraph",
      description: "SushiSwap pools and trading data",
      url: "https://thegraph.com/explorer/subgraphs/5nnoU1nUFeWqtXgbpC54L9PWdpgo7Y9HYinR3uTMsfzs",
      category: "DEX Data"
    },
    {
      name: "SushiSwap V2 Subgraph",
      description: "SushiSwap V2 pairs and trading volumes",
      url: "https://thegraph.com/explorer/subgraphs/GyZ9MgVQkTWuXGMSd3LXESvpevE8S8aD3uktJh7kbVmc",
      category: "DEX Data"
    },
    {
      name: "Curve API",
      description: "Curve Finance API for pool data and trading volumes",
      url: "https://curve.fi/api",
      category: "DEX Data"
    },
    {
      name: "Fraxswap Subgraph",
      description: "Fraxswap DEX data for FRAX protocol",
      url: "https://thegraph.com/explorer/subgraphs/3AMhp8Ck6ZScMibA8jfLhWFA9fKH6Zi8fMPHtb74Vsxv",
      category: "DEX Data"
    },
    {
      name: "Ethereum RPC",
      description: "On-chain token balances and contract interactions",
      url: "https://ethereum.org/en/developers/docs/apis/json-rpc/",
      category: "Blockchain Data"
    }
  ];

  return (
    <>
      <Tooltip label="View Data Sources" hasArrow>
        <IconButton
          aria-label="Data sources info"
          icon={<InfoIcon />}
          onClick={onOpen}
          variant="ghost"
          size="md"
          _hover={{
            bg: useColorModeValue('gray.200', 'gray.600')
          }}
        />
      </Tooltip>

      <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent mx={{ base: 4, sm: 6, md: 8 }}>
          <ModalHeader>Data Sources</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text fontSize="sm" color="gray.500" mb={4}>
              This dashboard aggregates data from multiple reliable sources to provide comprehensive DeFi protocol metrics.
            </Text>
            <VStack spacing={4} align="stretch">
              {dataSources.map((source, index) => (
                <Box 
                  key={index} 
                  p={4} 
                  border="1px solid" 
                  borderColor={useColorModeValue('gray.200', 'gray.600')}
                  borderRadius="md"
                >
                  <HStack justify="space-between" mb={2}>
                    <Text fontWeight="bold" fontSize="md">{source.name}</Text>
                    <Badge colorScheme="blue" size="sm">{source.category}</Badge>
                  </HStack>
                  <Text fontSize="sm" color="gray.600" mb={2}>
                    {source.description}
                  </Text>
                  <Link 
                    href={source.url} 
                    isExternal 
                    color="blue.400" 
                    _hover={{ color: 'blue.300' }}
                    fontSize="sm"
                    display="flex"
                    alignItems="center"
                    gap={1}
                  >
                    Visit {source.name}
                    <ExternalLinkIcon boxSize={3} />
                  </Link>
                </Box>
              ))}
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button onClick={onClose} size="sm">Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

export default function Header() {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  return (
    <Box 
      as="header" 
      bg={bgColor}
      borderBottom="1px solid"
      borderColor={borderColor}
      shadow="sm"
      position="sticky"
      top={0}
      zIndex={1000}
      w="100vw"
      maxW="100vw"
      minW="100vw"
      overflow="hidden"
    >
      <Container maxW="none" px={{ base: 4, md: 6 }} py={{ base: 1, md: 2 }}>
        <Flex justify="space-between" align="center" minH={{ base: "50px", sm: "55px", md: "60px" }} position="relative">
          {/* Logo on the left */}
          <Link 
            href="https://openstablecoinindex.com/" 
            isExternal
            _hover={{ opacity: 0.8 }}
            transition="opacity 0.2s"
          >
            <Image 
              src="/logo.svg" 
              alt="Open Index Logo" 
              height={{ base: "30px", sm: "35px", md: "40px" }}
              width={{ base: "30px", sm: "35px", md: "40px" }}
              flexShrink={0}
            />
          </Link>
          
          {/* Title centered both horizontally and vertically */}
          <Box 
            position="absolute"
            left="50%"
            top="50%"
            transform="translate(-50%, -50%)"
            zIndex={1}
            maxW={{ base: "220px", sm: "500px", md: "700px", lg: "800px" }}
          >
            <VStack spacing={0} align="center">
              {/* Main Title */}
              <Heading 
                size={{ base: "sm", sm: "md", md: "lg" }}
                color={useColorModeValue('gray.800', 'white')}
                noOfLines={1}
                fontWeight="bold"
                fontFamily="Inter"
                textAlign="center"
                lineHeight="1.2"
              >
                {/* Mobile: Just $OPEN */}
                <Text as="span" display={{ base: "inline", sm: "none" }}>
                  $OPEN
                </Text>
                {/* Small: $OPEN Index */}
                <Text as="span" display={{ base: "none", sm: "inline", md: "none" }}>
                  $OPEN Index
                </Text>
                {/* Medium and up: Full title */}
                <Text as="span" display={{ base: "none", md: "inline" }}>
                  Metrics: $OPEN Index
                </Text>
              </Heading>
              
              {/* Subtitle */}
              <Text
                fontSize={{ base: "2xs", sm: "xs", md: "sm" }}
                color={useColorModeValue('gray.600', 'gray.400')}
                textAlign="center"
                fontWeight="normal"
                mt={0.5}
              >
                {/* Mobile: Short version */}
                <Text as="span" display={{ base: "inline", sm: "none" }}>
                  (Current & Proposed)
                </Text>
                {/* Small and up: Full version */}
                <Text as="span" display={{ base: "none", sm: "inline" }}>
                  (Constituents & Proposed)
                </Text>
              </Text>
            </VStack>
          </Box>
          
          {/* Controls on the right */}
          <HStack spacing={2}>
            <DataSourcesModal />
            <ColorModeToggle />
          </HStack>
        </Flex>
      </Container>
    </Box>
  );
} 