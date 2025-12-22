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

// ================= SPECIAL TREATMENT BADGE COMPONENT =================

export default function SpecialTreatmentBadge({ explanation, protocolTicker }) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  
  if (!explanation) return null;
  
  return (
    <>
      {/* Desktop: Show tooltip on hover */}
      <Tooltip label={explanation} hasArrow placement="top" display={{ base: "none", md: "block" }}>
        <Badge 
          colorScheme="yellow" 
          size="xs" 
          fontSize="7px"
          px={1}
          py={0.5}
          ml={1}
          cursor="help"
          display={{ base: "none", md: "flex" }}
          alignItems="center"
        >
          <InfoIcon boxSize={1.5} />
        </Badge>
      </Tooltip>
      
      {/* Mobile: Show clickable badge that opens modal */}
      <Badge 
        colorScheme="yellow" 
        size="xs" 
        fontSize="7px"
        px={1}
        py={0.5}
        ml={1}
        cursor="pointer"
        display={{ base: "flex", md: "none" }}
        alignItems="center"
        onClick={onOpen}
      >
        <InfoIcon boxSize={1.5} />
      </Badge>
      
      {/* Modal for mobile */}
      <Modal isOpen={isOpen} onClose={onClose} size="sm">
        <ModalOverlay />
        <ModalContent mx={{ base: 4, sm: 6 }}>
          <ModalHeader fontSize="lg">Special Calculation - {protocolTicker}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>{explanation}</Text>
          </ModalBody>
          <ModalFooter>
            <Button onClick={onClose} size="sm">Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
} 