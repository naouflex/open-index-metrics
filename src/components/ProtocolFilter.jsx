import {
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Button,
  Checkbox,
  Box,
  Text,
  useColorModeValue,
  HStack,
  ButtonGroup
} from '@chakra-ui/react';
import { SearchIcon } from '@chakra-ui/icons';

export default function ProtocolFilter({ visibleProtocols, onToggleProtocol, protocols }) {
  const menuBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  
  // Count visible protocols
  const visibleCount = Object.values(visibleProtocols).filter(Boolean).length;
  const totalCount = protocols.length;
  
  const handleShowAll = () => {
    protocols.forEach(protocol => {
      if (!visibleProtocols[protocol.ticker]) {
        onToggleProtocol(protocol.ticker);
      }
    });
  };
  
  const handleHideAll = () => {
    protocols.forEach(protocol => {
      if (visibleProtocols[protocol.ticker]) {
        onToggleProtocol(protocol.ticker);
      }
    });
  };
  
  const handleShowCurrent = () => {
    protocols.forEach(protocol => {
      const shouldBeVisible = protocol.openStatus === 'current';
      if (visibleProtocols[protocol.ticker] !== shouldBeVisible) {
        onToggleProtocol(protocol.ticker);
      }
    });
  };
  
  const handleShowWatchlist = () => {
    protocols.forEach(protocol => {
      const shouldBeVisible = protocol.openStatus === 'watchlist' || protocol.openStatus === 'proposed';
      if (visibleProtocols[protocol.ticker] !== shouldBeVisible) {
        onToggleProtocol(protocol.ticker);
      }
    });
  };
  
  return (
    <Menu closeOnSelect={false}>
      <MenuButton
        as={Button}
        leftIcon={<SearchIcon />}
        size="sm"
        variant="outline"
        colorScheme="gray"
      >
        Protocols ({visibleCount}/{totalCount})
      </MenuButton>
      <MenuList 
        bg={menuBg} 
        borderColor={borderColor}
        maxH="500px"
        overflowY="auto"
        minW="250px"
      >
        <Box px={3} py={2} borderBottom="1px" borderColor={borderColor}>
          <Text fontSize="sm" fontWeight="bold" mb={2}>
            Show/Hide Protocols
          </Text>
          <ButtonGroup size="xs" spacing={2} w="100%" mb={2}>
            <Button 
              onClick={handleShowAll} 
              colorScheme="green" 
              variant="outline"
              flex={1}
            >
              Show All
            </Button>
            <Button 
              onClick={handleHideAll} 
              colorScheme="red" 
              variant="outline"
              flex={1}
            >
              Hide All
            </Button>
          </ButtonGroup>
          <ButtonGroup size="xs" spacing={2} w="100%">
            <Button 
              onClick={handleShowCurrent} 
              colorScheme="blue" 
              variant="solid"
              flex={1}
            >
              Current Only
            </Button>
            <Button 
              onClick={handleShowWatchlist} 
              colorScheme="orange" 
              variant="solid"
              flex={1}
            >
              Watchlist Only
            </Button>
          </ButtonGroup>
        </Box>
        {protocols.map((protocol) => (
          <MenuItem 
            key={protocol.ticker}
            onClick={() => onToggleProtocol(protocol.ticker)}
            py={2}
          >
            <Checkbox
              isChecked={visibleProtocols[protocol.ticker]}
              onChange={() => onToggleProtocol(protocol.ticker)}
              mr={2}
            >
              <Text fontSize="sm">{protocol.ticker} - {protocol.name}</Text>
            </Checkbox>
          </MenuItem>
        ))}
      </MenuList>
    </Menu>
  );
}
