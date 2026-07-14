import { Box, Container } from '@mui/material';

import { DiscListing, CircleListing } from 'src/components/custom-listing';

// ----------------------------------------------------------------------

export function TermsContent() {
  return (
    <Container>
      <Box sx={{ textAlign: 'justify', pt: { xs: 3, md: 5 }, pb: 10 }}>
        <h3>Terms & Conditions</h3>
        <DiscListing>
          <li>
            The borrower hereby authorizes Prime Global Finance Corporation to verify, store, gather, and process personal information as may be required in relation to the grant of this credit accommodation.
          </li>

          <li>
            The borrower acknowledges the confidentiality of the information that will be obtained by Prime Global Finance Corporation pursuant to Republic Act No. 10173 as a result of the inquiry and agrees that any and all information shall remain the property of Prime Global Finance Corporation.

            <p><strong>The borrower hereby acknowledges and authorizes:</strong></p>

            <CircleListing>
              <li>
                The regular submission and disclosure of my basic credit data (as defined under Republic Act No. 9510 and its implementing Rules and Regulations) to the Credit Information Corporation (CIC), as well as any updates or corrections thereof;
              </li>
              <li>
                Sharing of my basic credit data with other lenders authorized by the CIC and credit reporting agencies duly credited by the CIC;
              </li>
              <li>
                sharing such information and data as may be required for audit, verification, and due diligence of creditors of Prime Global Finance Corporation, its independent auditors, and other legitimate parties with which Prime Global Finance Corporation deals in its regular course of business;
              </li>
              <li>
                sharing such information and data as may be required, summoned, or subpoenaed by the Anti-Money Laundering Council, judicial bodies, and other proper authorities of the government, having jurisdiction and authority as such.
              </li>
            </CircleListing>
          </li>
        </DiscListing>
      </Box>
    </Container>
  );
}
