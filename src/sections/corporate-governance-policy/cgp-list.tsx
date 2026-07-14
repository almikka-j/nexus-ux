import {
  Box,
  Typography,
} from '@mui/material';

import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------


type Props = {
  title: string;
  href: string;
};

export function DocumentCard({ title, href }: Props) {
  return (
    <Box
      component="a"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        border: '1px solid #F1F1F2',
        borderRadius: '8px',
        p: { xs: 2, md: 3 },
        mb: 3,
        textDecoration: 'none',
        cursor: 'pointer',
        transition: '0.2s ease',
        '&:hover': {
          // borderColor: '#12355B',
          backgroundColor: '#F7F9FC',
        },
        '&:hover .hover-icon': {
          opacity: 1,
        },
      }}
    >
      {/* LEFT SIDE: ICON + TITLE */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Iconify icon="mdi:file-document-outline" width={24} color="#12355B" />

        <Typography
          fontSize={{ xs: 15, md: 17 }}
          fontWeight={500}
          color="#12355B"
        >
          {title}
        </Typography>
      </Box>

      {/* RIGHT SIDE: Appears ONLY on hover */}
      <Iconify
        icon="mdi:arrow-top-right"
        width={20}
        color="#12355B"
        className="hover-icon"
        sx={{
          opacity: 0,
          transition: 'opacity 0.5s ease',
        }}
      />
    </Box>
  );
}
export function CGPList() {
  const documents = [
    { title: 'Latest Annual Report', href: '#' },
    { title: 'Income Statement 2024', href: '#' },
    { title: 'Quarterly Financials Q1', href: '#' },
  ];

  return (
    <>
      {documents.map((doc, index) => (
        <DocumentCard
          key={index}
          title={doc.title}
          href={doc.href}
        />
      ))}
    </>
  );
}
