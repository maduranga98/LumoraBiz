import React from "react";
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from "lucide-react";

const Message = ({
  type = "info",
  title,
  message,
  onClose,
  className = "",
}) => {
  const types = {
    success: {
      icon: CheckCircle,
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      iconColor: "text-green-400",
      textColor: "text-green-800",
      titleColor: "text-green-900",
    },
    error: {
      icon: AlertCircle,
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
      iconColor: "text-red-400",
      textColor: "text-red-700",
      titleColor: "text-red-900",
    },
    warning: {
      icon: AlertTriangle,
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-200",
      iconColor: "text-yellow-400",
      textColor: "text-yellow-700",
      titleColor: "text-yellow-900",
    },
    info: {
      icon: Info,
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      iconColor: "text-blue-400",
      textColor: "text-blue-700",
      titleColor: "text-blue-900",
    },
  };

  const config = types[type];
  const Icon = config.icon;

  return (
    <div
      className={`rounded-lg border p-4 ${config.bgColor} ${config.borderColor} ${className}`}
    >
      <div className="flex">
        <div className="flex-shrink-0">
          <Icon className={`h-5 w-5 ${config.iconColor}`} />
        </div>
        <div className="ml-3 flex-1">
          {title && (
            <h3 className={`text-sm font-medium ${config.titleColor}`}>
              {title}
            </h3>
          )}
          {message && (
            <div
              className={`${title ? "mt-2" : ""} text-sm ${config.textColor}`}
            >
              {message}
            </div>
          )}
        </div>
        {onClose && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                type="button"
                onClick={onClose}
                className={`inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 ${config.textColor} hover:${config.bgColor}`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Message;
