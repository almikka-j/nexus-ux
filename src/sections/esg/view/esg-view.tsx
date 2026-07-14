'use client';

import { Box, Container, Typography } from '@mui/material';

import { ESGHero } from '../esg-hero';

// ----------------------------------------------------------------------

export function ESGView() {
  return (
    <>
      <ESGHero />

      <Container sx={{ maxWidth: '1280px !important' }}>
        <Box sx={{ py: 10 }}>
          <Typography
            sx={{
              fontSize: 45,
              fontWeight: 600,
              color: '#0B1E59',
              textAlign: 'center',
              mx: 'auto',
              mb: 5,
            }}
          >
            Our Environmental Initiatives
          </Typography>
          <Box component="img" src="/images/planting-trees.jpg" width={1} height={400} />
          <Box sx={{ color: '#6B6C70', maxWidth: 900, lineHeight: 2, mx: 'auto' }}>
            <Typography variant="body1" lineHeight="inherit">
              We understand the importance of protecting our planet for future generations.
              That&apos;s why we&apos;ve implemented a comprehensive environmental sustainability
              program aimed at reducing our carbon footprint and minimizing our impact on the
              environment. From energy-efficient office practices to eco-friendly business
              operations, we&apos;re continuously exploring innovative ways to lessen our
              environmental footprint.
            </Typography>
            <Box component="ul" sx={{ pl: 3, listStyleType: 'disc', mt: 3 }}>
              <li>
                <strong style={{ color: '#323234' }}>Energy Efficiency:</strong> We&apos;ve invested
                in energy-efficient technologies and practices to reduce our energy consumption and
                minimize greenhouse gas emissions. This includes upgrading to LED lighting,
                optimizing HVAC systems, and implementing energy-saving measures across our
                facilities.
              </li>
              <li>
                <strong style={{ color: '#323234' }}>Waste Reduction:</strong> We&apos;re committed
                to minimizing waste and promoting recycling and reuse initiatives throughout our
                organization. From reducing paper usage to implementing recycling programs for
                electronic waste, we&apos;re actively working to minimize our environmental
                footprint.
              </li>
              <li>
                <strong style={{ color: '#323234' }}>Sustainable Sourcing:</strong> We prioritize
                sustainable sourcing practices, partnering with suppliers who share our commitment
                to environmental responsibility. Whether it&apos;s sourcing eco-friendly office
                supplies or choosing sustainable packaging materials, we&apos;re dedicated to making
                environmentally conscious choices at every opportunity.
              </li>
            </Box>
          </Box>

          <Typography
            sx={{
              fontSize: 45,
              fontWeight: 600,
              color: '#0B1E59',
              textAlign: 'center',
              mx: 'auto',
              mb: 5,
            }}
          >
            Community Engagement and Social Impact
          </Typography>
          <Box component="img" src="/images/volunteers.jpg" width={1} height={400} />
          <Box sx={{ color: '#6B6C70', maxWidth: 900, lineHeight: 2, py: 10, mx: 'auto' }}>
            <Box>
              <Typography variant="body1" lineHeight="inherit">
                Sustainability isn&apos;t just about protecting the environment; it&apos;s also
                about supporting the communities in which we operate. Through our community
                engagement initiatives, we strive to make a positive impact on society and
                contribute to the well-being of those around us.
              </Typography>
              <Box component="ul" sx={{ pl: 3, listStyleType: 'disc', mt: 3 }}>
                <li>
                  <strong style={{ color: '#323234' }}>Community Outreach:</strong> We actively
                  engage with local communities through volunteer programs, charitable donations,
                  and community outreach initiatives. Whether it&apos;s organizing food drives,
                  participating in environmental clean-up efforts, or supporting local schools and
                  nonprofits, we&apos;re committed to giving back to the communities that support
                  us.
                </li>
                <li>
                  <strong style={{ color: '#323234' }}>Financial Inclusion:</strong> We believe that
                  financial empowerment is key to building sustainable communities. That&apos;s why
                  we&apos;re dedicated to providing accessible financial services to underserved
                  populations, including small business owners, entrepreneurs, and individuals in
                  rural and marginalized communities.
                </li>
              </Box>
            </Box>
          </Box>

          <Typography
            sx={{
              fontSize: 45,
              fontWeight: 600,
              color: '#0B1E59',
              textAlign: 'center',
              mx: 'auto',
              mb: 5,
            }}
          >
            ESG Integration and Corporate Governance
          </Typography>
          <Box component="img" src="/images/volunteer-group.jpg" width={1} height={400} />
          <Box sx={{ color: '#6B6C70', maxWidth: 900, lineHeight: 2, py: 10, mx: 'auto' }}>
            <Box>
              <Typography variant="body1" lineHeight="inherit">
                Environmental, Social, and Governance (ESG) considerations are integrated into every
                aspect of our business operations and decision-making processes. We believe that by
                prioritizing ESG factors, we can create long-term value for our stakeholders while
                also promoting sustainability and responsible business practices.
              </Typography>
              <Box component="ul" sx={{ pl: 3, listStyleType: 'disc', mt: 3 }}>
                <li>
                  <strong style={{ color: '#323234' }}>Ethical Business Practices:</strong> We
                  uphold the highest ethical standards in all our dealings, fostering transparency,
                  integrity, and accountability throughout our organization. Our commitment to
                  ethical business practices ensures that we operate with honesty, fairness, and
                  respect for all stakeholders.
                </li>
                <li>
                  <strong style={{ color: '#323234' }}>Board Diversity and Inclusion:</strong>
                  Diversity and inclusion are core principles of our corporate governance framework.
                  We recognize the importance of diverse perspectives and experiences in driving
                  innovation and decision-making, and we&apos;re committed to fostering a culture of
                  inclusion and belonging within our organization.
                </li>
              </Box>
            </Box>
          </Box>

          <Box sx={{ maxWidth: 900, mx: 'auto', py: 3 }}>
            <Typography variant="h5" fontWeight="bold" mb={2}>
              Continuous Improvement and Innovation
            </Typography>
            <Typography variant="body1">
              Our commitment to sustainability is an ongoing journey of continuous improvement and
              innovation. We&apos;re constantly evaluating our practices, setting ambitious
              sustainability goals, and implementing initiatives to drive positive change. From
              investing in renewable energy sources to adopting sustainable business practices,
              we&apos;re dedicated to pushing the boundaries of what&apos;s possible in pursuit of a
              more sustainable future.
            </Typography>
          </Box>
          <Box sx={{ maxWidth: 900, mx: 'auto', py: 3 }}>
            <Typography variant="h5" fontWeight="bold" mb={2}>
              Join Us in Our Sustainability Journey
            </Typography>
            <Typography variant="body1">
              We invite you to join us on our sustainability journey. Whether you&apos;re a
              customer, partner, employee, or member of the community, your support and engagement
              are crucial to our success. Together, we can make a meaningful difference - for the
              planet, for our communities, and for future generations.
            </Typography>
          </Box>
        </Box>
      </Container>
    </>
  );
}
