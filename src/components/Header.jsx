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
  Text
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
      <Container maxW="none" px={{ base: 4, md: 6 }} py={{ base: 3, md: 4 }}>
        <Flex justify="space-between" align="center" minH={{ base: "50px", md: "60px" }}>
          <HStack spacing={{ base: 2, md: 4 }} flex="1" mr={{ base: 2, md: 4 }}>
            <Image 
              src="/logo.svg" 
              alt="Open Index Logo" 
              height={{ base: "30px", sm: "35px", md: "40px" }}
              width={{ base: "30px", sm: "35px", md: "40px" }}
              flexShrink={0}
            />
            <Heading 
              size={{ base: "sm", sm: "md", md: "lg" }}
              color={useColorModeValue('gray.800', 'white')}
              noOfLines={1}
              fontWeight="bold"
              fontFamily="Inter"
              
            >
              <Text as="span" display={{ base: "none", sm: "inline" } } 
              textAlign="center">
                Metrics: $OPEN index (Constituents & Proposed)
              </Text>
              <Text as="span" display={{ base: "inline", sm: "none" }}>
                $OPEN
              </Text>
            </Heading>
          </HStack>
          <ColorModeToggle />
        </Flex>
      </Container>
    </Box>
  );
} 