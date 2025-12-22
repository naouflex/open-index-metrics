import {
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Button,
  Icon,
  Checkbox,
  Box,
  Text,
  useColorModeValue,
  HStack,
  ButtonGroup
} from '@chakra-ui/react';
import { ViewIcon } from '@chakra-ui/icons';

export default function ColumnVisibilityMenu({ visibleColumns, onToggleColumn, columnDefinitions }) {
  const menuBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  
  // Count visible columns
  const visibleCount = Object.values(visibleColumns).filter(Boolean).length;
  const totalCount = Object.keys(columnDefinitions).length;
  
  const handleShowAll = () => {
    Object.keys(columnDefinitions).forEach(key => {
      if (!visibleColumns[key]) {
        onToggleColumn(key);
      }
    });
  };
  
  const handleHideAll = () => {
    Object.keys(columnDefinitions).forEach(key => {
      // Don't hide the protocol column
      if (key !== 'protocol' && visibleColumns[key]) {
        onToggleColumn(key);
      }
    });
  };
  
  return (
    <Menu closeOnSelect={false}>
      <MenuButton
        as={Button}
        leftIcon={<ViewIcon />}
        size="sm"
        variant="outline"
        colorScheme="gray"
      >
        Columns ({visibleCount}/{totalCount})
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
            Show/Hide Columns
          </Text>
          <ButtonGroup size="xs" spacing={2} w="100%">
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
        </Box>
        {Object.entries(columnDefinitions).map(([key, label]) => {
          const isProtocolColumn = key === 'protocol';
          return (
            <MenuItem 
              key={key}
              onClick={() => !isProtocolColumn && onToggleColumn(key)}
              py={2}
              isDisabled={isProtocolColumn}
              opacity={isProtocolColumn ? 0.6 : 1}
              cursor={isProtocolColumn ? 'not-allowed' : 'pointer'}
            >
              <Checkbox
                isChecked={visibleColumns[key]}
                onChange={() => !isProtocolColumn && onToggleColumn(key)}
                mr={2}
                isDisabled={isProtocolColumn}
              >
                <Text fontSize="sm">
                  {label}
                  {isProtocolColumn && <Text as="span" fontSize="xs" color="gray.500"> (required)</Text>}
                </Text>
              </Checkbox>
            </MenuItem>
          );
        })}
      </MenuList>
    </Menu>
  );
}
