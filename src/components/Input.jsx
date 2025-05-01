// src/components/Input.jsx
import React from "react";

const Input = ({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  className = "",
}) => {
  return (
    <div className={`flex flex-col ${className}`}>
      {label && (
        <label htmlFor={label} className="text-muted font-medium mb-1">
          {label}
        </label>
      )}
      <input
        type={type}
        id={label}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="border-2 border-muted focus:ring-primary focus:border-primary p-2 rounded-lg outline-none"
      />
    </div>
  );
};

export default Input;
