// Mock data for IShowSpeed prototype testing
// This file provides preset search results for testing
// When enabled, it blocks ALL external API calls and runs completely locally

// Add mock data method to SearchController
if (typeof SearchController !== 'undefined') {
  SearchController.getMockData = function() {
    return [
      // New keyword-specific entries with custom images
      {
        filename: "[P001]Episode 1.json",
        text: "You're the first dude who recognized me, bro",
        timestamp: "2m18s",
        match_ratio: 96.5,
        similarity: 0.94,
        image: "images/e1sh-firsttorecognize.png"
      },
      {
        filename: "[P002]Episode 2.json",
        text: "We are about to go to one of the most accurate best places in China, chat",
        timestamp: "8m42s",
        match_ratio: 94.8,
        similarity: 0.91,
        image: "images/e2bj-bestplaceinchina.png"
      },
      {
        filename: "[P003]Episode 3.json",
        text: "Tell master shane I would like to do what he did on me",
        timestamp: "14m05s",
        match_ratio: 93.2,
        similarity: 0.89,
        image: "images/e3hn-mastershen.png"
      },
      {
        filename: "[P004]Episode 4.json",
        text: "We can improve your appetite even better",
        timestamp: "6m33s",
        match_ratio: 95.1,
        similarity: 0.93,
        image: "images/e4cd-bonappetite.png"
      },
      {
        filename: "[P005]Episode 5.json",
        text: "Oh you're talking about that track in Germany",
        timestamp: "11m27s",
        match_ratio: 92.8,
        similarity: 0.88,
        image: "images/e5cq-thattrackingermany.png"
      },
      {
        filename: "[P006]Episode 6.json",
        text: "We are finally riding the infamous Ronaldo bus",
        timestamp: "4m51s",
        match_ratio: 94.3,
        similarity: 0.90,
        image: "images/e6hk-ronaldobus.png"
      },
      // Original test entries
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
    
    const queryLower = query.toLowerCase().trim();
    const allData = SearchController.getMockData();
    
    // Search through mock data for keyword matches
    const matchedResults = allData.filter(item => {
      const textLower = item.text.toLowerCase();
      // Check if any word from the query appears in the text
      const queryWords = queryLower.split(/\s+/);
      const matchCount = queryWords.filter(word => textLower.includes(word)).length;
      
      // Return true if at least one keyword matches
      return matchCount > 0 || textLower.includes(queryLower);
    }).map(item => {
      // Calculate match ratio based on keyword overlap
      const textLower = item.text.toLowerCase();
      const queryWords = queryLower.split(/\s+/);
      const matchCount = queryWords.filter(word => textLower.includes(word)).length;
      const matchPercentage = (matchCount / queryWords.length) * 100;
      
      // Calculate character-level match for more accuracy
      let totalQueryChars = queryLower.replace(/\s+/g, '').length;
      let matchedChars = 0;
      queryWords.forEach(word => {
        if (textLower.includes(word)) {
          matchedChars += word.length;
        }
      });
      const charMatchPercentage = totalQueryChars > 0 ? (matchedChars / totalQueryChars) * 100 : 0;
      
      // Combine word-level and character-level matching
      const finalMatchRatio = Math.round((matchPercentage * 0.6 + charMatchPercentage * 0.4) * 10) / 10;
      
      return {
        ...item,
        match_ratio: Math.max(finalMatchRatio, 50) // Minimum 50% if there's any match
      };
    }).filter(item => {
      // Apply the minRatio and minSimilarity filters
      return item.match_ratio >= minRatio && item.similarity >= minSimilarity;
    }).sort((a, b) => b.match_ratio - a.match_ratio);
    
    // If we have matches, return them
    if (matchedResults.length > 0) {
      console.log(`Mock data triggered: Search for '${query}' returned ${matchedResults.length} results`);
      return {
        status: "success",
        data: matchedResults,
        count: matchedResults.length,
      };
    }
    
    // For "test" keyword, return all mock data (backward compatibility)
    if (queryLower === CONFIG.mockSearchKeyword.toLowerCase()) {
      console.log("Mock data triggered: Search for '" + CONFIG.mockSearchKeyword + "' returned all results");
      return {
        status: "success",
        data: allData,
        count: allData.length,
      };
    }
    
    // No matches found
    console.log("Search for '" + query + "' returned no results");
    return {
      status: "success",
      data: [
        {
          count: 0,
          message: "No results found - Running in LOCAL MOCK DATA mode",
          suggestions: [
            "Try searching for keywords like: 'recognized', 'best places', 'master shane', 'appetite', 'Germany', 'Ronaldo bus'",
            "Or search for '" + CONFIG.mockSearchKeyword + "' to see all mock results",
          ]
        }
      ],
      count: 0
    };
  }
  
  // If mock data is disabled, use the original API implementation
  console.log("Mock data mode DISABLED - Using real API");
  return originalPerformSearch.call(this, query, minRatio, minSimilarity);
};
