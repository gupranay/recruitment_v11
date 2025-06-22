import { useEffect, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

export function MultiSelect({
  options,
  selectedOptions,
  onChange,
  placeholder = "Select...",
}: {
  options: string[];
  selectedOptions: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOption = (option: string) => {
    if (selectedOptions.includes(option)) {
      onChange(selectedOptions.filter((o) => o !== option));
    } else {
      onChange([...selectedOptions, option]);
    }
  };

  return (
    <div className="relative w-full">
      {/* Dropdown Trigger */}
      <button
        className="w-full p-2 border rounded bg-white text-left flex justify-between items-center"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>
          {selectedOptions.length > 0
            ? selectedOptions.join(", ")
            : placeholder}
        </span>
        <ChevronDown className="w-4 h-4" />
      </button>

      {/* Dropdown Options */}
      {isOpen && (
        <div className="absolute z-10 w-full bg-white border rounded shadow-md mt-1 max-h-48 overflow-y-auto">
          {options.map((option) => (
            <div
              key={option}
              className="flex items-center p-2 cursor-pointer hover:bg-gray-100"
              onClick={() => toggleOption(option)}
            >
              <span
                className={`flex-shrink-0 w-5 h-5 border rounded-full ${
                  selectedOptions.includes(option) ? "bg-blue-500" : "bg-white"
                } flex items-center justify-center mr-2`}
              >
                {selectedOptions.includes(option) && (
                  <Check className="w-4 h-4 text-white" />
                )}
              </span>
              <span>{option}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
