import { Iconify } from 'src/components/iconify';

// ----------------------------------------------------------------------

// Navigation data for the main site menu
// Each item can have a title, path, icon, and optional children for dropdowns/submenus
export const navData = [
  { title: 'Home', path: '/', icon: <Iconify width={22} icon="solar:home-2-bold-duotone" /> },
  {
    title: 'About Us',
    children: [
      { key: 'about-company', title: 'About the Company', path: '/about-us' },
      // { key: 'news-articles', title: 'News and Articles', path: '/news' },
      { key: 'contact-us', title: 'Contact Us', path: '/contact' },
      { key: 'faqs', title: 'FAQs', path: '/faq' },
    ],
  },
  {
    title: 'Loan Products',
    children: [
      { title: 'Personal Loan', path: '/personal-loan' },
     // { title: 'Fast Loan', path: '/fast-loan' },
      { title: 'Housing Loan', path: '/housing-loan' },
      { title: 'Business Loan', path: '/business-loan' },
      { title: 'Sangla Titulo', path: '/sangla-titulo' },
      { title: 'Clubshare Loan', path: '/clubshare-loan' },
    ],
  },
  { title: 'Property For Sale', path: '/property-forsale' },
  {
    title: 'Regulatory',
    children: [
      { title: 'Privacy Policy', path: '/privacy-policy' },
      // { title: 'Corporate Governance Policy', path: '/corporate-governance-policy' },
      { title: 'Internet Policy Statement', path: '/internet-policy' },
    ],
  },
];
