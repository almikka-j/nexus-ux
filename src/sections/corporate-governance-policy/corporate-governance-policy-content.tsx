import { Box, Container } from '@mui/material';

import { CGPList } from './cgp-list';

// ----------------------------------------------------------------------

export function CorporateGovernancePolicyContent() {
  return (
    <Container>
      <Box sx={{ textAlign: 'justify', pt: { xs: 3, md: 5 }, pb: 10 }}>
        <p>
         At Prime Global Finance Corporation (“PGFC”), we are committed to transparency, accountability, and compliance with legal and 
         regulatory standards. Our corporate governance are designed to provide our stakeholders with access 
         to essential information about our company’s structure, operations, and commitments.
        </p>
        
        <p>
         <strong>Documents:</strong>
        </p>
        <CGPList />
        
      </Box>
    </Container >
  );
}
