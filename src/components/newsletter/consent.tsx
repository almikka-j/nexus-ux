import { Box } from '@mui/material';

import { DiscListing, CircleListing } from '../custom-listing';

export function Consent() {
  return (
    <Box sx={{ textAlign: 'justify' }}>
      <p>
        I, the undersigned, hereby give my explicit consent to{' '}
        <strong>Prime Global Finance Corporation</strong> (the &quot;Company&quot;) to send me
        regular newsletters, product updates, promotional materials, and other relevant information
        regarding the Company&apos;s financial products, services, and offerings.
      </p>
      <p>
        I understand that these communications may be sent to me through various channels, including
        but not limited to:
      </p>
      <DiscListing>
        <li>Email</li>
        <li>SMS (Short Message Service)</li>
        <li>Other digital communication platforms</li>
      </DiscListing>
      <p>Purpose of Data Processing:</p>
      <p>
        I acknowledge that my personal contact information (e.g., name, email address, mobile
        number) will be collected and processed by Prime Global Finance Corporation solely for the
        purpose of sending the aforementioned marketing and informational communications.
      </p>

      <p>Data Privacy and Confidentiality:</p>
      <p>
        I understand that Prime Global Finance Corporation is committed to protecting my privacy and
        handling my personal data in accordance with the Philippine Data Privacy Act of 2012
        (Republic Act No. 10173) and its implementing rules and regulations. My information will be
        kept confidential and will not be shared with unauthorized third parties.
      </p>

      <p>Right to Withdraw Consent:</p>
      <p>
        I understand that I have the right to withdraw this consent at any time, by informing Prime
        Global Finance Corporation. Upon withdrawal of consent, the Company will cease sending me
        marketing communications.
      </p>

      <p>To withdraw consent or to update my contact preferences, I may:</p>
      <DiscListing>
        <li>Click the &quot;unsubscribe&quot; link provided in the newsletters or emails.</li>
        <li>Reply &quot;STOP&quot; to SMS messages (where applicable).</li>
        <li>
          <p>Contact Prime Global Finance Corporation directly through the following channels:</p>
          <CircleListing>
            <li>
              <strong>Email:</strong> [Insert Company&apos;s Official Email Address for Data
              Privacy/Marketing]
            </li>
            <li>
              <strong>Phone:</strong> [Insert Company&apos;s Official Phone Number]
            </li>
            <li>
              <strong>Address:</strong> [Insert Company&apos;s Official Business Address]
            </li>
          </CircleListing>
        </li>
      </DiscListing>

      <p>
        By clicking/tapping agree, I confirm that I have read, understood, and agree to the terms of
        this consent.
      </p>
      <p>
        <strong>Name:</strong>
      </p>
      <p>
        <strong>Email Address:</strong>
      </p>
      <p>
        <strong>Mobile Number:</strong>
      </p>
    </Box>
  );
}
