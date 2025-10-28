'use strict'; function lcsRatio(str1, str2) { str1 = str1.toLowerCase(); str2 = str2.toLowerCase(); if (!str1 || !str2) return 0; const m = str1.length; const n = str2.length; const dp = Array(m + 1).fill().map(() => Array(n + 1).fill(0)); for (let i = 1; i <= m; i++)for (let j = 1; j <= n; j++)if (str1[i - 1] === str2[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1; else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]); return dp[m][n] / m * 100 }
function multiWordLcsRatio(queryWords, text) {
    text = text.toLowerCase(); const totalQueryLength = queryWords.reduce((sum, word) => sum + word.length, 0); const usedChars = (new Array(text.length)).fill(false); let totalMatched = 0; for (const word of queryWords) {
        const wordLower = word.toLowerCase(); let foundMatch = false; let startPos = 0; while (true) {
            const pos = text.indexOf(wordLower, startPos); if (pos === -1) break; const endPos = pos + wordLower.length; let canUse = true; for (let i = pos; i < endPos; i++)if (usedChars[i]) { canUse = false; break } if (canUse) {
                for (let i =
                    pos; i < endPos; i++)usedChars[i] = true; totalMatched += wordLower.length; foundMatch = true; break
            } startPos = pos + 1
        }
    } return totalMatched / totalQueryLength * 100
}
self.onmessage = function (e) {
    const { db, queryWords, minRatio } = e.data; 
    
    try {
        const results = db.map(item => { 
            const matchRatio = multiWordLcsRatio(queryWords, item.x); 
            return { 
                matchRatio, 
                item, 
                exactMatch: queryWords.every(word => item.x.toLowerCase().includes(word)) 
            }; 
        }).filter(result => result.matchRatio >= minRatio); 
        
        results.sort((a, b) => { 
            if (b.matchRatio !== a.matchRatio) return b.matchRatio - a.matchRatio; 
            return b.exactMatch - a.exactMatch 
        }); 
        
        const apiResults = results.map(result => ({
            filename: result.item.f, 
            timestamp: result.item.t, 
            similarity: result.item.s,
            text: result.item.x, 
            match_ratio: result.matchRatio, 
            exact_match: result.exactMatch
        })); 

        if (apiResults.length === 0) {
            self.postMessage({
                status: "success",
                data: [{  // Wrapped in an array
                    status: "success",
                    data: [],
                    count: 0,
                    folder: "subtitle",
                    max_results: "unlimited",
                    message: `No results found for '${queryWords.join(" ")}'`,
                    suggestions: [
                        "Check your input",
                        `Try lowering the minimum match rate (current: ${minRatio}%)`,
                        "Try lowering the minimum similarity",
                        "Try using a shorter keyword"
                    ]
                }],
                count: 1  // Array length is 1
            });
            return;
        }

        self.postMessage({ 
            status: "success", 
            data: apiResults, 
            count: apiResults.length 
        });
    } catch (error) {
        self.postMessage({
            status: "error",
            message: error.message || "Error occurred during search processing",
            data: [],
            count: 0,
            suggestions: ["Please try again"]
        });
    }
};