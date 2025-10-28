// Mock data for IShowSpeed prototype testing
// This file provides preset search results for testing
// When enabled, it blocks ALL external API calls and runs completely locally

// Add mock data method to SearchController
if (typeof SearchController !== 'undefined') {
  SearchController.getMockData = function() {
    return [
      {
        filename: "[P001]Episode 1 - Amazing Moments.json",
        text: "This is an incredible moment from the stream",
        timestamp: "5m42s",
        match_ratio: 95.5,
        similarity: 0.92,
        image: "images/40807036-e3yau77h-v4.webp"
      },
      {
        filename: "[P001]Episode 1 - Amazing Moments.json",
        text: "Watch this highlight from the gameplay",
        timestamp: "12m15s",
        match_ratio: 88.3,
        similarity: 0.85,
        image: "images/624ffeed6a28b000182ecc8d.webp"
      },
      {
        filename: "[P002]Episode 2 - Highlights.json",
        text: "One of the best moments in this episode",
        timestamp: "3m30s",
        match_ratio: 91.2,
        similarity: 0.88,
        image: "images/maxresdefault.jpg"
      },
      {
        filename: "[P002]Episode 2 - Highlights.json",
        text: "Epic fail that made everyone laugh",
        timestamp: "18m45s",
        match_ratio: 87.6,
        similarity: 0.83,
        image: "images/67edf6f7e4b02ecf7507c947.jpg"
      },
      {
        filename: "[P003]Episode 3 - Reactions.json",
        text: "Perfect reaction captured here",
        timestamp: "7m20s",
        match_ratio: 92.1,
        similarity: 0.90,
        image: "images/67edf260e4b02ecf7507c933.jpg"
      },
      {
        filename: "[P003]Episode 3 - Reactions.json",
        text: "Unexpected twist that shocked everyone",
        timestamp: "25m10s",
        match_ratio: 89.7,
        similarity: 0.87,
        image: "images/ishowspeed-in-china-1024x576.webp"
      }
    ];
  };
}

// Override performSearch to block external API calls when mock data is enabled
const originalPerformSearch = SearchController.performSearch;
SearchController.performSearch = async function(query, minRatio, minSimilarity) {
  // When mock data is enabled, block ALL external API calls
  if (CONFIG.useMockData) {
    console.log("Mock data mode ENABLED - No external API calls will be made");
    
    // If query matches the mock keyword, return mock data
    if (query.toLowerCase() === CONFIG.mockSearchKeyword.toLowerCase()) {
      console.log("Mock data triggered: Search for '" + CONFIG.mockSearchKeyword + "' returned 6 results");
      return {
        status: "success",
        data: SearchController.getMockData(),
        count: SearchController.getMockData().length,
      };
    } else {
      // For any other search, return no results (local mode only)
      console.log("Search for '" + query + "' returned no results (only '" + CONFIG.mockSearchKeyword + "' has mock data)");
      return {
        status: "success",
        data: [
          {
            count: 0,
            message: "No results found - Running in LOCAL MOCK DATA mode",
            suggestions: [
              "Try searching for '" + CONFIG.mockSearchKeyword + "' to see mock results",
          
            ]
          }
        ],
        count: 0
      };
    }
  }
  
  // If mock data is disabled, use the original API implementation
  console.log("Mock data mode DISABLED - Using real API");
  return originalPerformSearch.call(this, query, minRatio, minSimilarity);
};
