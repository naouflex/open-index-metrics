import {
  Badge,
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
  Tooltip
} from '@chakra-ui/react';
import { InfoIcon } from '@chakra-ui/icons';

// ================= DATA SOURCE BADGE COMPONENT =================

export default function DataSourceBadge({ source }) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  
  if (!source) return null;
  
  const getColorScheme = (source) => {
    if (source.toLowerCase().includes('coingecko')) return 'green';
    if (source.toLowerCase().includes('defillama')) return 'purple';
    if (source.toLowerCase().includes('subgraph')) return 'orange';
    if (source.toLowerCase().includes('api')) return 'blue';
    if (source.toLowerCase().includes('calc')) return 'gray';
    if (source.toLowerCase().includes('verify')) return 'red';
    return 'gray';
  };

  return (
    <>
      {/* Desktop: Show tooltip on hover */}
      <Tooltip label={`Data Source: ${source}`} hasArrow placement="top" display={{ base: "none", md: "block" }}>
        <Badge 
          colorScheme={getColorScheme(source)} 
          size="xs" 
          fontSize="8px"
          px={1}
          py={0.5}
          ml={1}
          cursor="help"
          display={{ base: "none", md: "flex" }}
          alignItems="center"
        >
          <InfoIcon boxSize={2} />
        </Badge>
      </Tooltip>
      
      {/* Mobile: Show clickable badge that opens modal */}
      <Badge 
        colorScheme={getColorScheme(source)} 
        size="xs" 
        fontSize="8px"
        px={1}
        py={0.5}
        ml={1}
        cursor="pointer"
        display={{ base: "flex", md: "none" }}
        alignItems="center"
        onClick={onOpen}
      >
        <InfoIcon boxSize={2} />
      </Badge>
      
      {/* Modal for mobile */}
      <Modal isOpen={isOpen} onClose={onClose} size="sm">
        <ModalOverlay />
        <ModalContent mx={{ base: 4, sm: 6 }}>
          <ModalHeader fontSize="lg">Data Source</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>{source}</Text>
          </ModalBody>
          <ModalFooter>
            <Button onClick={onClose} size="sm">Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
} 