/**
 * Calculate Levenshtein distance between two strings
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} - Levenshtein distance
 */
function levenshteinDistance(str1, str2) {
  const len1 = str1.length;
  const len2 = str2.length;
  
  // Create a matrix
  const matrix = Array(len1 + 1)
    .fill(null)
    .map(() => Array(len2 + 1).fill(null));
  
  // Initialize first row and column
  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;
  
  // Fill the matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  
  return matrix[len1][len2];
}

/**
 * Calculate similarity percentage between two strings (0-100)
 * Uses Levenshtein distance normalized by the maximum length
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} - Similarity percentage (0-100)
 */
export function calculateSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  // If strings are identical, return 100%
  if (s1 === s2) return 100;
  
  // Calculate Levenshtein distance
  const distance = levenshteinDistance(s1, s2);
  
  // Get maximum length
  const maxLength = Math.max(s1.length, s2.length);
  
  if (maxLength === 0) return 100;
  
  // Calculate similarity: (1 - distance/maxLength) * 100
  const similarity = ((maxLength - distance) / maxLength) * 100;
  
  return Math.max(0, Math.min(100, similarity)); // Clamp between 0 and 100
}

/**
 * Find the best matching recipe from a list based on similarity
 * @param {string} searchTerm - The search term to match against
 * @param {Array} recipes - Array of recipe objects with a 'name' property
 * @param {number} threshold - Minimum similarity threshold (0-100), default 95
 * @returns {Object|null} - Best match with similarity score, or null if no match above threshold
 */
export function findBestMatch(searchTerm, recipes, threshold = 95) {
  if (!searchTerm || !recipes || recipes.length === 0) return null;
  
  let bestMatch = null;
  let bestSimilarity = 0;
  
  for (const recipe of recipes) {
    if (!recipe.name) continue;
    
    const similarity = calculateSimilarity(searchTerm, recipe.name);
    
    if (similarity >= threshold && similarity > bestSimilarity) {
      bestSimilarity = similarity;
      bestMatch = {
        recipe,
        similarity: bestSimilarity,
      };
    }
  }
  
  return bestMatch;
}

/**
 * Filter and sort recipes by similarity to search term
 * @param {string} searchTerm - The search term to match against
 * @param {Array} recipes - Array of recipe objects with a 'name' property
 * @param {number} minSimilarity - Minimum similarity to include (0-100), default 0
 * @returns {Array} - Array of recipes with similarity scores, sorted by similarity (descending)
 */
export function filterAndSortBySimilarity(searchTerm, recipes, minSimilarity = 0) {
  if (!searchTerm || !recipes || recipes.length === 0) return [];
  
  const withSimilarity = recipes
    .map(recipe => ({
      recipe,
      similarity: calculateSimilarity(searchTerm, recipe.name || ''),
    }))
    .filter(item => item.similarity >= minSimilarity)
    .sort((a, b) => b.similarity - a.similarity);
  
  return withSimilarity;
}


