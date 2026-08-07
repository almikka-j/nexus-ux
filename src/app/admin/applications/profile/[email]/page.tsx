import type { Metadata } from 'next';

import { ApplicantProfileView } from 'src/sections/admin/applicant-profile-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Applicant Profile | HHC LMS Admin',
};

export default function Page({ params }: { params: { email: string } }) {
  return <ApplicantProfileView email={decodeURIComponent(params.email)} />;
}
