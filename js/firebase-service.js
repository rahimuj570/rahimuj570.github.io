import { initializeApp } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Cache Helpers using localStorage
function getCache(key) {
  try {
    const data = localStorage.getItem(`portfolio_cache_${key}`);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error("Cache read error:", e);
    return null;
  }
}

function setCache(key, value) {
  try {
    localStorage.setItem(`portfolio_cache_${key}`, JSON.stringify(value));
  } catch (e) {
    console.error("Cache write error:", e);
  }
}

/**
 * Fetch a collection, filter by visibility, sort by order field, and cache locally.
 * Client-side sorting and filtering are used to prevent Firestore "Missing Index" exceptions.
 */
export async function fetchCollection(collectionName, orderField = 'order', sortDir = 'asc') {
  try {
    const colRef = collection(db, collectionName);
    const snapshot = await getDocs(colRef);
    const results = [];
    
    snapshot.forEach(doc => {
      results.push({ id: doc.id, ...doc.data() });
    });
    
    if (results.length === 0) {
      console.log(`Firestore collection '${collectionName}' is empty or does not exist. Using cache or fallback.`);
      const cached = getCache(collectionName);
      return cached || [];
    }

    // Filter out items explicitly set as hidden
    const visibleItems = results.filter(item => item.visible !== false);
    
    // Sort by order field
    visibleItems.sort((a, b) => {
      const valA = a[orderField] !== undefined ? a[orderField] : 999;
      const valB = b[orderField] !== undefined ? b[orderField] : 999;
      
      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      return sortDir === 'asc' ? valA - valB : valB - valA;
    });

    setCache(collectionName, visibleItems);
    return visibleItems;
  } catch (error) {
    console.warn(`Firestore read failed for collection ${collectionName}:`, error.message || error);
    const cached = getCache(collectionName);
    return cached || [];
  }
}

/**
 * Fetch a single config or profile document from a collection.
 */
export async function fetchDocument(collectionName) {
  try {
    const colRef = collection(db, collectionName);
    const snapshot = await getDocs(colRef);
    const results = [];
    
    snapshot.forEach(doc => {
      results.push({ id: doc.id, ...doc.data() });
    });
    
    if (results.length > 0) {
      // Typically, config or profile collection has only one document.
      const docData = results[0];
      setCache(collectionName, docData);
      return docData;
    }
    
    console.log(`Firestore collection '${collectionName}' is empty or does not exist. Using cache or fallback.`);
    const cached = getCache(collectionName);
    return cached || null;
  } catch (error) {
    console.warn(`Firestore read failed for document ${collectionName}:`, error.message || error);
    const cached = getCache(collectionName);
    return cached || null;
  }
}
