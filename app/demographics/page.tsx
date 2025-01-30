"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/router";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ChartContainer,
  ChartLegend,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface BreakdownData {
  status: string;
  field_value: string;
  count: number;
  percentage: number;
}

export default function DemographicsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DemographicsContent />
    </Suspense>
  );
}

function DemographicsContent() {
  const searchParams = useSearchParams();
  const recruitment_round_id = searchParams?.get("id");

  const [columns, setColumns] = useState<string[]>([]);
  const [selectedColumn, setSelectedColumn] = useState<string | null>(null);
  const [data, setData] = useState<BreakdownData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch available demographic columns
  useEffect(() => {
    if (!recruitment_round_id) return;

    const fetchColumns = async () => {
      try {
        const response = await fetch("/api/demographics/get-cols", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recruitment_round_id }),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch columns");
        }

        const colData: string[] = await response.json();
        setColumns(colData);
      } catch (error) {
        console.error("Error fetching columns:", error);
      }
    };

    fetchColumns();
  }, [recruitment_round_id]);

  // Fetch demographic breakdown when a column is selected
  useEffect(() => {
    const fetchDemographics = async () => {
      if (!recruitment_round_id || !selectedColumn) return;

      setIsLoading(true);
      try {
        const response = await fetch("/api/demographics/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recruitment_round_id, field: selectedColumn }),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch demographics data");
        }

        const breakdownData: BreakdownData[] = await response.json();
        setData(breakdownData);
      } catch (error) {
        console.error("Error fetching demographic data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDemographics();
  }, [recruitment_round_id, selectedColumn]); // Trigger when selectedColumn changes

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Demographics Overview</h1>
      <Separator className="my-4" />

      {/* Dropdown for Selecting Demographic Field */}
      <Select onValueChange={(value) => setSelectedColumn(value)}>
        <SelectTrigger className="w-[300px]">
          <SelectValue placeholder="Select a demographic field" />
        </SelectTrigger>
        <SelectContent>
          {columns.map((col) => (
            <SelectItem key={col} value={col}>
              {col}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isLoading ? (
        <div className="flex justify-center items-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
        </div>
      ) : (
        selectedColumn &&
        data.length > 0 && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>
                  Breakdown for &quot;{selectedColumn}&quot;
                </CardTitle>
              </CardHeader>
              <CardContent>
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border p-2">Status</th>
                      <th className="border p-2">Field Value</th>
                      <th className="border p-2">Count</th>
                      <th className="border p-2">Percentage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((row, index) => (
                      <tr key={index} className="text-center">
                        <td className="border p-2">{row.status}</td>
                        <td className="border p-2">{row.field_value}</td>
                        <td className="border p-2">{row.count}</td>
                        <td className="border p-2">
                          {Math.floor(row.percentage * 100) / 100}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* Chart Component using shadcn */}
            <Card>
              <CardHeader>
                <CardTitle>Visualization</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    accepted: { color: "#10B981" }, // Green
                    rejected: { color: "#EF4444" }, // Red
                    in_progress: { color: "#F59E0B" }, // Yellow
                  }}
                  className="w-full"
                >
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={data}>
                      <XAxis dataKey="field_value" />
                      <YAxis />
                      <Tooltip content={<ChartTooltipContent />} />
                      <ChartLegend />
                      <Bar
                        dataKey="count"
                        name="Applicants"
                        fill="var(--color-accepted)"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        )
      )}
    </div>
  );
}
