import React, { useState } from "react";
import { db, auth } from "../../services/firebase";
import { collection, addDoc } from "firebase/firestore";
import { toast } from "react-hot-toast";

export const AddNewBusiness = () => {
  // Form state
  const [formData, setFormData] = useState({
    businessName: "",
    address: "",
    businessRegistration: "",
    email: "",
    phoneNumber: "",
  });

  // Loading state
  const [loading, setLoading] = useState(false);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.businessName || !formData.address) {
      toast.error("Business name and address are required");
      return;
    }

    setLoading(true);

    try {
      // Get current user ID
      const uid = auth.currentUser?.uid;

      if (!uid) {
        toast.error("You must be logged in to add a business");
        setLoading(false);
        return;
      }

      // Prepare business data
      const businessData = {
        businessName: formData.businessName,
        address: formData.address,
        businessRegistration: formData.businessRegistration || null,
        email: formData.email || null,
        phoneNumber: formData.phoneNumber || null,
        ownerId: uid,
        createdAt: new Date(),
      };

      // Add document to 'business' collection
      await addDoc(collection(db, "business"), businessData);

      // Show success message
      toast.success("Business added successfully");

      // Reset form
      setFormData({
        businessName: "",
        address: "",
        businessRegistration: "",
        email: "",
        phoneNumber: "",
      });
    } catch (error) {
      console.error("Error adding business:", error);
      toast.error("Failed to add business. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">
        Add New Business
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Business Name - Required */}
        <div>
          <label
            htmlFor="businessName"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Business Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="businessName"
            name="businessName"
            value={formData.businessName}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            placeholder="Enter business name"
            required
          />
        </div>

        {/* Business Address - Required */}
        <div>
          <label
            htmlFor="address"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Address <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            placeholder="Enter business address"
            required
          />
        </div>

        {/* Business Registration - Optional */}
        <div>
          <label
            htmlFor="businessRegistration"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Business Registration{" "}
            <span className="text-gray-400">(optional)</span>
          </label>
          <input
            type="text"
            id="businessRegistration"
            name="businessRegistration"
            value={formData.businessRegistration}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            placeholder="Enter registration number"
          />
        </div>

        {/* Email - Optional */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Email <span className="text-gray-400">(optional)</span>
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            placeholder="Enter business email"
          />
        </div>

        {/* Phone Number - Optional */}
        <div>
          <label
            htmlFor="phoneNumber"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Phone Number <span className="text-gray-400">(optional)</span>
          </label>
          <input
            type="tel"
            id="phoneNumber"
            name="phoneNumber"
            value={formData.phoneNumber}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            placeholder="Enter business phone number"
          />
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors ${
              loading ? "opacity-70 cursor-not-allowed" : ""
            }`}
          >
            {loading ? "Adding Business..." : "Add Business"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddNewBusiness;
