import { Box, Container } from '@mui/material';

import { Image } from 'src/components/image';

export function NewsDetailsContent() {
  return (
    <Container>
      <Image
        alt="Hortaleza"
        src="/images/news/hortaleza.jpg"
        ratio="1/1"
        width={1}
        borderRadius="8px"
        sx={{ width: 1, height: { xs: 300, md: 400, lg: 500 } }}
        mt={5}
      />
      <Box sx={{ pt: { xs: 3, md: 5 }, pb: 10 }}>
        <p>
          In a move aimed at bolstering accessibility to housing loans, the Philippine Guarantee
          Corporation (PGC) has forged a strategic partnership with the Philippine Government
          Financial Center (PGFC). This collaboration marks a significant milestone in the
          country&apos;s efforts to provide affordable housing solutions to its citizens.
        </p>
        <p>
          Under this partnership, PGFC, known for its expertise in financial services, will work
          closely with PGC to streamline the process of acquiring housing loans for Filipinos. The
          collaboration aims to address the longstanding challenge of accessibility to housing
          financing, particularly for low and middle-income families.
        </p>
        <p>
          Through this initiative, PGFC and PGC are set to introduce innovative loan products
          tailored to the diverse needs of aspiring homeowners. These products will offer flexible
          terms and competitive interest rates, ensuring that more Filipinos can fulfill their dream
          of owning a home.
        </p>
        <p>
          One of the key highlights of this partnership is the incorporation of risk mitigation
          mechanisms, facilitated by PGC&apos;s expertise in providing credit guarantees. By
          mitigating the risks associated with housing loans, PGC aims to instill confidence among
          lenders and borrowers alike, thereby catalyzing greater participation in the housing
          finance market.
        </p>
        <p>
          Furthermore, PGFC and PGC are committed to enhancing financial literacy among potential
          borrowers, empowering them with the knowledge and tools necessary to make informed
          decisions regarding homeownership. Through financial education programs and outreach
          initiatives, the partners seek to equip Filipinos with the skills needed to manage their
          finances responsibly and sustainably.
        </p>
        <p>
          Commenting on the collaboration, Mr. Juan Dela Cruz, CEO of PGFC, expressed optimism about
          the impact of the partnership on the housing sector. He stated, &quot;Our collaboration
          with PGC represents a significant step forward in our mission to make homeownership a
          reality for more Filipinos. By combining our strengths and resources, we are confident
          that we can overcome the barriers to accessibility and create meaningful opportunities for
          aspiring homeowners.&quot;
        </p>
        <p>
          Likewise, Ms. Maria Santos, President of PGC, emphasized the organization&apos;s
          commitment to promoting inclusive growth through accessible housing finance. She remarked,
          &quot;At PGC, we believe that everyone deserves a place to call home. Through our
          partnership with PGFC, we are dedicated to breaking down the barriers to homeownership and
          empowering Filipinos to build a better future for themselves and their families.&quot;
        </p>
        <p>
          In conclusion, the collaboration between PGFC and PGC heralds a new era of accessibility
          and affordability in the Philippine housing finance market. By leveraging their respective
          expertise and resources, the partners are poised to make significant strides in expanding
          access to housing loans and driving sustainable homeownership across the country.
        </p>
      </Box>
    </Container>
  );
}
