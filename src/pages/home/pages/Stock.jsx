import React, { useState, useEffect } from "react";
import AddingPaddyStock from "../../stock/AddingPaddyStock";
import Buyers from "../../../components/Buyers/Buyers";
import ViewPaddyStock from "../../stock/ViewPaddyStock";
import ProcessedProducts from "../../stock/Processed";

import CreatingProducts from "../../stock/CreatingProducts";




export const Stock = () => {
  const [activeTab, setActiveTab] = useState("addPaddy");

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Tabs - Fixed height */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200">
        <nav className="px-6">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab("addPaddy")}
              className={`${
                activeTab === "addPaddy"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              } whitespace-nowrap py-3 border-b-2 font-medium text-sm transition-colors`}
            >
              Add Paddy
            </button>
            <button
              onClick={() => setActiveTab("creatingProducts")}
              className={`${
                activeTab === "creatingProducts"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              } whitespace-nowrap py-3 border-b-2 font-medium text-sm transition-colors`}
            >
              Creating Products
            </button>
            <button
              onClick={() => setActiveTab("products")}
              className={`${
                activeTab === "products"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              } whitespace-nowrap py-3 border-b-2 font-medium text-sm transition-colors`}
            >
              Products
            </button>
            <button
              onClick={() => setActiveTab("purchaseHistory")}
              className={`${
                activeTab === "purchaseHistory"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              } whitespace-nowrap py-3 border-b-2 font-medium text-sm transition-colors`}
            >
              Purchase History
            </button>
            <button
              onClick={() => setActiveTab("manageBuyers")}
              className={`${
                activeTab === "manageBuyers"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              } whitespace-nowrap py-3 border-b-2 font-medium text-sm transition-colors`}
            >
              Manage Buyers
            </button>
          </div>
        </nav>
      </div>

      {/* Content Area - Flexible height */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "addPaddy" && (
          <AddingPaddyStock
            key="add-paddy"
            onSuccessfulAdd={() => {
              setTimeout(() => {
                setActiveTab("purchaseHistory");
              }, 1000);
            }}
          />
        )}
        {activeTab === "creatingProducts" && <CreatingProducts key="creating-products" />}
        {activeTab === "products" && <ProcessedProducts key="products" />}
        {activeTab === "purchaseHistory" && <ViewPaddyStock key="purchase-history" />}
        {activeTab === "manageBuyers" && <Buyers key="manage-buyers" />}
      </div>
    </div>
  );
};

export default Stock;