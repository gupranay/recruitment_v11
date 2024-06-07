"use client";
import React from "react";
import Link from "next/link";
import { useOrganization } from "@/contexts/OrganizationContext";
import { toast } from "@/components/ui/Toast";
import { Button } from "@/components/ui/button";
import CreateRecruitmentCycleDialog from "@/components/CreateRecruitmentCycleDialog";
import { RecruitmentCycle } from "@/lib/types/RecruitmentCycle";
import { Separator } from "@/components/ui/separator";

export default function Sidebar() {
  const { selectedOrganization, setSelectedOrganization } = useOrganization();
  const [recruitmentCycles, setRecruitmentCycles] = React.useState([]);

  React.useEffect(() => {
    if (selectedOrganization) {
      const fetchRecruitmentCycles = async () => {
        const response = await fetch("/api/recruitment_cycles", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ organization_id: selectedOrganization.id }),
        });

        if (response.ok) {
          const data = await response.json();
          setRecruitmentCycles(data);
        } else {
          toast("Failed to fetch recruitment cycles", "error");
        }
      };

      fetchRecruitmentCycles();
    }
  }, [selectedOrganization]);

  //refresh page if recruitmenCycles updates
  

  return (
    <div className="relative flex">
      <div className="w-64 h-screen flex flex-col">
        <div className="p-4">
          <CreateRecruitmentCycleDialog />
        </div>
        {selectedOrganization && (
          <div className="p-4 border-t border-gray-700">
            <h3 className="text-lg font-semibold">Recruitment Cycles</h3>
            <ul className="mt-4">
              {recruitmentCycles.map((cycle: RecruitmentCycle) => (
                <li key={cycle.id} className="p-2">
                  {cycle.name}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <Separator orientation="vertical" className="h-full border-l border-gray-300" />
    </div>
  );
}
