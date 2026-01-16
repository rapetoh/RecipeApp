/**
 * Unit conversion utility for recipe ingredients
 * Only converts when accurate (volume↔volume, weight↔weight)
 * Leaves count/measurement units and volume↔weight conversions as-is
 */

// Volume units (imperial)
const IMPERIAL_VOLUME = ['cup', 'cups', 'tsp', 'teaspoon', 'teaspoons', 'tbsp', 'tablespoon', 'tablespoons', 'fl oz', 'fluid ounce', 'fluid ounces', 'pint', 'pints', 'quart', 'quarts', 'gallon', 'gallons'];

// Volume units (metric)
const METRIC_VOLUME = ['ml', 'milliliter', 'milliliters', 'l', 'liter', 'liters', 'litre', 'litres'];

// Weight units (imperial)
const IMPERIAL_WEIGHT = ['oz', 'ounce', 'ounces', 'lb', 'lbs', 'pound', 'pounds'];

// Weight units (metric)
const METRIC_WEIGHT = ['g', 'gram', 'grams', 'kg', 'kilogram', 'kilograms'];

// Conversion factors
const CONVERSIONS = {
  // Volume conversions (imperial to metric)
  'cup': 240, // ml
  'cups': 240,
  'tsp': 5, // ml
  'teaspoon': 5,
  'teaspoons': 5,
  'tbsp': 15, // ml
  'tablespoon': 15,
  'tablespoons': 15,
  'fl oz': 30, // ml (approximate)
  'fluid ounce': 30,
  'fluid ounces': 30,
  'pint': 473, // ml
  'pints': 473,
  'quart': 946, // ml
  'quarts': 946,
  'gallon': 3785, // ml
  'gallons': 3785,
  
  // Weight conversions (imperial to metric)
  'oz': 28.35, // grams
  'ounce': 28.35,
  'ounces': 28.35,
  'lb': 453.6, // grams
  'lbs': 453.6,
  'pound': 453.6,
  'pounds': 453.6,
};

/**
 * Check if a unit is a volume unit
 */
function isVolumeUnit(unit) {
  if (!unit) return false;
  const unitLower = unit.toLowerCase().trim();
  return IMPERIAL_VOLUME.includes(unitLower) || METRIC_VOLUME.includes(unitLower);
}

/**
 * Check if a unit is a weight unit
 */
function isWeightUnit(unit) {
  if (!unit) return false;
  const unitLower = unit.toLowerCase().trim();
  return IMPERIAL_WEIGHT.includes(unitLower) || METRIC_WEIGHT.includes(unitLower);
}

/**
 * Check if a unit is imperial
 */
function isImperialUnit(unit) {
  if (!unit) return false;
  const unitLower = unit.toLowerCase().trim();
  return IMPERIAL_VOLUME.includes(unitLower) || IMPERIAL_WEIGHT.includes(unitLower);
}

/**
 * Check if a unit is metric
 */
function isMetricUnit(unit) {
  if (!unit) return false;
  const unitLower = unit.toLowerCase().trim();
  return METRIC_VOLUME.includes(unitLower) || METRIC_WEIGHT.includes(unitLower);
}

/**
 * Convert imperial volume to metric
 */
function convertImperialVolumeToMetric(amount, unit) {
  const unitLower = unit.toLowerCase().trim();
  const conversionFactor = CONVERSIONS[unitLower];
  if (!conversionFactor) return null;
  
  const ml = amount * conversionFactor;
  
  // Convert to appropriate metric unit
  if (ml >= 1000) {
    return { amount: Math.round((ml / 1000) * 10) / 10, unit: 'l' };
  } else {
    return { amount: Math.round(ml), unit: 'ml' };
  }
}

/**
 * Convert metric volume to imperial
 */
function convertMetricVolumeToImperial(amount, unit) {
  const unitLower = unit.toLowerCase().trim();
  let ml = amount;
  
  if (unitLower === 'l' || unitLower === 'liter' || unitLower === 'liters' || unitLower === 'litre' || unitLower === 'litres') {
    ml = amount * 1000;
  }
  
  // Convert to appropriate imperial unit
  if (ml >= 473) {
    // Use cups for larger amounts
    const cups = ml / 240;
    if (cups >= 1) {
      return { amount: Math.round(cups * 10) / 10, unit: cups === 1 ? 'cup' : 'cups' };
    }
  }
  
  if (ml >= 15) {
    // Use tablespoons
    const tbsp = ml / 15;
    return { amount: Math.round(tbsp * 10) / 10, unit: tbsp === 1 ? 'tbsp' : 'tbsp' };
  }
  
  // Use teaspoons for small amounts
  const tsp = ml / 5;
  return { amount: Math.round(tsp * 10) / 10, unit: tsp === 1 ? 'tsp' : 'tsp' };
}

/**
 * Convert imperial weight to metric
 */
function convertImperialWeightToMetric(amount, unit) {
  const unitLower = unit.toLowerCase().trim();
  const conversionFactor = CONVERSIONS[unitLower];
  if (!conversionFactor) return null;
  
  const grams = amount * conversionFactor;
  
  // Convert to appropriate metric unit
  if (grams >= 1000) {
    return { amount: Math.round((grams / 1000) * 10) / 10, unit: 'kg' };
  } else {
    return { amount: Math.round(grams * 10) / 10, unit: 'g' };
  }
}

/**
 * Convert metric weight to imperial
 */
function convertMetricWeightToImperial(amount, unit) {
  const unitLower = unit.toLowerCase().trim();
  let grams = amount;
  
  if (unitLower === 'kg' || unitLower === 'kilogram' || unitLower === 'kilograms') {
    grams = amount * 1000;
  }
  
  // Convert to appropriate imperial unit
  if (grams >= 453.6) {
    // Use pounds for larger amounts
    const lbs = grams / 453.6;
    return { amount: Math.round(lbs * 10) / 10, unit: lbs === 1 ? 'lb' : 'lbs' };
  }
  
  // Use ounces for smaller amounts
  const oz = grams / 28.35;
  return { amount: Math.round(oz * 10) / 10, unit: oz === 1 ? 'oz' : 'oz' };
}

/**
 * Convert an ingredient unit based on user's measurement preference
 * @param {number|string} amount - The amount
 * @param {string} unit - The current unit
 * @param {string} targetSystem - 'metric' or 'imperial'
 * @returns {object|null} - {amount, unit} or null if conversion not possible
 */
export function convertUnit(amount, unit, targetSystem) {
  if (!unit || !amount) return null;
  
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount)) return null;
  
  const unitLower = unit.toLowerCase().trim();
  
  // If already in target system, no conversion needed
  if (targetSystem === 'imperial' && isImperialUnit(unitLower)) return null;
  if (targetSystem === 'metric' && isMetricUnit(unitLower)) return null;
  
  // Volume conversions
  if (isVolumeUnit(unitLower)) {
    if (targetSystem === 'metric' && isImperialUnit(unitLower)) {
      return convertImperialVolumeToMetric(numAmount, unitLower);
    } else if (targetSystem === 'imperial' && isMetricUnit(unitLower)) {
      return convertMetricVolumeToImperial(numAmount, unitLower);
    }
  }
  
  // Weight conversions
  if (isWeightUnit(unitLower)) {
    if (targetSystem === 'metric' && isImperialUnit(unitLower)) {
      return convertImperialWeightToMetric(numAmount, unitLower);
    } else if (targetSystem === 'imperial' && isMetricUnit(unitLower)) {
      return convertMetricWeightToImperial(numAmount, unitLower);
    }
  }
  
  // Can't convert (count units, volume↔weight, etc.) - return null to keep original
  return null;
}

/**
 * Convert recipe ingredients array
 * @param {Array} ingredients - Array of {name, amount, unit}
 * @param {string} targetSystem - 'metric' or 'imperial'
 * @returns {Array} - Converted ingredients array
 */
export function convertIngredients(ingredients, targetSystem) {
  if (!ingredients || !Array.isArray(ingredients)) return ingredients;
  
  return ingredients.map(ingredient => {
    const converted = convertUnit(ingredient.amount, ingredient.unit, targetSystem);
    
    if (converted) {
      return {
        ...ingredient,
        amount: converted.amount,
        unit: converted.unit,
      };
    }
    
    // Return original if conversion not possible
    return ingredient;
  });
}





