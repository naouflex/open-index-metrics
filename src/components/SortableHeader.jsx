import {
  Box,
  Th,
  Text,
  HStack,
  Icon,
  useColorModeValue
} from '@chakra-ui/react';
import { TriangleUpIcon, TriangleDownIcon } from '@chakra-ui/icons';
import DataSourceBadge from './DataSourceBadge.jsx';

// ================= SORTABLE HEADER COMPONENT =================

export default function SortableHeader({ 
  column, 
  currentSort, 
  onSort, 
  onReset, 
  dataSource,
  disclaimer,
  children, 
  centerVertically = false, 
  ...props 
}) {
  const isActive = currentSort.column === column;
  const isAsc = isActive && currentSort.direction === 'asc';
  const isDesc = isActive && currentSort.direction === 'desc';
  
  return (
    <Th 
      cursor="pointer" 
      userSelect="none"
      _hover={{ bg: useColorModeValue('gray.200', 'gray.600') }}
      onClick={() => onSort(column)}
      onDoubleClick={() => isActive && onReset()}
      textAlign="center"
      {...props}
    >
      <Box 
        position="relative" 
        h="90px" 
        display="flex" 
        flexDirection="column" 
        alignItems="center" 
        justifyContent={centerVertically ? "center" : "flex-start"} 
        pt={centerVertically ? 0 : 2}
      >
        <HStack spacing={1} mb={centerVertically ? 0 : 2}>
          <Text>{children}</Text>
          {isActive && (
            <Icon as={isAsc ? TriangleUpIcon : TriangleDownIcon} boxSize={3} />
          )}
        </HStack>
        <Box position="absolute" bottom={1}>
          <DataSourceBadge source={dataSource} disclaimer={disclaimer} />
        </Box>
      </Box>
    </Th>
  );
} 