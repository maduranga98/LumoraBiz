import React, { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  writeBatch,
  doc,
  serverTimestamp,
  increment,
  addDoc,
} from "firebase/firestore";
import { toast } from "react-hot-toast";
import { useAuth } from "../../contexts/AuthContext";
import { useBusiness } from "../../contexts/BusinessContext";
import { db } from "../../services/firebase";
import {
  ShoppingCart,
  Package,
  Plus,
  Minus,
  DollarSign,
  AlertTriangle,
  Search,
  Trash2,
  User,
  Receipt,
  Loader2,
  UserPlus,
  CreditCard,
  Banknote,
  FileText,
} from "lucide-react";
import WalkInInvoice from "../../components/walkInSale/WalkInInvoice";

const WalkInSale = () => {
  const { currentUser } = useAuth();
  const { currentBusiness } = useBusiness();

  // Product data state
  const [baggedStocks, setBaggedStocks] = useState({});
  const [groupedProducts, setGroupedProducts] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Customer management state
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    address: "",
    email: "",
  });

  // Sale state
  const [selectedProducts, setSelectedProducts] = useState([]);

  // Payment state
  const [paymentType, setPaymentType] = useState("cash");
  const [chequeDetails, setChequeDetails] = useState({
    chequeNumber: "",
    bank: "",
    branch: "",
    date: "",
    amount: "",
  });

  // UI state
  const [searchTerm, setSearchTerm] = useState("");
  const [showInvoice, setShowInvoice] = useState(false);
  const [lastSaleData, setLastSaleData] = useState(null);

  // Helper functions
  const cleanObjectForFirestore = (obj) => {
    if (obj === null || obj === undefined) {
      return null;
    }

    if (Array.isArray(obj)) {
      return obj
        .map(cleanObjectForFirestore)
        .filter((item) => item !== undefined);
    }

    if (typeof obj === "object" && obj !== null) {
      const cleaned = {};
      for (const [key, value] of Object.entries(obj)) {
        const cleanedValue = cleanObjectForFirestore(value);
        if (cleanedValue !== undefined) {
          cleaned[key] = cleanedValue;
        }
      }
      return cleaned;
    }

    return obj;
  };

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

  // Format number safely
  const formatNumber = (value, decimals = 2) => {
    const num = Number(value || 0);
    return isNaN(num) ? "0.00" : num.toFixed(decimals);
  };

  // Load data on component mount
  useEffect(() => {
    if (currentUser?.uid && currentBusiness?.id) {
      Promise.all([fetchBaggedStocks(), fetchCustomers()]);
    }
  }, [currentUser, currentBusiness]);

  // Fetch bagged stock inventory
  const fetchBaggedStocks = async () => {
    setLoading(true);
    try {
      console.log("🔍 Fetching bagged stocks...");

      const collectionPath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/stock/baggedStock/stock`;

      const baggedStockQuery = query(
        collection(db, collectionPath),
        where("status", "==", "available"),
        orderBy("createdAt", "desc")
      );

      const querySnapshot = await getDocs(baggedStockQuery);
      console.log("📦 Found", querySnapshot.size, "bagged stock documents");

      const baggedStocksData = {};

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log("📄 Bagged stock document:", doc.id, data);

        const bagData = {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        };

        let groupKey;
        if (data.productType === "rice" && data.riceType) {
          groupKey = `rice_${data.riceType}`;
        } else {
          groupKey = data.productType;
        }

        if (!baggedStocksData[groupKey]) {
          baggedStocksData[groupKey] = [];
        }

        baggedStocksData[groupKey].push(bagData);
      });

      console.log("🏷️ Grouped bagged stocks:", baggedStocksData);
      setBaggedStocks(baggedStocksData);
      processGroupedProducts(baggedStocksData);
    } catch (error) {
      console.error("❌ Error fetching bagged stocks:", error);
      toast.error(`Failed to load bagged stocks: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch walk-in customers
  const fetchCustomers = async () => {
    try {
      console.log("👥 Fetching walk-in customers...");

      const customersPath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/walkIn_customers`;
      const customersQuery = query(
        collection(db, customersPath),
        orderBy("name", "asc")
      );

      const querySnapshot = await getDocs(customersQuery);
      const customersList = [];

      querySnapshot.forEach((doc) => {
        customersList.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      console.log("👥 Found customers:", customersList);
      setCustomers(customersList);
    } catch (error) {
      console.error("❌ Error fetching customers:", error);
      toast.error("Failed to load customers");
    }
  };

  // Process grouped products
  const processGroupedProducts = (baggedStocksData) => {
    console.log("🔄 Processing grouped products...");
    const grouped = {};

    Object.entries(baggedStocksData).forEach(([productType, bags]) => {
      const itemGroups = {};

      bags.forEach((bag) => {
        const key = `${bag.itemName}-${bag.sourceBatchNumber}`;

        if (!itemGroups[key]) {
          itemGroups[key] = {
            itemName: bag.itemName,
            productType: bag.productType,
            riceType: bag.riceType,
            bagSize: bag.bagSize,
            sourceBatchNumber: bag.sourceBatchNumber,
            sourceBatchId: bag.sourceBatchId,
            pricePerKg: bag.pricePerKg,
            recommendedSellingPrice: bag.recommendedSellingPrice,
            originalPaddyType: bag.originalPaddyType,
            createdAt: bag.createdAt,
            bags: [],
            totalBags: 0,
            totalWeight: 0,
            uniqueKey: `${productType}_${key}`,
            originalProductType: productType,
          };
        }

        itemGroups[key].bags.push(bag);

        const bagQuantity = bag.quantity || 1;
        const bagWeight =
          bag.totalWeight || bag.weight || bag.bagSize * bagQuantity || 0;

        itemGroups[key].totalBags += bagQuantity;
        itemGroups[key].totalWeight += bagWeight;
      });

      Object.values(itemGroups).forEach((group) => {
        const uniqueKey = group.uniqueKey;

        grouped[uniqueKey] = {
          ...group,
          displayName: group.itemName,
          totalAvailableWeight: group.totalWeight,
          totalAvailableBags: group.totalBags,
          price: group.recommendedSellingPrice || group.pricePerKg,
          availableQuantity: group.totalBags,
        };
      });
    });

    console.log("✅ Processed grouped products:", grouped);
    setGroupedProducts(grouped);
  };

  // Get all available products for display
  const getAllAvailableProducts = () => {
    const products = [];

    Object.entries(groupedProducts).forEach(([uniqueKey, productData]) => {
      if (productData.availableQuantity > 0) {
        const product = {
          id: uniqueKey,
          type: "bagged",
          productType: productData.originalProductType,
          displayName: productData.displayName,
          itemName: productData.itemName,
          bagSize: productData.bagSize,
          availableQuantity: productData.totalBags,
          totalWeight: productData.totalWeight,
          pricePerKg: productData.price,
          batchNumber: productData.sourceBatchNumber,
          riceType: productData.riceType,
          createdAt: productData.createdAt,
          uniqueKey: uniqueKey,
        };

        products.push(product);
      }
    });

    // Filter products based on search term
    const filteredProducts = products.filter(
      (product) =>
        product.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.riceType &&
          product.riceType.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return filteredProducts;
  };

  // Add customer
  const addNewCustomer = async () => {
    if (!newCustomer.name.trim()) {
      toast.error("Customer name is required");
      return;
    }

    try {
      const customerData = {
        name: newCustomer.name.trim(),
        phone: newCustomer.phone.trim(),
        address: newCustomer.address.trim(),
        email: newCustomer.email.trim(),
        createdAt: serverTimestamp(),
        createdBy: currentUser.uid,
        businessId: currentBusiness.id,
        totalPurchases: 0,
        totalAmount: 0,
      };

      const customersPath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/walkIn_customers`;
      const docRef = await addDoc(
        collection(db, customersPath),
        cleanObjectForFirestore(customerData)
      );

      // Add to local state
      const newCustomerWithId = {
        id: docRef.id,
        ...customerData,
        createdAt: new Date(),
      };

      setCustomers([...customers, newCustomerWithId]);
      setSelectedCustomerId(docRef.id);

      // Reset form
      setNewCustomer({ name: "", phone: "", address: "", email: "" });
      setShowNewCustomerForm(false);

      toast.success("Customer added successfully");
    } catch (error) {
      console.error("Error adding customer:", error);
      toast.error("Failed to add customer");
    }
  };

  // Add product to cart
  const addToCart = (product, bagQuantity, customPrice) => {
    if (bagQuantity <= 0) {
      toast.error("Bag quantity must be greater than 0");
      return;
    }

    if (bagQuantity > product.availableQuantity) {
      toast.error(`Only ${product.availableQuantity} bags available`);
      return;
    }

    const totalWeight = bagQuantity * product.bagSize;
    const pricePerKg = customPrice || product.pricePerKg;
    const totalAmount = totalWeight * pricePerKg;

    const existingIndex = selectedProducts.findIndex(
      (p) => p.id === product.id
    );

    if (existingIndex >= 0) {
      const updatedProducts = [...selectedProducts];
      const newBagQuantity =
        updatedProducts[existingIndex].bagQuantity + bagQuantity;

      if (newBagQuantity > product.availableQuantity) {
        toast.error(
          `Total bags cannot exceed ${product.availableQuantity} bags`
        );
        return;
      }

      const newTotalWeight = newBagQuantity * product.bagSize;
      updatedProducts[existingIndex] = {
        ...updatedProducts[existingIndex],
        bagQuantity: newBagQuantity,
        totalWeight: newTotalWeight,
        pricePerKg: pricePerKg,
        total: newTotalWeight * pricePerKg,
      };

      setSelectedProducts(updatedProducts);
    } else {
      const cartItem = {
        ...product,
        bagQuantity: bagQuantity,
        totalWeight: totalWeight,
        pricePerKg: pricePerKg,
        total: totalAmount,
      };

      setSelectedProducts([...selectedProducts, cartItem]);
    }

    toast.success(
      `Added ${bagQuantity} bags (${totalWeight}kg) of ${product.displayName} to cart`
    );
  };

  // Remove product from cart
  const removeFromCart = (productId) => {
    setSelectedProducts(selectedProducts.filter((p) => p.id !== productId));
  };

  // Update cart item quantity
  const updateCartQuantity = (productId, newBagQuantity) => {
    if (newBagQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setSelectedProducts(
      selectedProducts.map((product) => {
        if (product.id === productId) {
          const newTotalWeight = newBagQuantity * product.bagSize;
          return {
            ...product,
            bagQuantity: newBagQuantity,
            totalWeight: newTotalWeight,
            total: newTotalWeight * product.pricePerKg,
          };
        }
        return product;
      })
    );
  };

  // Update cart item price
  const updateCartPrice = (productId, newPrice) => {
    if (newPrice < 0) return;

    setSelectedProducts(
      selectedProducts.map((product) => {
        if (product.id === productId) {
          return {
            ...product,
            pricePerKg: newPrice,
            total: product.totalWeight * newPrice,
          };
        }
        return product;
      })
    );
  };

  // Calculate cart totals
  const getCartTotals = () => {
    const totalBags = selectedProducts.reduce(
      (sum, product) => sum + product.bagQuantity,
      0
    );
    const totalWeight = selectedProducts.reduce(
      (sum, product) => sum + product.totalWeight,
      0
    );
    const totalAmount = selectedProducts.reduce(
      (sum, product) => sum + product.total,
      0
    );
    return { totalBags, totalWeight, totalAmount };
  };

  // Validate sale data
  const validateSale = () => {
    if (selectedProducts.length === 0) {
      toast.error("Please add products to cart");
      return false;
    }

    if (!selectedCustomerId) {
      toast.error("Please select a customer");
      return false;
    }

    if (paymentType === "cheque") {
      if (
        !chequeDetails.chequeNumber ||
        !chequeDetails.bank ||
        !chequeDetails.date
      ) {
        toast.error("Please fill in all required cheque details");
        return false;
      }
    }

    return true;
  };

  // Process sale transaction
  const processSale = async () => {
    if (!validateSale()) return;

    setSaving(true);
    try {
      const batch = writeBatch(db);
      const { totalBags, totalWeight, totalAmount } = getCartTotals();
      const selectedCustomer = customers.find(
        (c) => c.id === selectedCustomerId
      );

      // Generate sale ID
      const saleRef = doc(collection(db, "temp"));
      const saleId = saleRef.id;

      // Prepare payment data
      let paymentData = {
        type: paymentType,
        amount: totalAmount,
        status: paymentType === "credit" ? "pending" : "completed",
      };

      if (paymentType === "cheque") {
        paymentData.cheque = {
          number: chequeDetails.chequeNumber,
          bank: chequeDetails.bank,
          branch: chequeDetails.branch,
          date: chequeDetails.date,
          amount: parseFloat(chequeDetails.amount) || totalAmount,
        };
        paymentData.status = "pending"; // Cheques are pending until cleared
      }

      // Create sale record
      const saleData = {
        saleId,
        customerId: selectedCustomerId,
        customer: {
          name: selectedCustomer.name,
          phone: selectedCustomer.phone,
          address: selectedCustomer.address,
        },
        items: selectedProducts.map((product) => ({
          productId: product.id,
          productName: product.displayName,
          itemName: product.itemName,
          bagQuantity: product.bagQuantity,
          bagSize: product.bagSize,
          totalWeight: product.totalWeight,
          pricePerKg: product.pricePerKg,
          total: product.total,
          batchNumber: product.batchNumber,
          riceType: product.riceType,
        })),
        totals: {
          totalBags,
          totalWeight,
          totalAmount,
          itemCount: selectedProducts.length,
        },
        payment: paymentData,
        status: "completed",
        createdAt: serverTimestamp(),
        createdBy: currentUser.uid,
        businessId: currentBusiness.id,
      };

      // Save to walkIn_sale collection
      const salesPath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/walkIn_sale`;
      const saleDocRef = doc(db, salesPath, saleId);
      batch.set(saleDocRef, cleanObjectForFirestore(saleData));

      // Save to customer purchases
      const purchasePath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/walkIn_customers/${selectedCustomerId}/purchases`;
      const purchaseDocRef = doc(db, purchasePath, saleId);
      batch.set(
        purchaseDocRef,
        cleanObjectForFirestore({
          saleId,
          items: saleData.items,
          totals: saleData.totals,
          payment: paymentData,
          createdAt: serverTimestamp(),
        })
      );

      // Update customer totals
      const customerRef = doc(
        db,
        `owners/${currentUser.uid}/businesses/${currentBusiness.id}/walkIn_customers`,
        selectedCustomerId
      );
      batch.update(customerRef, {
        totalPurchases: increment(1),
        totalAmount: increment(totalAmount),
        lastPurchaseAt: serverTimestamp(),
      });

      // Update stock quantities using FIFO logic
      for (const product of selectedProducts) {
        const productData = groupedProducts[product.uniqueKey];
        let remainingBags = product.bagQuantity;

        for (const bag of productData.bags) {
          if (remainingBags <= 0) break;

          const bagRef = doc(
            db,
            `owners/${currentUser.uid}/businesses/${currentBusiness.id}/stock/baggedStock/stock`,
            bag.id
          );

          const bagsToTakeFromThisBag = Math.min(remainingBags, bag.quantity);

          if (bagsToTakeFromThisBag === bag.quantity) {
            batch.update(bagRef, {
              quantity: 0,
              totalWeight: 0,
              status: "sold",
              soldAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          } else {
            batch.update(bagRef, {
              quantity: increment(-bagsToTakeFromThisBag),
              totalWeight: increment(-product.bagSize * bagsToTakeFromThisBag),
              lastSoldAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }

          remainingBags -= bagsToTakeFromThisBag;
        }
      }

      await batch.commit();

      // Prepare data for invoice
      const invoiceData = {
        saleId,
        customer: selectedCustomer,
        items: selectedProducts,
        totals: { totalBags, totalWeight, totalAmount },
        payment: paymentData,
        createdAt: new Date(),
      };

      toast.success(`Sale completed! Total: ${formatCurrency(totalAmount)}`);

      // Show invoice
      setLastSaleData(invoiceData);
      setShowInvoice(true);

      // Reset form
      setSelectedProducts([]);
      setSelectedCustomerId("");
      setPaymentType("cash");
      setChequeDetails({
        chequeNumber: "",
        bank: "",
        branch: "",
        date: "",
        amount: "",
      });

      // Refresh data
      await Promise.all([fetchBaggedStocks(), fetchCustomers()]);
    } catch (error) {
      console.error("Error processing sale:", error);
      toast.error("Failed to process sale. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading available products...</p>
        </div>
      </div>
    );
  }

  const availableProducts = getAllAvailableProducts();
  const { totalBags, totalWeight, totalAmount } = getCartTotals();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50/50 to-indigo-100/30 p-3 sm:p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                Walk-in Sale
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                Direct sales to walk-in customers
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative w-full sm:w-auto">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-64 pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
          {/* Available Products */}
          <div className="xl:col-span-2">
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg">
              <div className="p-4 sm:p-6 border-b border-gray-200">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Package className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                  Available Products ({availableProducts.length})
                </h2>
              </div>

              <div className="p-4 sm:p-6">
                {availableProducts.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">No products available</p>
                    <p className="text-sm text-gray-500">
                      Create bagged products from your inventory to start
                      selling
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {availableProducts.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onAddToCart={addToCart}
                        formatCurrency={formatCurrency}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Customer & Cart Section */}
          <div className="space-y-4 sm:space-y-6">
            {/* Customer Selection */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <User className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                Customer Selection
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Customer *
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={selectedCustomerId}
                      onChange={(e) => setSelectedCustomerId(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    >
                      <option value="">Select a customer...</option>
                      {customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.name}{" "}
                          {customer.phone ? `(${customer.phone})` : ""}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() =>
                        setShowNewCustomerForm(!showNewCustomerForm)
                      }
                      className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1 shrink-0"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span className="hidden sm:inline">Add</span>
                    </button>
                  </div>
                </div>

                {/* New Customer Form */}
                {showNewCustomerForm && (
                  <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                    <h4 className="font-medium text-gray-900 text-sm">
                      Add New Customer
                    </h4>
                    <div className="grid grid-cols-1 gap-3">
                      <input
                        type="text"
                        placeholder="Customer Name *"
                        value={newCustomer.name}
                        onChange={(e) =>
                          setNewCustomer({
                            ...newCustomer,
                            name: e.target.value,
                          })
                        }
                        className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                      <input
                        type="tel"
                        placeholder="Phone Number"
                        value={newCustomer.phone}
                        onChange={(e) =>
                          setNewCustomer({
                            ...newCustomer,
                            phone: e.target.value,
                          })
                        }
                        className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Address"
                        value={newCustomer.address}
                        onChange={(e) =>
                          setNewCustomer({
                            ...newCustomer,
                            address: e.target.value,
                          })
                        }
                        className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                      <input
                        type="email"
                        placeholder="Email"
                        value={newCustomer.email}
                        onChange={(e) =>
                          setNewCustomer({
                            ...newCustomer,
                            email: e.target.value,
                          })
                        }
                        className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={addNewCustomer}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors text-sm"
                      >
                        Add Customer
                      </button>
                      <button
                        onClick={() => setShowNewCustomerForm(false)}
                        className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Type */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                Payment Method
              </h3>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    onClick={() => setPaymentType("cash")}
                    className={`p-3 rounded-lg border-2 flex flex-col items-center gap-2 transition-colors ${
                      paymentType === "cash"
                        ? "border-green-500 bg-green-50 text-green-700"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <Banknote className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="text-xs sm:text-sm font-medium">Cash</span>
                  </button>

                  <button
                    onClick={() => setPaymentType("credit")}
                    className={`p-3 rounded-lg border-2 flex flex-col items-center gap-2 transition-colors ${
                      paymentType === "credit"
                        ? "border-orange-500 bg-orange-50 text-orange-700"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="text-xs sm:text-sm font-medium">
                      Credit
                    </span>
                  </button>

                  <button
                    onClick={() => setPaymentType("cheque")}
                    className={`p-3 rounded-lg border-2 flex flex-col items-center gap-2 transition-colors ${
                      paymentType === "cheque"
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="text-xs sm:text-sm font-medium">
                      Cheque
                    </span>
                  </button>
                </div>

                {/* Cheque Details */}
                {paymentType === "cheque" && (
                  <div className="bg-blue-50 p-4 rounded-lg space-y-3">
                    <h4 className="font-medium text-blue-900 text-sm sm:text-base">
                      Cheque Details
                    </h4>
                    <div className="grid grid-cols-1 gap-3">
                      <input
                        type="text"
                        placeholder="Cheque Number *"
                        value={chequeDetails.chequeNumber}
                        onChange={(e) =>
                          setChequeDetails({
                            ...chequeDetails,
                            chequeNumber: e.target.value,
                          })
                        }
                        className="px-3 py-2 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Bank *"
                          value={chequeDetails.bank}
                          onChange={(e) =>
                            setChequeDetails({
                              ...chequeDetails,
                              bank: e.target.value,
                            })
                          }
                          className="px-3 py-2 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        />
                        <input
                          type="text"
                          placeholder="Branch"
                          value={chequeDetails.branch}
                          onChange={(e) =>
                            setChequeDetails({
                              ...chequeDetails,
                              branch: e.target.value,
                            })
                          }
                          className="px-3 py-2 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-blue-700 mb-1">
                            Cheque Date *
                          </label>
                          <input
                            type="date"
                            value={chequeDetails.date}
                            onChange={(e) =>
                              setChequeDetails({
                                ...chequeDetails,
                                date: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-blue-700 mb-1">
                            Amount (Optional)
                          </label>
                          <input
                            type="number"
                            placeholder={formatCurrency(totalAmount)}
                            value={chequeDetails.amount}
                            onChange={(e) =>
                              setChequeDetails({
                                ...chequeDetails,
                                amount: e.target.value,
                              })
                            }
                            step="0.01"
                            min="0"
                            className="w-full px-3 py-2 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          />
                        </div>
                      </div>
                      <div className="text-xs text-blue-600 bg-blue-100 p-2 rounded">
                        <p>
                          <strong>Note:</strong> If amount is not specified,
                          total sale amount will be used.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Shopping Cart */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg">
              <div className="p-4 sm:p-6 border-b border-gray-200">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                  Shopping Cart ({selectedProducts.length})
                </h3>
              </div>

              <div className="p-4 sm:p-6">
                {selectedProducts.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Cart is empty</p>
                    <p className="text-sm text-gray-500">
                      Add products to start selling
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedProducts.map((product) => (
                      <CartItem
                        key={product.id}
                        product={product}
                        onUpdateQuantity={updateCartQuantity}
                        onUpdatePrice={updateCartPrice}
                        onRemove={removeFromCart}
                        formatCurrency={formatCurrency}
                      />
                    ))}

                    {/* Cart Summary */}
                    <div className="border-t pt-4 mt-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Total Bags:</span>
                          <span className="font-medium">{totalBags}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Total Weight:</span>
                          <span className="font-medium">
                            {formatNumber(totalWeight)} kg
                          </span>
                        </div>
                        <div className="flex justify-between text-base sm:text-lg font-semibold">
                          <span>Total Amount:</span>
                          <span>{formatCurrency(totalAmount)}</span>
                        </div>
                      </div>

                      <button
                        onClick={processSale}
                        disabled={
                          saving ||
                          selectedProducts.length === 0 ||
                          !selectedCustomerId
                        }
                        className="w-full mt-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-500 text-white py-3 rounded-lg flex items-center justify-center gap-2 transition-all font-medium text-sm sm:text-base"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Processing Sale...
                          </>
                        ) : (
                          <>
                            <Receipt className="w-4 h-4" />
                            Complete Sale
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Modal */}
      {showInvoice && lastSaleData && (
        <WalkInInvoice
          saleData={lastSaleData}
          businessInfo={currentBusiness}
          onClose={() => setShowInvoice(false)}
          formatCurrency={formatCurrency}
          formatNumber={formatNumber}
          isVisible={showInvoice}
        />
      )}
    </div>
  );
};

// Product Card Component
const ProductCard = ({ product, onAddToCart, formatCurrency }) => {
  const [bagQuantity, setBagQuantity] = useState("");
  const [customPrice, setCustomPrice] = useState("");

  const handleAdd = () => {
    const qty = parseInt(bagQuantity);
    const price = parseFloat(customPrice) || product.pricePerKg;

    if (qty > 0) {
      onAddToCart(product, qty, price);
      setBagQuantity("");
      setCustomPrice("");
    }
  };

  const isInsufficientStock = product.availableQuantity <= 0;

  return (
    <div
      className={`border rounded-xl p-3 sm:p-4 ${
        isInsufficientStock
          ? "bg-red-50 border-red-200"
          : "bg-white border-gray-200"
      } hover:shadow-md transition-all`}
    >
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-3 gap-2">
        <div className="flex-1">
          <h4 className="font-medium text-gray-900 text-sm sm:text-base">
            {product.displayName}
          </h4>
          <div className="text-xs sm:text-sm text-gray-500 space-y-1">
            <p>
              Available: {product.availableQuantity} bags (
              {(product.availableQuantity * product.bagSize).toFixed(1)} kg)
            </p>
            <p>Bag Size: {product.bagSize} kg</p>
            {product.riceType && <p>Rice Type: {product.riceType}</p>}
            {product.batchNumber && <p>Batch: {product.batchNumber}</p>}
          </div>
        </div>

        <div className="text-left sm:text-right">
          <p className="font-semibold text-gray-900 text-sm sm:text-base">
            {formatCurrency(product.pricePerKg)}/kg
          </p>
          <span className="inline-block px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700">
            Available
          </span>
        </div>
      </div>

      {isInsufficientStock ? (
        <div className="flex items-center gap-2 text-red-600">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-sm font-medium">Out of Stock</span>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <input
            type="number"
            placeholder="Bags"
            value={bagQuantity}
            onChange={(e) => setBagQuantity(e.target.value)}
            min="0"
            max={product.availableQuantity}
            step="1"
            className="px-2 py-1 border border-gray-300 rounded text-xs sm:text-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent"
          />

          <input
            type="number"
            placeholder={`${product.pricePerKg.toFixed(0)}`}
            value={customPrice}
            onChange={(e) => setCustomPrice(e.target.value)}
            min="0"
            step="0.01"
            className="px-2 py-1 border border-gray-300 rounded text-xs sm:text-sm focus:ring-1 focus:ring-blue-500 focus:border-transparent"
          />

          <button
            onClick={handleAdd}
            disabled={
              !bagQuantity ||
              parseInt(bagQuantity) <= 0 ||
              parseInt(bagQuantity) > product.availableQuantity
            }
            className="bg-blue-600 text-white px-2 py-1 rounded text-xs sm:text-sm hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
};

// Cart Item Component
const CartItem = ({
  product,
  onUpdateQuantity,
  onUpdatePrice,
  onRemove,
  formatCurrency,
}) => {
  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-white">
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <h5 className="font-medium text-gray-900 text-xs sm:text-sm">
            {product.displayName}
          </h5>
          {product.batchNumber && (
            <p className="text-xs text-gray-500">
              Batch: {product.batchNumber}
            </p>
          )}
        </div>

        <button
          onClick={() => onRemove(product.id)}
          className="text-red-500 hover:text-red-700 transition-colors ml-2"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
        <div>
          <label className="block text-xs text-gray-600 mb-1">
            Quantity (bags)
          </label>
          <div className="flex items-center gap-1">
            <button
              onClick={() =>
                onUpdateQuantity(
                  product.id,
                  Math.max(0, product.bagQuantity - 1)
                )
              }
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 w-6 h-6 rounded flex items-center justify-center text-sm shrink-0"
            >
              <Minus className="w-3 h-3" />
            </button>
            <input
              type="number"
              value={product.bagQuantity}
              onChange={(e) =>
                onUpdateQuantity(product.id, parseInt(e.target.value) || 0)
              }
              min="0"
              max={product.availableQuantity}
              step="1"
              className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs text-center focus:ring-1 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={() =>
                onUpdateQuantity(
                  product.id,
                  Math.min(product.availableQuantity, product.bagQuantity + 1)
                )
              }
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 w-6 h-6 rounded flex items-center justify-center text-sm shrink-0"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {(product.bagQuantity * product.bagSize).toFixed(1)} kg
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-600 mb-1">Price/kg</label>
          <div className="flex items-center gap-1">
            <DollarSign className="w-3 h-3 text-gray-400 shrink-0" />
            <input
              type="number"
              value={product.pricePerKg}
              onChange={(e) =>
                onUpdatePrice(product.id, parseFloat(e.target.value) || 0)
              }
              min="0"
              step="0.01"
              className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center pt-2 border-t border-gray-100">
        <span className="text-xs text-gray-600">Subtotal:</span>
        <span className="font-semibold text-gray-900 text-xs sm:text-sm">
          {formatCurrency(product.total)}
        </span>
      </div>
    </div>
  );
};

export default WalkInSale;
