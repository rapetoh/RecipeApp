/**
 * Extract base ingredient name from descriptive text
 * Examples: "garlic cloves, minced" → "garlic", "chicken breast, boneless" → "chicken"
 * @param {string} ingredientName - The full ingredient name
 * @returns {string} Base ingredient name
 */
function extractBaseIngredient(ingredientName) {
  if (!ingredientName) return "";
  
  let name = ingredientName.toLowerCase().trim();
  
  // Remove common preparation descriptors (comma-separated or space-separated)
  const preparationWords = [
    'minced', 'diced', 'chopped', 'sliced', 'cubed', 'julienned', 'grated',
    'crushed', 'peeled', 'seeded', 'pitted', 'stemmed', 'trimmed', 'cleaned',
    'boneless', 'skinless', 'bone-in', 'skin-on', 'whole', 'halved', 'quartered',
    'fresh', 'dried', 'frozen', 'canned', 'jarred', 'packed', 'drained',
    'rinsed', 'washed', 'pat dry', 'at room temperature', 'softened', 'melted',
    'warmed', 'cooled', 'chilled', 'refrigerated', 'optional', 'for garnish'
  ];
  
  // Remove preparation words
  preparationWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    name = name.replace(regex, '');
  });
  
  // Remove common quantity/unit descriptors
  const quantityWords = [
    'cloves', 'clove', 'stalks', 'stalk', 'sprigs', 'sprig', 'leaves', 'leaf',
    'pieces', 'piece', 'whole', 'halves', 'halved', 'quarters', 'quartered',
    'strips', 'strip', 'slices', 'slice', 'chunks', 'chunk', 'wedges', 'wedge',
    'segments', 'segment', 'sections', 'section'
  ];
  
  quantityWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    name = name.replace(regex, '');
  });
  
  // Remove common cut/part descriptors
  const cutWords = [
    'breast', 'thigh', 'thighs', 'wing', 'wings', 'leg', 'legs', 'drumstick', 'drumsticks',
    'fillet', 'fillets', 'steak', 'steaks', 'chop', 'chops', 'cutlet', 'cutlets',
    'ground', 'whole', 'pieces', 'chunks'
  ];
  
  // Only remove cut words if they're not the main ingredient (e.g., "chicken breast" → "chicken", but "ground beef" → "beef")
  cutWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    // Only remove if it's not at the start (to preserve "ground beef" → "beef" logic)
    if (!name.startsWith(word)) {
      name = name.replace(regex, '');
    }
  });
  
  // Remove special characters and extra whitespace
  name = name
    .replace(/[,\-]/g, ' ') // Replace commas and dashes with spaces
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
  
  // Split by spaces and take the first meaningful word(s)
  const words = name.split(' ').filter(w => w.length > 0);
  
  // Handle common patterns
  if (words.length === 0) return "";
  
  // If first word is "ground", skip it and take the next word
  if (words[0] === 'ground' && words.length > 1) {
    return words[1];
  }
  
  // If first word is a common modifier, take the second word
  const modifiers = ['fresh', 'dried', 'frozen', 'canned', 'jarred', 'organic', 'raw', 'cooked'];
  if (modifiers.includes(words[0]) && words.length > 1) {
    return words[1];
  }
  
  // Take the first word as base ingredient
  return words[0];
}

/**
 * Normalize ingredient name for URL
 * @param {string} ingredientName - The name of the ingredient
 * @returns {string} Normalized name for URL (lowercase, spaces to underscores, remove special chars)
 */
function normalizeIngredientName(ingredientName) {
  if (!ingredientName) return "";
  
  // First extract the base ingredient
  const baseIngredient = extractBaseIngredient(ingredientName);
  
  // Then normalize for URL
  return baseIngredient
    .replace(/\s+/g, "_") // Replace spaces with underscores
    .replace(/[^a-z0-9_]/g, "") // Remove special characters
    .replace(/_+/g, "_") // Replace multiple underscores with single
    .replace(/^_|_$/g, ""); // Remove leading/trailing underscores
}

/**
 * Get ingredient image URL from TheMealDB
 * @param {string} ingredientName - The name of the ingredient
 * @returns {string} URL to ingredient image
 */
export function getIngredientImageUrl(ingredientName) {
  if (!ingredientName) {
    return "https://www.themealdb.com/images/ingredients/ingredient.png";
  }
  
  const normalized = normalizeIngredientName(ingredientName);
  return `https://www.themealdb.com/images/ingredients/${normalized}.png`;
}

/**
 * Get ingredient image URL from Spoonacular (alternative)
 * @param {string} ingredientName - The name of the ingredient
 * @returns {string} URL to ingredient image
 */
export function getIngredientImageUrlSpoonacular(ingredientName) {
  if (!ingredientName) {
    return "https://img.spoonacular.com/ingredients_100x100/ingredient.jpg";
  }
  
  const normalized = normalizeIngredientName(ingredientName);
  return `https://img.spoonacular.com/ingredients_100x100/${normalized}.jpg`;
}

// Mapping of ingredient names to emojis (for fallback)
const ingredientEmojiMap = {
  // Vegetables
  onion: "🧅",
  onions: "🧅",
  tomato: "🍅",
  tomatoes: "🍅",
  garlic: "🧄",
  carrot: "🥕",
  carrots: "🥕",
  potato: "🥔",
  potatoes: "🥔",
  bellpepper: "🫑",
  "bell pepper": "🫑",
  pepper: "🫑",
  peppers: "🫑",
  cucumber: "🥒",
  cucumbers: "🥒",
  lettuce: "🥬",
  spinach: "🥬",
  broccoli: "🥦",
  mushroom: "🍄",
  mushrooms: "🍄",
  corn: "🌽",
  eggplant: "🍆",
  avocado: "🥑",
  avocados: "🥑",
  zucchini: "🥒",
  celery: "🥬",
  cabbage: "🥬",
  cauliflower: "🥦",
  
  // Fruits
  apple: "🍎",
  apples: "🍎",
  banana: "🍌",
  bananas: "🍌",
  orange: "🍊",
  oranges: "🍊",
  lemon: "🍋",
  lemons: "🍋",
  lime: "🍋",
  limes: "🍋",
  strawberry: "🍓",
  strawberries: "🍓",
  grapes: "🍇",
  peach: "🍑",
  cherries: "🍒",
  pineapple: "🍍",
  mango: "🥭",
  watermelon: "🍉",
  kiwi: "🥝",
  
  // Proteins
  chicken: "🍗",
  beef: "🥩",
  pork: "🥩",
  fish: "🐟",
  salmon: "🐟",
  tuna: "🐟",
  shrimp: "🦐",
  egg: "🥚",
  eggs: "🥚",
  bacon: "🥓",
  turkey: "🦃",
  
  // Dairy
  milk: "🥛",
  cheese: "🧀",
  butter: "🧈",
  yogurt: "🥛",
  cream: "🥛",
  
  // Grains & Bread
  bread: "🍞",
  rice: "🍚",
  pasta: "🍝",
  noodles: "🍜",
  flour: "🌾",
  oats: "🌾",
  quinoa: "🌾",
  
  // Herbs & Spices
  basil: "🌿",
  parsley: "🌿",
  cilantro: "🌿",
  rosemary: "🌿",
  thyme: "🌿",
  oregano: "🌿",
  mint: "🌿",
  ginger: "🫚",
  turmeric: "🫚",
  pepper: "🌶️",
  salt: "🧂",
  sugar: "🍬",
  honey: "🍯",
  cinnamon: "🌰",
  
  // Other
  olive: "🫒",
  olives: "🫒",
  oliveoil: "🫒",
  "olive oil": "🫒",
  oil: "🫒",
  vinegar: "🫗",
  soy: "🫘",
  "soy sauce": "🫘",
  beans: "🫘",
  lentils: "🫘",
  chickpeas: "🫘",
  peanut: "🥜",
  peanuts: "🥜",
  almond: "🥜",
  almonds: "🥜",
  chocolate: "🍫",
  cocoa: "🍫",
  coffee: "☕",
  tea: "🍵",
};

/**
 * Get emoji for an ingredient name (fallback)
 * @param {string} ingredientName - The name of the ingredient
 * @returns {string} Emoji for the ingredient, or a default food emoji if not found
 */
function getIngredientEmoji(ingredientName) {
  if (!ingredientName) return "🥘";
  
  // Normalize the ingredient name
  const normalized = ingredientName.toLowerCase().trim();
  
  // Direct match
  if (ingredientEmojiMap[normalized]) {
    return ingredientEmojiMap[normalized];
  }
  
  // Try to find partial matches (e.g., "fresh tomatoes" -> "tomatoes")
  for (const [key, emoji] of Object.entries(ingredientEmojiMap)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return emoji;
    }
  }
  
  // Fallback emoji
  return "🥘";
}

/**
 * Get ingredient image component props
 * @param {object|string} ingredient - Ingredient object with name property, or ingredient name string
 * @returns {object} Object with imageUrl, fallbackUrl, and emoji
 */
export function getIngredientIcon(ingredient) {
  const ingredientName = typeof ingredient === "string" 
    ? ingredient 
    : ingredient?.name || "";
  
  const imageUrl = getIngredientImageUrl(ingredientName);
  const fallbackUrl = getIngredientImageUrlSpoonacular(ingredientName);
  const emoji = getIngredientEmoji(ingredientName);
  
  return {
    imageUrl,
    fallbackUrl,
    emoji,
    ingredientName,
  };
}

