import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { useAuth } from "../../contexts/AuthContext";
import { useBusiness } from "../../contexts/BusinessContext";
import BaggedInventory from "./BaggedInventory";
import BagModals from "./BagModals";
import BatchesTable from "./BatchesTable";
import { useBagOperations } from "../../hooks/useBagOperations";
import { useDataFetching } from "../../hooks/useDataFetching";

// Local formatter functions
const formatNumber = (value, decimals = 2) => {
  const num = Number(value || 0);
  return isNaN(num) ? "0.00" : num.toFixed(decimals);
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    minimumFractionDigits: 2,
  })
    .format(amount)
    .replace("LKR", "Rs.");
};

const formatProductType = (type, riceType = null) => {
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

const ProcessedProducts = () => {
  const { currentUser } = useAuth();
  const { currentBusiness } = useBusiness();

  // States
  const [sortField, setSortField] = useState("createdAt");
  const [sortDirection, setSortDirection] = useState("desc");
  const [expandedRows, setExpandedRows] = useState({});

  // Modal states
  const [showBagSizeModal, setShowBagSizeModal] = useState(false);
  const [showBagCreationModal, setShowBagCreationModal] = useState(false);
  const [showIndividualBagSellModal, setShowIndividualBagSellModal] =
    useState(false);
  const [showBagDetailsModal, setShowBagDetailsModal] = useState(false);
  const [selectedBag, setSelectedBag] = useState(null);
  const [bagCreationData, setBagCreationData] = useState({
    sizeKg: "",
    quantity: "",
    productType: "",
    batchId: "",
  });
  const [individualBagSellData, setIndividualBagSellData] = useState({
    customerName: "",
    customerPhone: "",
    sellingPrice: 0,
    notes: "",
    quantityToSell: 1,
  });
  const [newBagSize, setNewBagSize] = useState("");

  // Custom hooks for data fetching and operations
  const { batches, baggedStocks, bagSizes, loading, error, fetchAllData } =
    useDataFetching(currentUser, currentBusiness, sortField, sortDirection);

  const {
    addBagSize,
    removeBagSize,
    createBags,
    handleIndividualBagSale,
    isCreatingBags,
  } = useBagOperations(
    currentUser,
    currentBusiness,
    batches,
    bagSizes,
    newBagSize,
    setNewBagSize,
    bagCreationData,
    setBagCreationData,
    individualBagSellData,
    setIndividualBagSellData,
    selectedBag,
    fetchAllData
  );

  // Handle sort change
  const handleSortChange = (field) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Manual refresh function
  const refreshData = () => {
    fetchAllData();
    toast.success("Refreshing data...");
  };

  // Toggle row expansion
  const toggleRowExpand = (id) => {
    setExpandedRows((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // View bag details
  const viewBagDetails = (bag) => {
    setSelectedBag(bag);
    setShowBagDetailsModal(true);
  };

  // Sell individual bag
  const sellIndividualBag = (bagGroup) => {
    setSelectedBag(bagGroup);
    setIndividualBagSellData({
      customerName: "",
      customerPhone: "",
      sellingPrice: bagGroup.recommendedSellingPrice || bagGroup.pricePerKg,
      notes: "",
      quantityToSell: 1,
    });
    setShowIndividualBagSellModal(true);
  };

  // Open bag creation modal
  const openBagCreationModal = (productType, batchId) => {
    setBagCreationData({
      sizeKg: "",
      quantity: "",
      productType: productType,
      batchId: batchId,
    });
    setShowBagCreationModal(true);
  };

  // Check if product can be bagged
  const canCreateBags = (productType) => {
    return true;
  };

  // No business selected state
  if (!currentBusiness?.id || !currentUser?.uid) {
    return (
      <div className="h-full flex items-center justify-center p-4 sm:p-6">
        <div className="bg-yellow-50/80 backdrop-blur-xl border border-yellow-200/50 p-6 sm:p-8 rounded-2xl max-w-md text-center">
          <div className="w-12 h-12 mx-auto mb-4 bg-yellow-100 rounded-full flex items-center justify-center">
            <svg
              className="w-6 h-6 text-yellow-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No business selected
          </h3>
          <p className="text-sm text-gray-600">
            Please ensure you are logged in and have selected a business.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-blue-50/50 to-indigo-100/30">
      {/* Fixed Header Section */}
      <div className="flex-shrink-0 p-4 sm:p-6 border-b border-white/20 bg-white/80 backdrop-blur-xl">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">
              Processed Batches & Products
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage processed batches, create bags, and sell products
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={() => setShowBagSizeModal(true)}
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-3 py-2 rounded-xl text-sm flex items-center justify-center transition-all duration-200 backdrop-blur-lg shadow-lg"
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span className="hidden sm:inline">Manage Bags</span>
              <span className="sm:hidden">Bags</span>
            </button>
            <button
              onClick={refreshData}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-3 py-2 rounded-xl text-sm flex items-center justify-center transition-all duration-200 backdrop-blur-lg shadow-lg"
            >
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto">
        {/* Error Display */}
        {error && (
          <div className="m-4 sm:m-6 bg-red-50/80 backdrop-blur-xl border border-red-200/50 text-red-700 px-4 py-3 rounded-xl">
            <h3 className="font-medium">Error loading data</h3>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Bagged Inventory Section */}
        <div className="px-4 sm:px-6">
          <BaggedInventory
            baggedStocks={baggedStocks}
            onViewDetails={viewBagDetails}
            onSellBag={sellIndividualBag}
            loading={loading && Object.keys(baggedStocks).length === 0}
          />
        </div>

        {/* Batches List */}
        <div className="p-4 sm:p-6">
          <BatchesTable
            batches={batches}
            loading={loading}
            sortField={sortField}
            sortDirection={sortDirection}
            expandedRows={expandedRows}
            handleSortChange={handleSortChange}
            toggleRowExpand={toggleRowExpand}
            openBagCreationModal={openBagCreationModal}
            canCreateBags={canCreateBags}
          />
        </div>
      </div>

      {/* All Modals */}
      <BagModals
        // Bag Size Modal
        showBagSizeModal={showBagSizeModal}
        setShowBagSizeModal={setShowBagSizeModal}
        bagSizes={bagSizes}
        newBagSize={newBagSize}
        setNewBagSize={setNewBagSize}
        addBagSize={addBagSize}
        removeBagSize={removeBagSize}
        // Bag Creation Modal
        showBagCreationModal={showBagCreationModal}
        setShowBagCreationModal={setShowBagCreationModal}
        bagCreationData={bagCreationData}
        setBagCreationData={setBagCreationData}
        batches={batches}
        createBags={createBags}
        isCreatingBags={isCreatingBags}
        // Bag Sell Modal
        showIndividualBagSellModal={showIndividualBagSellModal}
        setShowIndividualBagSellModal={setShowIndividualBagSellModal}
        selectedBag={selectedBag}
        setSelectedBag={setSelectedBag}
        individualBagSellData={individualBagSellData}
        setIndividualBagSellData={setIndividualBagSellData}
        handleIndividualBagSale={handleIndividualBagSale}
        // Bag Details Modal
        showBagDetailsModal={showBagDetailsModal}
        setShowBagDetailsModal={setShowBagDetailsModal}
        viewBagDetails={viewBagDetails}
        sellIndividualBag={sellIndividualBag}
      />
    </div>
  );
};

export default ProcessedProducts;
