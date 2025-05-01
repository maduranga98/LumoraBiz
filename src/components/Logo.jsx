// src/components/Logo.jsx
import React from "react";

const Logo = ({ className = "" }) => {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="text-primary text-4xl font-bold tracking-tight flex items-center">
        <span className="text-primary">Lumora</span>
        <span className="text-accent font-extrabold">Biz</span>
      </div>
      <p className="text-muted text-sm mt-1">
        Smart Tools for Smarter Business.
      </p>
    </div>
  );
};

export default Logo;
