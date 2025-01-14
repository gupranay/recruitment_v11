import { saveAs } from "file-saver"; 

export const exportToCSV = (applicants: { name: string; email: string; status: string; }[], round_name: string | undefined) => {
  const csvContent = [
    ["Name", "Email", "Status"], // Header row
    ...applicants.map((applicant) => [applicant.name, applicant.email, applicant.status]),
  ]
    .map((row) => row.join(","))
    .join("\n");
  
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  saveAs(blob, `${round_name} applicants_decisions.csv`);

};
