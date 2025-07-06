import React, { useState, useRef } from "react";
import { FileText, X, Printer, Download } from "lucide-react";
import logo from "../../assets/SRM.svg";

// Walk-in Sale Invoice Component
const WalkInInvoice = ({
  saleData,
  businessInfo,
  onClose,
  formatCurrency,
  formatNumber,
  isVisible,
}) => {
  const [currentDateTime] = useState(new Date());
  const [logoError, setLogoError] = useState(false);
  const invoiceRef = useRef();

  if (!isVisible || !saleData) return null;

  // Format date
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Format time
  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Generate invoice number
  const generateInvoiceNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const time = String(date.getTime()).slice(-4);
    return `WS-${year}${month}${day}-${time}`;
  };

  // Handle logo error
  const handleLogoError = () => {
    setLogoError(true);
  };

  // Print function
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    const invoiceContent = invoiceRef.current.innerHTML;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Walk-in Sale Invoice - ${generateInvoiceNumber()}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Arial', sans-serif;
              line-height: 1.4;
              color: #333;
              background: white;
            }
            .invoice-container {
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              border-bottom: 2px solid #f97316;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .logo-section {
              display: flex;
              align-items: center;
              flex: 1;
            }
            .logo img {
              width: 80px;
              height: 80px;
              object-fit: contain;
              border-radius: 50%;
              margin-right: 20px;
            }
            .logo-fallback {
              width: 80px;
              height: 80px;
              background-color: #f0fdf4;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 24px;
              font-weight: bold;
              color: #16a34a;
              margin-right: 20px;
            }
            .company-info h1 {
              font-size: 32px;
              font-weight: bold;
              color: #166534;
              margin-bottom: 5px;
            }
            .contact-info {
              text-align: right;
              font-size: 12px;
              color: #666;
              line-height: 1.6;
            }
            .customer-invoice-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 30px;
              gap: 40px;
            }
            .customer-details, .invoice-details {
              flex: 1;
            }
            .section-title {
              font-size: 16px;
              font-weight: bold;
              color: #374151;
              margin-bottom: 10px;
              border-bottom: 1px solid #e5e7eb;
              padding-bottom: 5px;
            }
            .detail-row {
              display: flex;
              margin-bottom: 5px;
            }
            .detail-label {
              font-weight: 500;
              color: #666;
              width: 100px;
              font-size: 14px;
            }
            .detail-value {
              color: #333;
              font-size: 14px;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            .items-table th,
            .items-table td {
              border: 1px solid #e5e7eb;
              padding: 12px;
              text-align: left;
            }
            .items-table th {
              background-color: #f3f4f6;
              font-weight: bold;
              font-size: 14px;
              color: #374151;
            }
            .items-table td {
              font-size: 14px;
            }
            .text-right {
              text-align: right;
            }
            .text-center {
              text-align: center;
            }
            .totals-section {
              margin: 20px 0;
              border: 1px solid #e5e7eb;
              background-color: #f9fafb;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 15px;
              border-bottom: 1px solid #e5e7eb;
            }
            .total-row:last-child {
              border-bottom: none;
              font-weight: bold;
              background-color: #eff6ff;
              font-size: 16px;
            }
            .total-label {
              font-size: 14px;
              color: #666;
            }
            .total-value {
              font-size: 14px;
              color: #333;
              font-weight: 500;
            }
            .payment-section {
              margin: 20px 0;
            }
            .payment-method {
              background: #f9fafb;
              border: 1px solid #e5e7eb;
              border-radius: 6px;
              padding: 15px;
              margin-bottom: 10px;
            }
            .payment-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 5px;
            }
            .payment-type {
              font-weight: bold;
              color: #374151;
              text-transform: capitalize;
            }
            .payment-amount {
              font-weight: bold;
              color: #059669;
              font-size: 16px;
            }
            .payment-status {
              font-size: 12px;
              padding: 4px 8px;
              border-radius: 4px;
              font-weight: 500;
            }
            .status-completed {
              background-color: #d1fae5;
              color: #065f46;
            }
            .status-pending {
              background-color: #fef3c7;
              color: #92400e;
            }
            .cheque-details {
              font-size: 12px;
              color: #666;
              margin-top: 8px;
              background: white;
              padding: 10px;
              border-radius: 6px;
              border: 1px solid #e5e7eb;
            }
            .cheque-detail-row {
              display: inline-block;
              margin-right: 20px;
              margin-bottom: 3px;
            }
            .signature-section {
              margin-top: 40px;
              display: flex;
              justify-content: space-between;
            }
            .signature-box {
              width: 45%;
              text-align: center;
            }
            .signature-line {
              border-top: 1px solid #333;
              margin-top: 50px;
              padding-top: 8px;
              font-size: 12px;
              color: #666;
            }
            .footer-line {
              border-top: 1px solid #333;
              margin-top: 40px;
              padding-top: 10px;
              text-align: center;
              font-size: 10px;
              color: #666;
            }
            @media print {
              body { margin: 0; }
              .no-print { display: none !important; }
              .invoice-container { 
                max-width: none; 
                margin: 0; 
                padding: 10px; 
              }
            }
          </style>
        </head>
        <body>
          ${invoiceContent}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  // Download function (opens print dialog for now)
  const handleDownload = () => {
    handlePrint();
  };

  const invoiceNumber = generateInvoiceNumber();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Action Header */}
        <div className="no-print sticky top-0 bg-white border-b p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Walk-in Sale Invoice
          </h2>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Printer className="h-4 w-4" />
              Print Invoice
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              Download
            </button>
            <button
              onClick={onClose}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <X className="h-4 w-4" />
              Close
            </button>
          </div>
        </div>

        {/* Printable Invoice Content */}
        <div ref={invoiceRef} className="invoice-container p-6">
          {/* Header with Logo and Company Info */}
          <div className="header">
            <div className="logo-section">
              <div className="logo">
                {!logoError ? (
                  <img
                    src={businessInfo?.logo || logo}
                    alt="Company Logo"
                    className="w-20 h-20 object-contain rounded-full mr-5"
                    onError={handleLogoError}
                  />
                ) : (
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mr-5">
                    <span className="text-green-600 font-bold text-2xl">
                      {businessInfo?.name ? businessInfo.name.charAt(0) : "SRM"}
                    </span>
                  </div>
                )}
              </div>
              <div className="company-info">
                <h1 className="text-3xl font-bold text-green-800">
                  {businessInfo?.name || "Sajith Rice Mill"}
                </h1>
              </div>
            </div>
            <div className="contact-info">
              <div className="mb-1">
                📞 {businessInfo?.phone || "077 9258293"}
              </div>
              <div className="mb-1">
                ✉️ {businessInfo?.email || "sajithricemill@gmail.com"}
              </div>
              <div className="mb-1">
                🌐 {businessInfo?.website || "www.sajithricemill.com"}
              </div>
              <div>
                📍 {businessInfo?.address || "Nedhalagamuwa, Wadu Munne Gedara"}
              </div>
            </div>
          </div>

          {/* Customer and Invoice Details Row */}
          <div className="customer-invoice-row">
            <div className="customer-details">
              <div className="section-title">Customer Details</div>
              <div className="detail-row">
                <span className="detail-label">Name:</span>
                <span className="detail-value">{saleData.customer.name}</span>
              </div>
              {saleData.customer.phone && (
                <div className="detail-row">
                  <span className="detail-label">Mobile:</span>
                  <span className="detail-value">
                    {saleData.customer.phone}
                  </span>
                </div>
              )}
              {saleData.customer.address && (
                <div className="detail-row">
                  <span className="detail-label">Address:</span>
                  <span className="detail-value">
                    {saleData.customer.address}
                  </span>
                </div>
              )}
            </div>

            <div className="invoice-details">
              <div className="section-title">Invoice Details</div>
              <div className="detail-row">
                <span className="detail-label">Bill No:</span>
                <span className="detail-value">{invoiceNumber}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Date:</span>
                <span className="detail-value">
                  {formatDate(currentDateTime)}
                </span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Time:</span>
                <span className="detail-value">
                  {formatTime(currentDateTime)}
                </span>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <table className="items-table">
            <thead>
              <tr>
                <th>Item Name</th>
                <th className="text-right">Quantity (kg)</th>
                <th className="text-right">Price</th>
              </tr>
            </thead>
            <tbody>
              {saleData.items.map((item, index) => (
                <tr key={index}>
                  <td>
                    <div className="font-medium">
                      {item.itemName || item.displayName}
                    </div>
                    {item.riceType && (
                      <div className="text-sm text-gray-600">
                        Type: {item.riceType}
                      </div>
                    )}
                  </td>
                  <td className="text-right">
                    {formatNumber(item.totalWeight)} kg
                  </td>
                  <td className="text-right">{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals Section */}
          <div className="totals-section">
            <div className="total-row">
              <span className="total-label font-bold">Total Amount:</span>
              <span className="total-value font-bold text-lg">
                {formatCurrency(saleData.totals.totalAmount)}
              </span>
            </div>
          </div>

          {/* Payment Information */}
          <div className="payment-section">
            <div className="section-title">Payment Method</div>
            <div className="payment-method">
              <div className="payment-header">
                <span className="payment-type">
                  {saleData.payment.type === "cash"
                    ? "Cash Payment"
                    : saleData.payment.type === "cheque"
                    ? "Cheque Payment"
                    : saleData.payment.type === "credit"
                    ? "Credit Sale"
                    : saleData.payment.type}
                </span>
                <span className="payment-amount">
                  {formatCurrency(saleData.payment.amount)}
                </span>
                <span
                  className={`payment-status ${
                    saleData.payment.status === "completed"
                      ? "status-completed"
                      : "status-pending"
                  }`}
                >
                  {saleData.payment.status}
                </span>
              </div>

              {saleData.payment.type === "cheque" &&
                saleData.payment.cheque && (
                  <div className="cheque-details">
                    <div className="cheque-detail-row">
                      <strong>Cheque No:</strong>{" "}
                      {saleData.payment.cheque.number}
                    </div>
                    <div className="cheque-detail-row">
                      <strong>Bank:</strong> {saleData.payment.cheque.bank}
                    </div>
                    {saleData.payment.cheque.branch && (
                      <div className="cheque-detail-row">
                        <strong>Branch:</strong>{" "}
                        {saleData.payment.cheque.branch}
                      </div>
                    )}
                    <div className="cheque-detail-row">
                      <strong>Date:</strong>{" "}
                      {formatDate(saleData.payment.cheque.date)}
                    </div>
                  </div>
                )}
            </div>
          </div>

          {/* Signature Section */}
          <div className="signature-section">
            <div className="signature-box">
              <div className="signature-line">Customer Signature & Seal</div>
            </div>
            <div className="signature-box">
              <div className="signature-line">Owner Signature & Seal</div>
            </div>
          </div>

          {/* Footer */}
          <div className="footer-line">
            Generated by LumoraBiz © Lumora Ventures | info@lumoraventures.com
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalkInInvoice;
