import React, { forwardRef, useEffect, useState } from "react";
import { Printer, Download, FileText, CheckCircle } from "lucide-react";

import logo from "../../assets/SRM.svg";

const PrintableBill = forwardRef(
  (
    { paymentData, businessInfo, stockDetails, onClose, showActions = true },
    ref
  ) => {
    const [currentDateTime, setCurrentDateTime] = useState(new Date());
    const [logoError, setLogoError] = useState(false);

    useEffect(() => {
      setCurrentDateTime(new Date());
    }, []);

    // Format currency
    const formatCurrency = (amount) => {
      return new Intl.NumberFormat("en-LK", {
        style: "currency",
        currency: "LKR",
        minimumFractionDigits: 2,
      })
        .format(amount)
        .replace("LKR", "Rs.");
    };

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

    // Generate bill number
    const generateBillNumber = () => {
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const time = String(date.getTime()).slice(-4);
      return `BILL-${year}${month}${day}-${time}`;
    };

    // Handle logo error
    const handleLogoError = () => {
      setLogoError(true);
    };

    // Print function
    const handlePrint = () => {
      const printWindow = window.open("", "_blank");
      const billContent = ref.current.innerHTML;

      // Convert logo to base64 for print
      const logoSrc = logoError ? null : logo;
      const logoBase64 = logoSrc
        ? `data:image/png;base64,${btoa(logoSrc)}`
        : null;

      printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payment Bill - ${generateBillNumber()}</title>
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
            .bill-container {
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
            .customer-billing-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 30px;
              gap: 40px;
            }
            .customer-details, .billing-details {
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
              width: 80px;
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
            }
            .items-table td {
              font-size: 14px;
            }
            .text-right {
              text-align: right;
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
            .cheque-details {
              font-size: 12px;
              color: #666;
              margin-top: 8px;
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
              .bill-container { 
                max-width: none; 
                margin: 0; 
                padding: 10px; 
              }
            }
          </style>
        </head>
        <body>
          ${billContent}
        </body>
      </html>
    `);

      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    };

    // Download as PDF (simplified version)
    const handleDownload = () => {
      handlePrint(); // For now, this opens print dialog
    };

    const billNumber = generateBillNumber();

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          {/* Action Header - Only shown when not printing */}
          {showActions && (
            <div className="no-print sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Payment Bill Generated
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Printer className="h-4 w-4" />
                  Print
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
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* Printable Bill Content */}
          <div ref={ref} className="bill-container p-6">
            {/* Header with Logo and Company Info */}
            <div className="header">
              <div className="logo-section">
                <div className="logo">
                  {/* Logo with proper fallback */}
                  {!logoError ? (
                    <img
                      src={businessInfo?.logo || logo}
                      alt="Company Logo"
                      className="w-20 h-20 object-contain rounded-full mr-5"
                      onError={handleLogoError}
                    />
                  ) : (
                    // Fallback logo
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mr-5">
                      <span className="text-green-600 font-bold text-2xl">
                        {businessInfo?.name
                          ? businessInfo.name.charAt(0)
                          : "SRM"}
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
                  📍{" "}
                  {businessInfo?.address || "Nedhalagamuwa, Wadu Munne Gedara"}
                </div>
              </div>
            </div>

            {/* Customer and Billing Details Row */}
            <div className="customer-billing-row">
              <div className="customer-details">
                <div className="section-title">Customer Details</div>
                <div className="detail-row">
                  <span className="detail-label">ID:</span>
                  <span className="detail-value">{paymentData.buyerId}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Name:</span>
                  <span className="detail-value">{paymentData.buyerName}</span>
                </div>
              </div>

              <div className="billing-details">
                <div className="section-title">Billing Details</div>
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
                <div className="detail-row">
                  <span className="detail-label">Bill No:</span>
                  <span className="detail-value">{billNumber}</span>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <table className="items-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th className="text-right">Quantity (kg)</th>
                  <th className="text-right">Price per kg</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Paddy Purchase</td>
                  <td className="text-right">
                    {stockDetails?.quantity ||
                      paymentData.stockDetails?.quantity ||
                      "N/A"}
                  </td>
                  <td className="text-right">
                    {formatCurrency(
                      stockDetails?.price ||
                        paymentData.stockDetails?.price ||
                        0
                    )}
                  </td>
                  <td className="text-right">
                    {formatCurrency(paymentData.totalAmount)}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Totals Section */}
            <div className="totals-section">
              <div className="total-row">
                <span className="total-label">Subtotal:</span>
                <span className="total-value">
                  {formatCurrency(paymentData.totalAmount)}
                </span>
              </div>
              <div className="total-row">
                <span className="total-label font-bold">Total Amount:</span>
                <span className="total-value font-bold text-lg">
                  {formatCurrency(paymentData.totalAmount)}
                </span>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="payment-section">
              <div className="section-title">Payment Methods</div>
              {paymentData.methods?.map((method, index) => (
                <div key={index} className="payment-method">
                  <div className="payment-header">
                    <span className="payment-type">
                      {method.type === "bank_transfer"
                        ? "Bank Transfer"
                        : method.type.charAt(0).toUpperCase() +
                          method.type.slice(1)}
                    </span>
                    <span className="payment-amount">
                      {formatCurrency(method.amount)}
                    </span>
                  </div>

                  {method.type === "cheque" && method.chequeDetails && (
                    <div className="cheque-details">
                      <div className="cheque-detail-row">
                        <strong>Cheque No:</strong>{" "}
                        {method.chequeDetails.number}
                      </div>
                      <div className="cheque-detail-row">
                        <strong>Bank:</strong> {method.chequeDetails.bank}
                      </div>
                      <div className="cheque-detail-row">
                        <strong>Branch:</strong> {method.chequeDetails.branch}
                      </div>
                      <div className="cheque-detail-row">
                        <strong>Date:</strong>{" "}
                        {formatDate(method.chequeDetails.date)}
                      </div>
                    </div>
                  )}
                </div>
              ))}
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
  }
);

PrintableBill.displayName = "PrintableBill";

export default PrintableBill;
