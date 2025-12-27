// Mapping of ingredient names to emojis
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
 * Get emoji for an ingredient name
 * @param {string} ingredientName - The name of the ingredient
 * @returns {string} Emoji for the ingredient, or a default food emoji if not found
 */
export function getIngredientEmoji(ingredientName) {
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
 * Get emoji for an ingredient object
 * @param {object|string} ingredient - Ingredient object with name property, or ingredient name string
 * @returns {string} Emoji for the ingredient
 */
export function getIngredientIcon(ingredient) {
  if (typeof ingredient === "string") {
    return getIngredientEmoji(ingredient);
  }
  if (ingredient?.name) {
    return getIngredientEmoji(ingredient.name);
  }
  return "🥘";
}

