import React from 'react';

import {
  Box,
  SvgIcon,
  Accordion,
  Typography,
  AccordionDetails,
  AccordionSummary,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';

import { personalLoanDetails } from 'src/data/personal-loan';
import { Iconify } from 'src/components/iconify';

import { NumberedListing, LowerAlphaListing } from 'src/components/custom-listing';

// ----------------------------------------------------------------------

function CustomNoResultIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="34" height="30" fill="none">
      <path
        fill="#919295"
        d="M24.83 18.333h-1.316l-.467-.45a10.783 10.783 0 0 0 2.616-7.05A10.833 10.833 0 0 0 14.83 0C9.13 0 4.464 4.4 4.047 10h3.367c.416-3.75 3.55-6.667 7.416-6.667 4.15 0 7.5 3.35 7.5 7.5s-3.35 7.5-7.5 7.5c-.283 0-.55-.05-.833-.083v3.367c.283.033.55.05.833.05 2.684 0 5.15-.984 7.05-2.617l.45.467v1.316l8.334 8.317 2.483-2.483-8.317-8.334Z"
      />
      <path
        fill="#919295"
        d="m9.784 13.035-4.117 4.117-4.116-4.117L.367 14.22l4.117 4.116-4.117 4.117 1.184 1.183 4.116-4.117 4.117 4.117 1.183-1.183-4.116-4.117 4.116-4.117-1.183-1.183Z"
      />
    </svg>
  );
}
export function FAQList3() {
  // Assume businessloanRequiredDocuments and renderItem are passed as props or imported
  // Helper function to render each item in the required documents list
  function renderItem(item: any, index: number) {
    return (
     <ListItem key={index} sx={{ px: 0, padding:0 }}>
      <ListItemIcon>
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none">
          <rect width="18" height="18" fill="#D1D1D1" rx="9" />
          <path
            stroke="#fff"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="m5.625 9 2.25 2.25 4.5-4.5"
          />
        </svg>
      </ListItemIcon>
      <ListItemText primary={item} primaryTypographyProps={{ sx: { color: '#667085' } }} />
    </ListItem>
    );
  }

  const LIST: any = [
    {
      id: '1-a',
      heading: 'What documents are needed if the loan has collateral?',
      detail: (
        <>
<Typography sx={{ pb: 1, color: '#6B6C70' }}>
  These are the extra documents you&apos;ll need if your loan has collateral.
  <br />
</Typography>
          <Box component="ul" sx={{ listStyleType: 'disc', pl: 3 }}>
            {personalLoanDetails?.clubshareCollateralDocuments?.map((item: any, index: number) =>
              renderItem(item, index)
            )}
          </Box>
        </>
      ),
    },
  ];
  

  const renderNoResultFound = (
    <Box sx={{ color: '#919295', textAlign: 'center', py: 10 }}>
      <SvgIcon component={CustomNoResultIcon} />
      <Typography fontSize={18} fontWeight={600} color="inherit">
        No result found
      </Typography>
      <Typography variant="body2" color="inherit">
        We couldn&apos;t find anything matching your search.
      </Typography>
    </Box>
  );

  return (
    <div>
      {LIST.length === 0
        ? renderNoResultFound
        : LIST.map((accordion: any) => (
            <React.Fragment key={accordion.id}>
              {accordion.isCategory ? (
                <Box
                  fontSize={{ xs: 18, md: 20 }}
                  fontWeight={600}
                  color="#12355B"
                  sx={{ mb: 2 }}
                >
                  {accordion.heading}
                </Box>
              ) : (
                <Accordion
                  sx={{
                    border: '1px solid #F1F1F2',
                    p: { xs: 2, md: 3 },
                    borderRadius: '8px',
                    '&::before': { display: 'none' },
                    mb: 3,
                  }}
                >
                  <AccordionSummary
                    expandIcon={<Iconify icon="eva:arrow-ios-downward-fill" />}
                    sx={{
                      p: 0,
                      mx: 0,
                      '& .MuiAccordionSummary-contentGutters': {
                        margin: 0,
                      },
                      '&.MuiAccordionSummary-gutters': {
                        minHeight: 'unset',
                      },
                    }}
                  >
                    <Typography fontSize={{ xs: 16, md: 18 }} fontWeight={500} color="#12355B">
                      {accordion.heading}
                    </Typography>
                  </AccordionSummary>

                  <AccordionDetails sx={{ fontSize: { xs: 14, md: 16 }, px: 0 }}>
                    {accordion.detail}
                  </AccordionDetails>
                </Accordion>
              )}
            </React.Fragment>
          ))}
    </div>
  );

};


export function FAQList2() {
  // Assume businessloanRequiredDocuments and renderItem are passed as props or imported
  // Helper function to render each item in the required documents list
  function renderItem(item: any, index: number) {
    return (
     <ListItem key={index} sx={{ px: 0, padding:0 }}>
      <ListItemIcon>
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none">
          <rect width="18" height="18" fill="#D1D1D1" rx="9" />
          <path
            stroke="#fff"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="m5.625 9 2.25 2.25 4.5-4.5"
          />
        </svg>
      </ListItemIcon>
      <ListItemText primary={item} primaryTypographyProps={{ sx: { color: '#667085' } }} />
    </ListItem>
    );
  }

  const LIST: any = [
    {
      id: '1-a',
      heading: 'What documents are needed if the loan has collateral?',
      detail: (
        <>
<Typography sx={{ pb: 1, color: '#6B6C70' }}>
  These are the extra documents you&apos;ll need if your loan has collateral.
  <br />
</Typography>
          <Box component="ul" sx={{ listStyleType: 'disc', pl: 3 }}>
            {personalLoanDetails?.clubshareCollateralDocuments?.map((item: any, index: number) =>
              renderItem(item, index)
            )}
          </Box>
        </>
      ),
    },
  ];
  

  const renderNoResultFound = (
    <Box sx={{ color: '#919295', textAlign: 'center', py: 10 }}>
      <SvgIcon component={CustomNoResultIcon} />
      <Typography fontSize={18} fontWeight={600} color="inherit">
        No result found
      </Typography>
      <Typography variant="body2" color="inherit">
        We couldn&apos;t find anything matching your search.
      </Typography>
    </Box>
  );

  return (
    <div>
      {LIST.length === 0
        ? renderNoResultFound
        : LIST.map((accordion: any) => (
            <React.Fragment key={accordion.id}>
              {accordion.isCategory ? (
                <Box
                  fontSize={{ xs: 18, md: 20 }}
                  fontWeight={600}
                  color="#12355B"
                  sx={{ mb: 2 }}
                >
                  {accordion.heading}
                </Box>
              ) : (
                <Accordion
                  sx={{
                    border: '1px solid #F1F1F2',
                    p: { xs: 2, md: 3 },
                    borderRadius: '8px',
                    '&::before': { display: 'none' },
                    mb: 3,
                  }}
                >
                  <AccordionSummary
                    expandIcon={<Iconify icon="eva:arrow-ios-downward-fill" />}
                    sx={{
                      p: 0,
                      mx: 0,
                      '& .MuiAccordionSummary-contentGutters': {
                        margin: 0,
                      },
                      '&.MuiAccordionSummary-gutters': {
                        minHeight: 'unset',
                      },
                    }}
                  >
                    <Typography fontSize={{ xs: 16, md: 18 }} fontWeight={500} color="#12355B">
                      {accordion.heading}
                    </Typography>
                  </AccordionSummary>

                  <AccordionDetails sx={{ fontSize: { xs: 14, md: 16 }, px: 0 }}>
                    {accordion.detail}
                  </AccordionDetails>
                </Accordion>
              )}
            </React.Fragment>
          ))}
    </div>
  );

};
export function FAQList() {
  const LIST: any = [
    {
      id: '1',
      heading: 'General Information',
      isCategory: true,
    },
    {
      id: '1-a',
      heading: 'What services does PG Finance offer?',
      detail:
        'PG Finance provides secured loan products tailored to meet your needs. Our loan offerings include Business Loans, Personal Loans, Housing Loans, and Fast Loans—all requiring commercial or real estate collateral. For our other service, we also sell company assets such as real estate properties.',
    },
    {
      id: '1-b',
      heading: 'Where is PG Finance located?',
      detail:
        'Our main office is located in 8F, The Currency Tower, F. Ortigas Jr. Road corner Julia Vargas Avenue, Ortigas Center, Pasig City 1605 and Room 202, The Rivergate Commercial Complex, Phase I, Gen. Maxilom Ave., Cebu City. And we accommodate loan application from foreign citizens based in the Philippines',
    },
    {
      id: '1-c',
      heading: 'What are your operating hours?',
      detail:
        'We are open Monday to Friday, from 8:00 AM to 5:00 PM. Online inquiries via our website and social media are welcome 24/7.',
    },
    {
      id: '2',
      heading: 'Collaterals',
      isCategory: true,
    },
    {
      id: '2-a',
      heading: 'What are the types of collateral PG Finance accept?',
      detail: (
        <>
          <Typography>We offer four types of secured loans:</Typography>
          <NumberedListing>
            <li>
              Real Estate
              <LowerAlphaListing>
                <li>Residential</li>
                <li>Commercial</li>
                <li>Agricultural (Beach front)</li>
              </LowerAlphaListing>
            </li>
          </NumberedListing>
        </>
      ),
    },
    {
      id: '3',
      heading: 'Types of Loans Offered',
      isCategory: true,
    },
    {
      id: '3-a',
      heading: 'What types of loans does PG Finance provide?',
      detail: (
        <>
          <Typography>We offer four types of secured loans:</Typography>
          <NumberedListing>
            <li>
              Business Loan
              <Typography>
                Ideal for entrepreneurs and SMEs needing funds for expansion, working capital, or
                asset purchases. Requires real estate, residential, or commercial property as
                collateral.
              </Typography>
            </li>
            <li>
              Personal Loan
              <Typography>
                For medical needs, tuition, travel, or major life expenses. Requires real estate,
                residential, or commercial property as collateral.
              </Typography>
            </li>
            <li>
              Housing Loan
              <Typography>
                For purchasing, constructing, or renovating residential property. Collateral is
                required, and can be the home itself or another property.
              </Typography>
            </li>
            <li>
              Fast Loan
              <Typography>
                For clients needing urgent funds. Faster processing, with collateral still required.
              </Typography>
            </li>
          </NumberedListing>
        </>
      ),
    },
    {
      id: '3-b',
      heading: 'What is your interest rate?',
      detail:
        'Interest rates can go as low as 1% per month, depending on loan type, borrower profile, and collateral value.',
    },
    {
      id: '4',
      heading: 'Loan Application',
      isCategory: true,
    },
    {
      id: '4-a',
      heading: 'Who is eligible to apply?',
      detail: (
        <>
          <Typography>You must be:</Typography>
          <NumberedListing>
            <li>A Filipino & foreign citizen aged 21 and up</li>
            <li>Able to offer real estate or commercial property as collateral</li>
            <li>Employed, self-employed, or running a business</li>
            <li>Capable of submitting complete documents</li>
          </NumberedListing>
        </>
      ),
    },
    {
      id: '4-b',
      heading: 'What documents are required?',
      detail: (
        <>
          <Typography>Common requirements include:</Typography>
          <NumberedListing>
            <li>Government-issued ID</li>
            <li>Business Documents (if the source of income is Business)</li>
            <li>Proof of income (payslips, ITR, financial statements)</li>
            <li>Most updated bank statements (from 6 months ago)</li>
            <li>Property Title (collateral)</li>
            <li>Tax Declaration and updated Real Property Tax Receipts</li>
            <li>Statement of Account (if applicable)</li>
          </NumberedListing>
        </>
      ),
    },
    {
      id: '4-c',
      heading: 'How long is the approval process?',
      detail: 'Typically 2 weeks after all documents are submitted and the collateral is verified.',
    },
    {
      id: '4-d',
      heading: 'How will I receive the loan funds?',
      detail: 'Funds can be disbursed thru cheques only.',
    },
    {
      id: '5',
      heading: 'Loan Repayment ',
      isCategory: true,
    },
    {
      id: '5-a',
      heading: 'What are your repayment terms?',
      detail: 'We offer flexible repayment plans from 12 to 60 months.',
    },
    {
      id: '5-b',
      heading: 'How can I pay my loan?',
      detail: 'Post-dated checks',
    },
    {
      id: '5-c',
      heading: 'What happens if I miss a payment?',
      detail:
        'Late payments may incur fees. Contact your account officer or advisor immediately if you anticipate a delay',
    },
    {
      id: '6',
      heading: 'Repeat Loans and Credibility',
      isCategory: true,
    },
    {
      id: '6-a',
      heading: 'Can I apply again after finishing a loan?',
      detail:
        'Yes. Repeat clients with a good record may qualify for faster processing and better loan terms.',
    },
    {
      id: '6-b',
      heading: 'Is PG Finance a legal and registered lender?',
      detail:
        'Yes. PG Finance is registered with the Securities and Exchange Commission (SEC) and complies with all financial regulations in the Philippines.',
    },
    {
      id: '7',
      heading: 'Our Team',
      isCategory: true,
    },
    {
      id: '7-a',
      heading: 'Who can assist me with my loan application?',
      detail: (
        <>
          <Typography>You can work with any of our trusted:</Typography>
          <NumberedListing>
            <li>Account Officers – for end-to-end loan handling and account servicing</li>
            <li>Agents – to help you start your application and gather requirements</li>
            <li>Advisors – to guide you through loan options and financial planning</li>
          </NumberedListing>
        </>
      ),
    },
    {
      id: '8',
      heading: 'Contact Us',
      isCategory: true,
    },
    {
      id: '8-a',
      heading: 'How do I reach PG Finance?',
      detail: (
        <NumberedListing>
          <li>Phone: 09985912134</li>
          <li>Email: support@pgfinance.com.ph</li>
          <li>Facebook: facebook.com/primeglobalfinance</li>
          <li>Website: pgfinance.com.ph</li>
          <li>Or visit our offices in Ortigas & Cebu</li>
        </NumberedListing>
      ),
    },
  ];

  const renderNoResultFound = (
    <Box sx={{ color: '#919295', textAlign: 'center', py: 10 }}>
      <SvgIcon component={CustomNoResultIcon} />
      <Typography fontSize={18} fontWeight={600} color="inherit">
        No result found
      </Typography>
      <Typography variant="body2" color="inherit">
        We couldn&apos;t find anything matching your search.
      </Typography>
    </Box>
  );

  return (
    <div>
      {LIST.length === 0
        ? renderNoResultFound
        : LIST.map((accordion: any) => (
            <React.Fragment key={accordion.id}>
              {accordion.isCategory ? (
                <Box
                  fontSize={{ xs: 18, md: 20 }}
                  fontWeight={600}
                  color="#12355B"
                  sx={{ mb: 2 }}
                >
                  {accordion.heading}
                </Box>
              ) : (
                <Accordion
                  sx={{
                    border: '1px solid #F1F1F2',
                    p: { xs: 2, md: 3 },
                    borderRadius: '8px',
                    '&::before': { display: 'none' },
                    mb: 3,
                  }}
                >
                  <AccordionSummary
                    expandIcon={<Iconify icon="eva:arrow-ios-downward-fill" />}
                    sx={{
                      p: 0,
                      mx: 0,
                      '& .MuiAccordionSummary-contentGutters': {
                        margin: 0,
                      },
                      '&.MuiAccordionSummary-gutters': {
                        minHeight: 'unset',
                      },
                    }}
                  >
                    <Typography fontSize={{ xs: 16, md: 18 }} fontWeight={500} color="#12355B">
                      {accordion.heading}
                    </Typography>
                  </AccordionSummary>

                  <AccordionDetails sx={{ fontSize: { xs: 14, md: 16 }, px: 0 }}>
                    {accordion.detail}
                  </AccordionDetails>
                </Accordion>
              )}
            </React.Fragment>
          ))}
    </div>
  );
}
