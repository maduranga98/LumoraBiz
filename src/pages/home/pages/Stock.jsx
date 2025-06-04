import React, { useState, useEffect } from "react";
import AddingPaddyStock from "../../stock/AddingPaddyStock";
import Buyers from "../../../components/Buyers/Buyers";
import ViewPaddyStock from "../../stock/ViewPaddyStock";
import ProcessedProducts from "../../stock/Processed";

export const Stock = () => {
  const [activeTab, setActiveTab] = useState("viewStock");
  const [isMobile, setIsMobile] = useState(false);

  // Check screen size for responsive design
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);

    return () => {
      window.removeEventListener("resize", checkScreenSize);
    };
  }, []);

  // Function to reload the data
  const refreshData = () => {
    // Simply changing the activeTab and then changing it back
    // forces a component remount which refreshes the data
    setActiveTab("temp");
    setTimeout(() => {
      setActiveTab("viewStock");
    }, 10);
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Stock Management</h1>
        <p className="text-gray-600 mt-1">
          Manage your paddy stock inventory and purchase history
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex flex-wrap space-x-8">
            <button
              onClick={() => setActiveTab("viewStock")}
              className={`${
                activeTab === "viewStock"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Purchase History
            </button>
            <button
              onClick={() => setActiveTab("addStock")}
              className={`${
                activeTab === "addStock"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Add Stock
            </button>
            <button
              onClick={() => setActiveTab("buyers")}
              className={`${
                activeTab === "buyers"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Buyers
            </button>
            <button
              onClick={() => setActiveTab("processed")}
              className={`${
                activeTab === "processed"
                  ? "border-indigo-500 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Processed
            </button>
          </nav>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4 mb-6">
        {activeTab !== "addStock" && (
          <button
            onClick={() => setActiveTab("addStock")}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md flex items-center"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                clipRule="evenodd"
              />
            </svg>
            Add Paddy Stock
          </button>
        )}

        {activeTab !== "buyers" && (
          <button
            onClick={() => setActiveTab("buyers")}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md flex items-center"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                clipRule="evenodd"
              />
            </svg>
            Manage Buyers
          </button>
        )}

        {activeTab !== "viewStock" && (
          <button
            onClick={() => setActiveTab("viewStock")}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md flex items-center"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 12a2 2 0 100-4 2 2 0 000 4z"
                clipRule="evenodd"
              />
              <path
                fillRule="evenodd"
                d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                clipRule="evenodd"
              />
            </svg>
            View Purchase History
          </button>
        )}

        {activeTab === "viewStock" && (
          <button
            onClick={refreshData}
            className="ml-auto bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded-md flex items-center"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
                clipRule="evenodd"
              />
            </svg>
            Refresh Data
          </button>
        )}
      </div>

      {/* Mobile Tab Selector (for small screens) */}
      {isMobile && (
        <div className="mb-6">
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
            className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            <option value="viewStock">Purchase History</option>
            <option value="addStock">Add Stock</option>
            <option value="buyers">Buyers</option>
            <option value="processed">Processed</option>
          </select>
        </div>
      )}

      {/* Tab Content */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        {activeTab === "viewStock" && <ViewPaddyStock key="view-stock" />}
        {activeTab === "addStock" && (
          <AddingPaddyStock
            key="add-stock"
            onSuccessfulAdd={() => {
              // Navigate to view stock after successful addition
              setTimeout(() => {
                setActiveTab("viewStock");
              }, 1000);
            }}
          />
        )}
        {activeTab === "buyers" && <Buyers key="buyers" />}
        {activeTab === "processed" && <ProcessedProducts key="processed" />}
      </div>
    </div>
  );
};

export default Stock;
