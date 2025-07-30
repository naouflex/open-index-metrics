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
  HStack
} from '@chakra-ui/react';
import { SunIcon, MoonIcon } from '@chakra-ui/icons';

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
      overflow="hidden"
    >
      <Container maxW="none" px={6} py={4}>
        <Flex justify="space-between" align="center" minH="60px">
          <HStack spacing={4} flex="1" mr={4}>
            <Image 
              src="/logo.svg" 
              alt="Open Index Logo" 
              height="40px" 
              width="40px"
              flexShrink={0}
            />
            <Heading 
              size="lg" 
              color={useColorModeValue('gray.800', 'white')}
              noOfLines={1}
            >
              Metrics: $OPEN index (Constituents & Proposed)
            </Heading>
          </HStack>
          <ColorModeToggle />
        </Flex>
      </Container>
    </Box>
  );
} 