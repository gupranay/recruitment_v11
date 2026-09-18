import { saveAs } from "file-saver"; 

export const exportToCSV = (applicants: { name: string; email: string; status: string; grade: string; major: string }[], round_name: string | undefined) => {
  const csvContent = [
    ["Name", "Email", "Status", "Grade", "Major"],
    ...applicants.map((applicant) => [applicant.name, applicant.email, applicant.status, applicant.grade, applicant.major]),
  ]
    .map((row) => row.map((value) => `"${value.replace(/"/g, '""')}"`).join(","))
    .join("\n");
  
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  saveAs(blob, `${round_name} applicants_decisions.csv`);

};
