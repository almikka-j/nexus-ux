'use client';

import {
  Box,
  Grid,
  Button,
  ListItem,
  Container,
  Typography,
  ListItemIcon,
  ListItemText,
} from '@mui/material';

import { personalLoanDetails } from 'src/data/personal-loan';

import { Iconify } from 'src/components/iconify';
import { LoanType } from 'src/components/loan-type';

import LoanCalculatorForm from 'src/sections/home/loan-calculator-form';

import { FAQList2 } from '../../faq/faq-list';

export function BusinessLoanView() {
  const renderDetailedSection = (title?: string, description?: string) => (
    <Box sx={{ color: '#6B6C70' }}>
      {title && (
        <Typography variant="h5" color="#0B1E59" mb={1}>
          {title}
        </Typography>
      )}
      {description && (
        <Typography variant="body1" lineHeight="inherit" color="#6B6C70">
          {description}
        </Typography>
      )}
    </Box>
  );

  const renderItem = (item: string, index: number) => (
    <ListItem key={index} sx={{ px: 0 }}>
      <ListItemIcon>
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none">
          <rect width="18" height="18" fill="#1C388C" rx="9" />
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
  return (
    <>
      <Box
        sx={{
          height: { md: 497, xl: 600 },
          backgroundImage: {
            xs: 'url("/images/background/blue.jpg")',
            md: 'url("/images/loan/business-loan-banner.png")',
          },
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          color: 'white',
          py: { xs: 5, md: 0 },
        }}
      >
        <Container sx={{ maxWidth: '1280px !important' }}>
          <Box textAlign={{ xs: 'center', md: 'left' }} pl={{ md: 10 }}>
            <LoanType primary="BUSINESS" secondary="LOAN" />
            <Typography variant="h2" sx={{ fontWeight: 'bold', lineHeight: 1, my: 1.5 }}>
              Power Your Next
              <br /> Business Move
            </Typography>
            <Typography variant="body1" sx={{ maxWidth: 460, mx: { xs: 'auto', md: 0 } }}>
              With collateral-backed funding, you can move forward with confidence and turn big
              ideas into bold action.
            </Typography>
            <Button
              component="a"
              href="https://account.pgfinance.com.ph/n_business_loan"
              target="_blank"
              rel="noopener noreferrer"
              variant="text"
              sx={{
                mt: 3,
                color: 'white',
                px: 0,
                transition: 'padding 0.2s',
                ':hover': { px: 1 },
              }}
              startIcon={<Iconify icon="mdi:arrow-right" />}
            >
              Start your business loan application
            </Button>
          </Box>
        </Container>
      </Box>
      <Container sx={{ maxWidth: '1280px !important' }}>
        <Grid container spacing={10} py={{ xs: 5, md: 10 }}>
          <Grid item xs={12} md={6} >
            <LoanCalculatorForm />
          </Grid>

          <Grid item xs={12} md={6}>
            {/* <Box mb={4}>
              {renderDetailedSection(
                'How to Apply for a Personal Loan',
                "We've simplified the process to make it quick and hassle-free."
              )}
              <Box component="ol" sx={{ pl: 3 }}>
                {personalLoanDetails?.applicationProcess.map((item, index) => (
                  <li key={index}>
                    <Typography variant="body1" lineHeight="inherit" color="#6B6C70">
                      {item}
                    </Typography>
                  </li>
                ))}
              </Box>
            </Box> */}

            <Box mb={4}>
              {renderDetailedSection(
                'List of Initial Requirements',
                'To ensure a smooth and quick approval process, please prepare the following:'
              )}
              <Box component="ul" sx={{ listStyleType: 'disc' }}>
                {personalLoanDetails?.businessloanRequiredDocuments.map((item, index) =>
                  renderItem(item, index)
                )}
              </Box>

              {/* <Typography sx={{ fontSize: 18, fontWeight: 600, color: '#344054', my: 1 }}>
                Personal Loan Checklist
              </Typography>

              <Box component="ul" sx={{ listStyleType: 'disc' }}>
                {personalLoanDetails?.documentChecklist.map((item, index) =>
                  renderItem(item, index)
                )}
              </Box> */}
            </Box>

            {/* <Box mb={4}>
              {renderDetailedSection(
                'Estimate Your Loan with Our Personal Loan Calculator',
                'Want to know how much your monthly payments will be? Use our easy-to-use Personal Loan Calculator to get an instant estimate of your repayment terms.:'
              )}
            </Box> */}

            <FAQList2 />
          </Grid>
        </Grid>
      </Container>
    </>
  );
}
