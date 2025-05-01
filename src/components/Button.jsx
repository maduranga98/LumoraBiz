// src/components/Button.jsx
import React from "react";

const Button = ({
  children,
  onClick,
  type = "button",
  className = "",
  disabled = false,
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`bg-primary text-white font-medium py-2 px-4 rounded-xl transition-all
        ${disabled ? "opacity-70 cursor-not-allowed" : "hover:opacity-90"} 
        ${className}`}
    >
      {children}
    </button>
  );
};

export default Button;
