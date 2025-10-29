"use strict";
let mapping = {};

// Local storage helpers - minimal version without external fetches
const dbStorage = {
  dbName: "SearchCache",
  dbVersion: 1,
  async init() {
    if (this._dbPromise) return this._dbPromise;
    this._dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      request.onerror = (event) => reject(event.target.error);
      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains("indices"))
          db.createObjectStore("indices", { keyPath: "key" });
        if (!db.objectStoreNames.contains("mappings"))
          db.createObjectStore("mappings", { keyPath: "key" });
        if (!db.objectStoreNames.contains("databases"))
          db.createObjectStore("databases", { keyPath: "key" });
      };
    });
    return this._dbPromise;
  },
  async getItem(storeName, key) {
    try {
      await this.init();
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(storeName, "readonly");
        const store = transaction.objectStore(storeName);
        const request = store.get(key);
        request.onsuccess = () => {
          resolve(request.result ? request.result.value : null);
        };
        request.onerror = (event) => {
          reject(event.target.error);
        };
      });
    } catch (error) {
      return null;
    }
  },
  async setItem(storeName, key, value) {
    try {
      await this.init();
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(storeName, "readwrite");
        const store = transaction.objectStore(storeName);
        const request = store.put({ key, value });
        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(event.target.error);
      });
    } catch (error) {
      throw error;
    }
  },
  async removeItem(storeName, key) {
    try {
      await this.init();
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(storeName, "readwrite");
        const store = transaction.objectStore(storeName);
        const request = store.delete(key);
        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(event.target.error);
      });
    } catch (error) {
      throw error;
    }
  },
  async getAllKeys(storeName) {
    try {
      await this.init();
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(storeName, "readonly");
        const store = transaction.objectStore(storeName);
        const request = store.getAllKeys();
        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject(event.target.error);
      });
    } catch (error) {
      return [];
    }
  },
};

// Application state
const AppState = {
  isSearching: false,
  randomStringDisplayed: false,
  searchResults: [],
  currentPage: 1,
  itemsPerPage: 20,
  hasMoreResults: true,
  cachedResults: [],
  displayedCount: 0,
  dbLoaded: false,
  dbLoading: false,
};

// Configuration - MOCK MODE ONLY
const CONFIG = {
  randomStrings: [
    "Searching the IShowSpeed archive",
    "Find what you're looking for",
    "Powered by local mock data",
  ],
  useMockData: true,
  mockSearchKeyword: "test"
};

// UI Controller
class UIController {
  static updateSearchFormPosition(isSearching) {
    const searchForm = document.getElementById("searchForm");
    const randomStringDisplay = document.getElementById("randomStringDisplay");
    if (isSearching) {
      searchForm.classList.add("searching");
      if (!AppState.randomStringDisplayed) this.showRandomString();
    } else {
      searchForm.classList.remove("searching");
      this.clearRandomString();
    }
  }
  static showRandomString() {
    if (!AppState.randomStringDisplayed) {
      const randomStringDisplay = document.getElementById("randomStringDisplay");
      const randomIndex = Math.floor(Math.random() * CONFIG.randomStrings.length);
      randomStringDisplay.textContent = CONFIG.randomStrings[randomIndex];
      AppState.randomStringDisplayed = true;
      randomStringDisplay.classList.remove("fade-out");
      randomStringDisplay.classList.add("fade-in");
    }
  }
  static clearRandomString() {
    const randomStringDisplay = document.getElementById("randomStringDisplay");
    randomStringDisplay.classList.remove("fade-in");
    randomStringDisplay.classList.add("fade-out");
    setTimeout(() => {
      randomStringDisplay.textContent = "";
      AppState.randomStringDisplayed = false;
    }, 300);
  }
}

// Search Controller - relies on mock_data.js to intercept
class SearchController {
  static validateSearchInput(query) {
    return query && query.trim().length > 0;
  }

  static async performSearch(query, minRatio, minSimilarity) {
    // This method is overridden by mock_data.js
    // In local mode, all searches go through mock_data.js
    console.log("Search attempted (should be intercepted by mock_data.js):", query);
    throw new Error("Search not intercepted - mock_data.js not loaded");
  }
}

// Handle search
async function handleSearch(event) {
  event.preventDefault();
  const query = document.getElementById("query").value.trim();
  if (!query) return;
  const minRatio = parseInt(document.getElementById("minRatio").value) || 50;
  const minSimilarity = parseFloat(document.getElementById("minSimilarity").value) || 0;
  const searchForm = document.getElementById("searchForm");
  searchForm.classList.add("searching");
  startNaturalLoadingBar();

  try {
    const results = await SearchController.performSearch(query, minRatio, minSimilarity);

    if (results && results.status === "success") {
      AppState.cachedResults = results.data;
      AppState.hasMoreResults = results.data.length > AppState.itemsPerPage;
      AppState.displayedCount = 0;

      displayResults(results);
      completeLoadingBar();
    } else {
      throw new Error("Invalid search results format");
    }
  } catch (error) {
    console.error("Search error:", error);
    document.getElementById("errorDisplay").textContent = `Search failed: ${error.message}`;
    document.getElementById("errorDisplay").style.display = "block";
    completeLoadingBar();
  } finally {
    enableKeywordTags();
    searchForm.classList.remove("searching");
  }
}

// Initialize app
async function initializeApp() {
  try {
    await dbStorage.init().catch((error) => {});
    console.log("App initialized in LOCAL MOCK MODE - no external fetches");
    initializeScrollListener();

    document.getElementById("searchForm").addEventListener("submit", async (e) => {
      e.preventDefault();
      if (AppState.isSearching) return;
      AppState.isSearching = true;
      try {
        await handleSearch(e);
      } finally {
        AppState.isSearching = false;
      }
    });

    document.getElementById("query").addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (AppState.isSearching) return;
        document.getElementById("searchForm").dispatchEvent(new Event("submit"));
      }
    });

    document.getElementById("refreshDiv").addEventListener("click", function () {
      location.reload();
    });

    document.getElementById("semanticToggle").addEventListener("click", function () {
      this.classList.toggle("active");
    });
  } catch (error) {
    console.error("Initialization error:", error);
  }
}

// DOM Content Loaded
document.addEventListener("DOMContentLoaded", () => {
  const loadingBar = document.getElementById("loadingBar");
  if (loadingBar) {
    loadingBar.style.width = "0%";
    loadingBar.style.display = "none";
  }
  initializeApp();

  const toggleButton = document.getElementById("toggleAdvancedOptions");
  const advancedOptions = document.getElementById("advancedOptions");
  toggleButton.addEventListener("click", () => {
    const isExpanded = advancedOptions.classList.contains("show");
    if (!isExpanded) {
      advancedOptions.style.transition = "none";
      advancedOptions.classList.add("show");
      const height = advancedOptions.scrollHeight;
      advancedOptions.classList.remove("show");
      void advancedOptions.offsetHeight;
      advancedOptions.style.transition = "";
      advancedOptions.style.maxHeight = height + "px";
      advancedOptions.classList.add("show");
    } else {
      advancedOptions.style.maxHeight = "0";
      advancedOptions.classList.remove("show");
    }
    toggleButton.classList.toggle("active");
    toggleButton.setAttribute("aria-expanded", !isExpanded);
  });

  const semanticToggle = document.getElementById("semanticToggle");
  const semanticTooltip = document.getElementById("semanticTooltip");

  semanticToggle.addEventListener("mouseenter", () => {
    semanticTooltip.classList.add("visible");
  });

  semanticToggle.addEventListener("mouseleave", () => {
    semanticTooltip.classList.remove("visible");
  });
});

// Display results
function displayResults(data, append = false) {
  const resultsDiv = document.getElementById("results");
  const keywordsContainer = document.getElementById("keywordsContainer");

  document.getElementById("errorDisplay").style.display = "none";

  if (!append) {
    resultsDiv.innerHTML = "";
    AppState.displayedCount = 0;
    keywordsContainer.innerHTML = "";
    keywordsContainer.classList.remove("show");
  }

  if (data.data && data.data.length === 1 && data.data[0].count === 0) {
    const noResultData = data.data[0];
    if (!append) {
      const message = noResultData.message || `No results found for "${document.getElementById("query").value.trim()}"`;
      const suggestions = noResultData.suggestions || [
        "Check your input",
        `Try lowering the minimum match rate (current: ${document.getElementById("minRatio").value}%)`,
        `Try lowering the minimum similarity (current: ${document.getElementById("minSimilarity").value})`,
        "Try using a shorter keyword",
      ];

      resultsDiv.innerHTML = `
        <div class="error-message">
          <h3>${message}</h3>
          <p>Suggestions:</p>
          <ul>
            ${suggestions.map((suggestion) => `<li>${suggestion}</li>`).join("")}
          </ul>
        </div>`;
    }
    AppState.hasMoreResults = false;
    return;
  }

  const fragment = document.createDocumentFragment();
  const startIndex = AppState.displayedCount;
  const endIndex = Math.min(startIndex + AppState.itemsPerPage, data.data.length);
  const newResults = data.data.slice(startIndex, endIndex);

  AppState.hasMoreResults = endIndex < data.data.length;

  const cards = newResults
    .map((result) => {
      if (!result || typeof result !== "object") return null;
      const card = document.createElement("div");
      card.className = "result-card";
      card.addEventListener("click", (e) => handleCardClick(e, result));
      card.style.cursor = "pointer";

      const episodeMatch = result.filename ? result.filename.match(/\[P(\d+)\]/) : null;
      const timeMatch = result.timestamp ? result.timestamp.match(/^(\d+)m(\d+)s$/) : null;
      const cleanFilename = result.filename
        ? result.filename.replace(/\[P(\d+)\].*?\s+/, "P$1 ").replace(/\.json$/, "").trim()
        : "";

      const cardContent = `
        <div class="result-content">
          ${result.image ? `<div class="result-image" data-image="${result.image}"><img src="${result.image}" alt="Result thumbnail" onerror="this.style.display='none'"></div>` : ""}
          <h3>${episodeMatch ? `<span class="tag">${episodeMatch[1]}</span>${cleanFilename.replace(/P\d+/, "").trim()}` : cleanFilename}</h3>
          <p class="result-text">${result.text || ""}</p>
          ${
            result.timestamp
              ? `<p class="result-meta">
                  ${result.timestamp} · Match rate ${result.match_ratio ? parseFloat(result.match_ratio).toFixed(1) : 0}%
                </p>`
              : ""
          }
        </div>
      `;

      card.innerHTML = cardContent;
      return card;
    })
    .filter(Boolean);

  cards.forEach((card) => fragment.appendChild(card));
  resultsDiv.appendChild(fragment);

  AppState.displayedCount = endIndex;

  if (AppState.hasMoreResults) {
    let trigger = document.getElementById("scroll-trigger");
    if (!trigger) {
      trigger = document.createElement("div");
      trigger.id = "scroll-trigger";
      trigger.style.cssText = "height: 20px; margin: 20px 0;";

      if (window.currentObserver) {
        window.currentObserver.observe(trigger);
      }
    }
    resultsDiv.appendChild(trigger);
  }
}

// Handle card click
function handleCardClick(event, result) {
  // Check if user clicked on the image or its container
  const imageContainer = event.target.closest('.result-image');
  
  if (imageContainer) {
    // User clicked on image - show modal with larger view
    event.stopPropagation();
    const imageSrc = imageContainer.dataset.image;
    if (imageSrc) {
      openImageModal(imageSrc, result.text);
    }
    return;
  }
  
  // User clicked elsewhere on card - open video link
  const episodeMatch = result.filename.match(/\[P(\d+)\]/);
  const timeMatch = result.timestamp.match(/^(\d+)m(\d+)s$/);
  if (episodeMatch && timeMatch) {
    const episodeNum = parseInt(episodeMatch[1], 10);
    const minutes = parseInt(timeMatch[1]);
    const seconds = parseInt(timeMatch[2]);
    const totalSeconds = minutes * 60 + seconds;
    for (const [url, filename] of Object.entries(mapping)) {
      if (filename === result.filename) {
        const videoUrl = `https://www.bilibili.com${url}?t=${totalSeconds}`;
        window.open(videoUrl, "_blank");
        break;
      }
    }
  }
}

// Image modal functions
function openImageModal(imageSrc, caption) {
  // Create modal if it doesn't exist
  let modal = document.getElementById('imageModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'imageModal';
    modal.className = 'image-modal';
    modal.innerHTML = `
      <div class="image-modal-overlay"></div>
      <div class="image-modal-content">
        <button class="image-modal-close" aria-label="Close modal">&times;</button>
        <img class="image-modal-img" src="" alt="Full size view">
        <div class="image-modal-caption"></div>
      </div>
    `;
    document.body.appendChild(modal);
    
    // Close modal when clicking overlay or close button
    modal.querySelector('.image-modal-overlay').addEventListener('click', closeImageModal);
    modal.querySelector('.image-modal-close').addEventListener('click', closeImageModal);
    
    // Close modal on ESC key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('active')) {
        closeImageModal();
      }
    });
  }
  
  // Set image and caption
  modal.querySelector('.image-modal-img').src = imageSrc;
  modal.querySelector('.image-modal-caption').textContent = caption || '';
  
  // Show modal
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeImageModal() {
  const modal = document.getElementById('imageModal');
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// Loading bar functions
function startNaturalLoadingBar() {
  const loadingBar = document.getElementById("loadingBar");
  loadingBar.style.transition = "";
  loadingBar.style.width = "0%";
  loadingBar.style.display = "block";
  if (loadingBar.interval) clearInterval(loadingBar.interval);
  let progress = 0;
  const targetProgress = 95;
  let speed = 0.5;
  loadingBar.interval = setInterval(() => {
    if (progress < 30) speed = 0.8;
    else if (progress < 60) speed = 0.4;
    else if (progress < 80) speed = 0.2;
    else speed = 0.1;
    progress += speed;
    if (progress >= targetProgress) {
      clearInterval(loadingBar.interval);
      progress = targetProgress;
    }
    loadingBar.style.width = `${progress}%`;
  }, 50);
}

function completeLoadingBar() {
  const loadingBar = document.getElementById("loadingBar");
  clearInterval(loadingBar.interval);
  loadingBar.style.transition = "width 0.3s ease-out";
  loadingBar.style.width = "100%";
}

// Initialize scroll listener
function initializeScrollListener() {
  if (window.currentObserver) window.currentObserver.disconnect();

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && AppState.hasMoreResults && !AppState.isSearching) {
          if (AppState.cachedResults.length > AppState.displayedCount) {
            displayResults(
              {
                status: "success",
                data: AppState.cachedResults,
                count: AppState.cachedResults.length,
              },
              true,
            );
          }
        }
      });
    },
    { root: null, rootMargin: "200px", threshold: 0.1 },
  );

  window.currentObserver = observer;

  const oldTrigger = document.getElementById("scroll-trigger");
  if (oldTrigger) oldTrigger.remove();

  const trigger = document.createElement("div");
  trigger.id = "scroll-trigger";
  trigger.style.cssText = "height: 20px; margin: 20px 0;";
  document.getElementById("results").appendChild(trigger);

  observer.observe(trigger);
}

// Enable keyword tags
function enableKeywordTags() {
  const keywordsContainer = document.getElementById("keywordsContainer");
  keywordsContainer.querySelectorAll('.keyword-tag').forEach(tag => {
    tag.classList.remove('disabled');
  });
}

console.log("Script.js loaded - LOCAL MOCK MODE ONLY - Zero external network calls");
