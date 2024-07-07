// components/ApplicantTile.tsx

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Applicant } from '@/contexts/ApplicantsContext'; // Assuming the Applicant type is in this file
import { Label } from '@radix-ui/react-label';

interface ApplicantTileProps {
  applicant: Applicant;
}

const ApplicantTile: React.FC<ApplicantTileProps> = ({ applicant }) => {
  const [isOpen, setIsOpen] = useState(false);

  const isValidUrl = (string: string) => {
    try {
      new URL(string);
      return true;
    } catch (e) {
      return false;
    }
  };

  return (
    <div>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <div
            onClick={() => setIsOpen(true)}
            className="flex flex-col items-center bg-white rounded-lg shadow-md overflow-hidden transform transition duration-300 hover:scale-105 cursor-pointer"
          >
            <img
              src={applicant.headshot_url || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png'}
              alt={`Headshot of ${applicant.name}`}
              onError={(e) => (e.currentTarget.src = 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png')}
              className="w-full h-56 object-cover"
            />
            <div className="p-4">
              <h5 className="text-md font-semibold tracking-tight text-gray-900">{applicant.name}</h5>
            </div>
          </div>
        </DialogTrigger>
        <DialogContent className="max-w-4xl max-h-screen overflow-y-auto p-8">
          <div className="flex justify-center mb-4">
            <img
              src={applicant.headshot_url || 'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png'}
              alt={`Headshot of ${applicant.name}`}
              className="w-48 h-48 rounded-full object-cover"
            />
          </div>
          <div className="p-4">
            <h2 className="text-2xl text-gray-600 font-semibold mb-2 text-center">
              {applicant.name}
            </h2>
            <div className="mb-4">
              <div className="grid grid-cols-1 gap-4">
                {Object.entries(applicant.data || {}).map(([key, value]) => (
                  <div key={key}>
                    <Label>{key}</Label>
                    <p>
                    {isValidUrl(value as string) ? (
                      <a
                        href={value as string}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline"
                      >
                        Click here to see {key}
                      </a>
                    ) : (
                      <p className="text-gray-600">{value as string}</p>
                    )}
                    </p>
                    
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ApplicantTile;
