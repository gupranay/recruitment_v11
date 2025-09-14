import { useEffect, useState, useRef } from "react";
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
  const dropdownRef = useRef<HTMLDivElement>(null);

  const toggleOption = (option: string) => {
    if (selectedOptions.includes(option)) {
      onChange(selectedOptions.filter((o) => o !== option));
    } else {
      onChange([...selectedOptions, option]);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Dropdown Trigger */}
      <button
        className="w-full px-3 py-2 border border-input bg-background text-left flex justify-between items-center rounded-md text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-accent hover:text-accent-foreground"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="truncate">
          {selectedOptions.length > 0
            ? selectedOptions.join(", ")
            : placeholder}
        </span>
        <ChevronDown className="w-4 h-4 opacity-50" />
      </button>

      {/* Dropdown Options */}
      {isOpen && (
        <div className="absolute z-50 w-full bg-popover border border-border rounded-md shadow-md mt-1 max-h-48 overflow-y-auto">
          {options.map((option) => (
            <div
              key={option}
              className="flex items-center px-3 py-2 cursor-pointer hover:bg-accent hover:text-accent-foreground text-sm"
              onClick={() => toggleOption(option)}
            >
              <span
                className={`flex-shrink-0 w-4 h-4 border rounded-sm ${
                  selectedOptions.includes(option)
                    ? "bg-primary border-primary text-primary-foreground"
                    : "border-input"
                } flex items-center justify-center mr-2`}
              >
                {selectedOptions.includes(option) && (
                  <Check className="w-3 h-3" />
                )}
              </span>
              <span className="capitalize">{option.replace("_", " ")}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
