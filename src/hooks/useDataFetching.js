// src/hooks/useDataFetching.js
import { useState, useEffect } from "react";
import { db } from "../services/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  doc,
  getDoc,
} from "firebase/firestore";
import { toast } from "react-hot-toast";

export const useDataFetching = (
  currentUser,
  currentBusiness,
  sortField,
  sortDirection
) => {
  const [batches, setBatches] = useState([]);
  const [stockTotals, setStockTotals] = useState({});
  const [baggedInventory, setBaggedInventory] = useState({});
  const [baggedStocks, setBaggedStocks] = useState({});
  const [bagSizes, setBagSizes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all data
  const fetchAllData = async () => {
    if (!currentBusiness?.id || !currentUser?.uid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await fetchProcessedBatches();
      await new Promise((resolve) => setTimeout(resolve, 100));
      await Promise.all([
        fetchStockTotals(),
        fetchBaggedInventory(),
        fetchBagSizes(),
      ]);
      setTimeout(() => {
        fetchBaggedStocks();
      }, 200);
    } catch (error) {
      console.error("Error fetching data:", error);
      setError(`Failed to load data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch processed batches
  const fetchProcessedBatches = async () => {
    try {
      const batchesQuery = query(
        collection(
          db,
          `owners/${currentUser.uid}/businesses/${currentBusiness.id}/stock/processedStock/stock`
        ),
        where("status", "==", "available"),
        orderBy(sortField, sortDirection)
      );

      const querySnapshot = await getDocs(batchesQuery);
      const batchesList = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        batchesList.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          processedAt: data.processedAt?.toDate() || new Date(),
        });
      });

      setBatches(batchesList);
    } catch (error) {
      console.error("Error fetching processed batches:", error);
      setError(`Failed to load processed batches: ${error.message}`);
      toast.error(`Failed to load processed batches: ${error.message}`);
    }
  };

  // Fetch bagged stocks
  const fetchBaggedStocks = async () => {
    try {
      const collectionPath = `owners/${currentUser.uid}/businesses/${currentBusiness.id}/stock/baggedStock/stock`;

      const baggedStockQuery = query(
        collection(db, collectionPath),
        where("status", "==", "available"),
        orderBy("createdAt", "desc")
      );

      const querySnapshot = await getDocs(baggedStockQuery);
      const baggedStocksData = {};

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const bagData = {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        };

        // Group by product type for display
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

      setBaggedStocks(baggedStocksData);
    } catch (error) {
      console.error("Error fetching bagged stocks:", error);
      toast.error(`Failed to load bagged stocks: ${error.message}`);
    }
  };

  // Fetch stock totals
  const fetchStockTotals = async () => {
    try {
      const stockTotalsDoc = await getDoc(
        doc(
          db,
          `owners/${currentUser.uid}/businesses/${currentBusiness.id}/stock/stockTotals`
        )
      );

      if (stockTotalsDoc.exists()) {
        setStockTotals(stockTotalsDoc.data());
      } else {
        setStockTotals({});
      }
    } catch (error) {
      console.error("Error fetching stock totals:", error);
      setStockTotals({});
    }
  };

  // Fetch bagged inventory
  const fetchBaggedInventory = async () => {
    try {
      const baggedInventoryDoc = await getDoc(
        doc(
          db,
          `owners/${currentUser.uid}/businesses/${currentBusiness.id}/inventory/baggedInventory`
        )
      );

      if (baggedInventoryDoc.exists()) {
        setBaggedInventory(baggedInventoryDoc.data());
      } else {
        setBaggedInventory({});
      }
    } catch (error) {
      console.error("Error fetching bagged inventory:", error);
      setBaggedInventory({});
    }
  };

  // Fetch bag sizes
  const fetchBagSizes = async () => {
    try {
      const bagSizesDoc = await getDoc(
        doc(
          db,
          `owners/${currentUser.uid}/businesses/${currentBusiness.id}/settings/bagSizes`
        )
      );

      if (bagSizesDoc.exists()) {
        setBagSizes(bagSizesDoc.data().sizes || []);
      } else {
        setBagSizes([]);
      }
    } catch (error) {
      console.error("Error fetching bag sizes:", error);
      setBagSizes([]);
    }
  };

  // Fetch data when dependencies change
  useEffect(() => {
    if (currentBusiness?.id && currentUser?.uid) {
      fetchAllData();
    } else {
      setLoading(false);
    }
  }, [currentBusiness?.id, currentUser?.uid, sortField, sortDirection]);

  // Fetch bagged stocks when batches change
  useEffect(() => {
    if (batches.length > 0 && currentBusiness?.id && currentUser?.uid) {
      fetchBaggedStocks();
    }
  }, [batches.length, currentBusiness?.id, currentUser?.uid]);

  return {
    batches,
    stockTotals,
    baggedInventory,
    baggedStocks,
    bagSizes,
    loading,
    error,
    fetchAllData,
    setBagSizes,
  };
};
