// src/utils/formatters.js

// Format number safely
export const formatNumber = (value, decimals = 2) => {
  const num = Number(value || 0);
  return isNaN(num) ? "0.00" : num.toFixed(decimals);
};

// Format currency
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 2,
  })
    .format(amount)
    .replace("LKR", "Rs.");
};

// Format date for display
export const formatDate = (date) => {
  if (!date) return "—";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// Format product type for display
export const formatProductType = (type, riceType = null) => {
  if (type === "rice" && riceType) {
    return `Rice (${riceType})`;
  }

  const typeMap = {
    rice: "Rice (Hal)",
    hunuSahal: "Hunu Sahal",
    kadunuSahal: "Kadunu Sahal",
    ricePolish: "Rice Polish",
    dahaiyya: "Dahaiyya",
    flour: "Flour",
  };
  return typeMap[type] || type;
};

// Format time for display
export const formatTime = (date) => {
  if (!date) return "—";
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Format datetime for display
export const formatDateTime = (date) => {
  if (!date) return "—";
  return `${formatDate(date)} ${formatTime(date)}`;
};

// Format percentage
export const formatPercentage = (value, decimals = 1) => {
  const num = Number(value || 0);
  return isNaN(num) ? "0%" : `${num.toFixed(decimals)}%`;
};

// Format weight with appropriate units
export const formatWeight = (weightInKg) => {
  const weight = Number(weightInKg || 0);
  if (weight >= 1000) {
    return `${formatNumber(weight / 1000, 1)} tonnes`;
  }
  return `${formatNumber(weight)} kg`;
};

// Format duration in minutes to human readable
export const formatDuration = (minutes) => {
  const mins = Number(minutes || 0);
  if (mins < 60) {
    return `${mins} min`;
  }
  const hours = Math.floor(mins / 60);
  const remainingMins = mins % 60;
  if (remainingMins === 0) {
    return `${hours} hr`;
  }
  return `${hours}h ${remainingMins}m`;
};

// Format phone number
export const formatPhoneNumber = (phone) => {
  if (!phone) return "—";
  // Simple formatting for Sri Lankan numbers
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
  }
  return phone;
};

// Format file size
export const formatFileSize = (bytes) => {
  const sizes = ["Bytes", "KB", "MB", "GB"];
  if (bytes === 0) return "0 Bytes";
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${formatNumber(bytes / Math.pow(1024, i), 1)} ${sizes[i]}`;
};

// Format status with proper casing
export const formatStatus = (status) => {
  if (!status) return "—";
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
};
