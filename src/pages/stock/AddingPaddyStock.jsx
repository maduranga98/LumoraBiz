import React, { useState, useEffect } from "react";
import { db, auth } from "../../services/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { toast } from "react-hot-toast";
import Modal from "../../components/Modal";
import { BuyerPayment } from "./BuyerPayment";

export const AddingPaddyStock = () => {
  // States
  const [buyers, setBuyers] = useState([]);
  const [paddyTypes, setPaddyTypes] = useState([
    "Kiri Samba",
    "Sudu Kakulu",
    "Basmathi",
    "Nadu",
    "Samba",
    "Red Raw Rice",
    "Other",
  ]);
  const [loading, setLoading] = useState(true);
  const [currentBusiness, setCurrentBusiness] = useState(null);
  const [formData, setFormData] = useState({
    buyerId: "",
    buyerName: "",
    paddyType: "",
    quantity: "",
    price: "",
    notes: "",
  });
  const [customPaddyType, setCustomPaddyType] = useState("");

  // Payment modal states
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [savedStockData, setSavedStockData] = useState(null);

  // Get current business ID from localStorage
  useEffect(() => {
    const businessId = localStorage.getItem("currentBusinessId");
    if (businessId) {
      setCurrentBusiness(businessId);
    } else {
      // Handle case when no business is selected
      toast.error("Please select a business first");
      setLoading(false);
    }
  }, []);

  // Fetch buyers when current business changes
  useEffect(() => {
    if (currentBusiness) {
      fetchBuyers();
    }
  }, [currentBusiness]);

  // Fetch buyers from Firestore
  const fetchBuyers = async () => {
    if (!currentBusiness) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const buyersQuery = query(
        collection(db, "buyers"),
        where("businessId", "==", currentBusiness)
      );

      const querySnapshot = await getDocs(buyersQuery);
      const buyersList = [];

      querySnapshot.forEach((doc) => {
        buyersList.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      setBuyers(buyersList);
    } catch (error) {
      console.error("Error fetching buyers:", error);
      toast.error("Failed to load buyers data");
    } finally {
      setLoading(false);
    }
  };

  // Handle input changes with validation
  const handleChange = (e) => {
    const { name, value } = e.target;

    // Add validation for numerical fields
    if (name === "quantity" || name === "price") {
      if (value !== "" && !/^\d*\.?\d*$/.test(value)) return;
    }

    // If selecting a buyer, update both buyerId and buyerName
    if (name === "buyerId") {
      const selectedBuyer = buyers.find((buyer) => buyer.id === value);
      setFormData((prev) => ({
        ...prev,
        buyerId: value,
        buyerName: selectedBuyer ? selectedBuyer.name : "",
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  // Reset form data
  const resetForm = () => {
    setFormData({
      buyerId: "",
      buyerName: "",
      paddyType: "",
      quantity: "",
      price: "",
      notes: "",
    });
    setCustomPaddyType("");
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.buyerId) {
      toast.error("Please select a buyer");
      return;
    }

    if (!formData.paddyType && formData.paddyType !== "Other") {
      toast.error("Please select a paddy type");
      return;
    }

    if (formData.paddyType === "Other" && !customPaddyType) {
      toast.error("Please enter a custom paddy type");
      return;
    }

    if (!formData.quantity || parseFloat(formData.quantity) <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    if (!formData.price || parseFloat(formData.price) <= 0) {
      toast.error("Please enter a valid price");
      return;
    }

    if (!currentBusiness) {
      toast.error("No business selected");
      return;
    }

    try {
      const uid = auth.currentUser?.uid;
      if (!uid) {
        toast.error("Authentication error. Please sign in again.");
        return;
      }

      const totalAmount =
        parseFloat(formData.quantity) * parseFloat(formData.price);

      const stockData = {
        buyerId: formData.buyerId,
        buyerName: formData.buyerName,
        paddyType:
          formData.paddyType === "Other" ? customPaddyType : formData.paddyType,
        quantity: parseFloat(formData.quantity),
        price: parseFloat(formData.price),
        totalAmount: totalAmount,
        notes: formData.notes || null,
        businessId: currentBusiness,
        createdBy: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(db, "paddyStock"), stockData);
      toast.success("Paddy stock added successfully");

      // Save stock data and open payment modal
      setSavedStockData({
        buyerId: formData.buyerId,
        buyerName: formData.buyerName,
        totalAmount: totalAmount,
        stockData: stockData,
      });
      setIsPaymentModalOpen(true);
    } catch (error) {
      console.error("Error adding paddy stock:", error);
      toast.error("Failed to add paddy stock. Please try again.");
    }
  };

  // Handle payment completion
  const handlePaymentComplete = async (paymentData) => {
    try {
      // Save payment data to Firebase
      await addDoc(collection(db, "payments"), {
        ...paymentData,
        type: "stock_purchase",
        stockReference: savedStockData?.stockData,
        businessId: currentBusiness,
        createdBy: auth.currentUser?.uid,
        createdAt: serverTimestamp(),
      });

      toast.success("Payment recorded successfully!");
      setIsPaymentModalOpen(false);
      resetForm();
      setSavedStockData(null);
    } catch (error) {
      console.error("Error saving payment:", error);
      toast.error("Failed to record payment. Please try again.");
    }
  };

  // Handle payment modal close
  const handlePaymentModalClose = () => {
    setIsPaymentModalOpen(false);
    resetForm();
    setSavedStockData(null);
  };

  // Skip payment and just close
  const handleSkipPayment = () => {
    setIsPaymentModalOpen(false);
    resetForm();
    setSavedStockData(null);
    toast.success("Stock entry completed. Payment can be recorded later.");
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Add Paddy Stock</h1>
        <p className="text-gray-600 mt-1">
          Record new paddy stock purchases from buyers
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center my-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
        </div>
      ) : !currentBusiness ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-gray-900">
            No business selected
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Please select a business from the business selector.
          </p>
        </div>
      ) : buyers.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-gray-900">
            No buyers found
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            You need to add buyers before recording paddy stock.
          </p>
          <div className="mt-6">
            <button
              onClick={() => (window.location.href = "/buyers")}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <svg
                className="-ml-1 mr-2 h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                  clipRule="evenodd"
                />
              </svg>
              Add Buyers
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow-sm rounded-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Buyer Selection */}
            <div>
              <label
                htmlFor="buyerId"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Select Buyer <span className="text-red-500">*</span>
              </label>
              <select
                id="buyerId"
                name="buyerId"
                value={formData.buyerId}
                onChange={handleChange}
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                required
              >
                <option value="">-- Select a Buyer --</option>
                {buyers.map((buyer) => (
                  <option key={buyer.id} value={buyer.id}>
                    {buyer.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Paddy Type Selection */}
            <div>
              <label
                htmlFor="paddyType"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Paddy Type <span className="text-red-500">*</span>
              </label>
              <select
                id="paddyType"
                name="paddyType"
                value={formData.paddyType}
                onChange={handleChange}
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                required
              >
                <option value="">-- Select Paddy Type --</option>
                {paddyTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Paddy Type (shows only when "Other" is selected) */}
            {formData.paddyType === "Other" && (
              <div>
                <label
                  htmlFor="customPaddyType"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Custom Paddy Type <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="customPaddyType"
                  value={customPaddyType}
                  onChange={(e) => setCustomPaddyType(e.target.value)}
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  required
                />
              </div>
            )}

            {/* Quantity */}
            <div>
              <label
                htmlFor="quantity"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Quantity (kg) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="quantity"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="0.00"
                required
              />
            </div>

            {/* Price */}
            <div>
              <label
                htmlFor="price"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Price per kg (Rs.) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="price"
                name="price"
                value={formData.price}
                onChange={handleChange}
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="0.00"
                required
              />
            </div>

            {/* Total Amount (Calculated) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Amount (Rs.)
              </label>
              <div className="py-2 px-3 bg-gray-100 border border-gray-200 rounded-md text-gray-800 font-medium">
                {formData.quantity && formData.price
                  ? (
                      parseFloat(formData.quantity) * parseFloat(formData.price)
                    ).toFixed(2)
                  : "0.00"}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label
                htmlFor="notes"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Notes
              </label>
              <textarea
                id="notes"
                name="notes"
                rows="3"
                value={formData.notes}
                onChange={handleChange}
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Additional information about this purchase..."
              ></textarea>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={resetForm}
                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Reset
              </button>
              <button
                type="submit"
                className="bg-indigo-600 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Save Stock Entry
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Payment Modal */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={handlePaymentModalClose}
        title="Record Payment"
        size="xl"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">
              Stock Entry Completed Successfully!
            </h4>
            <p className="text-blue-700 text-sm">
              Would you like to record the payment for this purchase now?
            </p>
          </div>

          {savedStockData && (
            <BuyerPayment
              buyerId={savedStockData.buyerId}
              buyerName={savedStockData.buyerName}
              totalAmount={savedStockData.totalAmount}
              onPaymentComplete={handlePaymentComplete}
              onCancel={handleSkipPayment}
            />
          )}

          <div className="flex justify-center pt-4">
            <button
              onClick={handleSkipPayment}
              className="text-gray-500 hover:text-gray-700 text-sm underline"
            >
              Skip payment for now
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AddingPaddyStock;
