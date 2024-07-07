// components/ApplicantsGrid.tsx

import React from 'react';
import ApplicantTile from './ApplicantTile';
import { useApplicants } from '@/contexts/ApplicantsContext';
import { Applicant } from '@/contexts/ApplicantsContext'; // Assuming the Applicant type is in this file

const ApplicantsGrid: React.FC = () => {
  const { applicants } = useApplicants();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {applicants.map((applicant: Applicant) => (
        <ApplicantTile key={applicant.id} applicant={applicant} />
      ))}
    </div>
  );
};

export default ApplicantsGrid;
