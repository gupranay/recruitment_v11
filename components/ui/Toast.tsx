import React from "react";
import { toast as originalToast, Toaster } from "react-hot-toast";
import clsx from "clsx";

export const Toast = ({ message, type }: { message: string, type: "success" | "error" | "info" }) => {
  return (
    <div className={clsx(
      "flex items-center justify-center p-4 border rounded shadow-md",
      {
        "bg-green-100 border-green-500 text-green-700": type === "success",
        "bg-red-100 border-red-500 text-red-700": type === "error",
        "bg-blue-100 border-blue-500 text-blue-700": type === "info",
      }
    )}>
      <p>{message}</p>
    </div>
  );
};

export const toast = (message: string, type: "success" | "error" | "info" = "info") => {
  originalToast.custom(<Toast message={message} type={type} />);
};

export const ToastProvider = () => <Toaster position="top-right" />;
