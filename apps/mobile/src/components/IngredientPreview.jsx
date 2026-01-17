import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { IngredientIcon } from "./IngredientIcon";

// Pastel color palette for ingredient backgrounds
const PASTEL_COLORS = [
  "#E8F5E9", // Soft green
  "#FFF8E1", // Soft yellow
  "#FCE4EC", // Soft pink
  "#E8EAF6", // Soft lavender
  "#E0F7FA", // Soft cyan
  "#FFF3E0", // Soft peach
  "#F3E5F5", // Soft purple
  "#E1F5FE", // Soft sky blue
  "#DCEDC8", // Soft lime
  "#FFECB3", // Soft amber
];

// Generate a consistent but varied color set based on recipe
function getColorsForRecipe(recipeId, count) {
  const seed = typeof recipeId === 'string' 
    ? recipeId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    : recipeId || 0;
  
  const colors = [];
  for (let i = 0; i < count; i++) {
    const index = (seed + i * 3) % PASTEL_COLORS.length;
    colors.push(PASTEL_COLORS[index]);
  }
  return colors;
}

// Get layout variant based on recipe ID (consistent per recipe)
function getLayoutVariant(recipeId, ingredientCount) {
  const seed = typeof recipeId === 'string' 
    ? recipeId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    : recipeId || 0;
  
  // Available layouts based on ingredient count
  if (ingredientCount >= 6) {
    const layouts = ['grid3x2', 'grid2x3', 'mosaic'];
    return layouts[seed % layouts.length];
  } else if (ingredientCount >= 4) {
    const layouts = ['quadrant', 'grid2x2', 'strips'];
    return layouts[seed % layouts.length];
  } else if (ingredientCount >= 2) {
    const layouts = ['grid2x2', 'strips'];
    return layouts[seed % layouts.length];
  }
  return 'single';
}

// Extract clean ingredient name for display
function getIngredientDisplayName(ingredient) {
  const name = typeof ingredient === "string" 
    ? ingredient 
    : ingredient?.name || ingredient?.ingredient || "";
  
  // Clean up the name - take first word or two, remove quantities
  let cleanName = name
    .replace(/^\d+[\s\/\d]*\s*(cups?|tbsp|tsp|oz|g|kg|ml|l|pound|lb)?\s*/i, '')
    .replace(/,.*$/, '')
    .trim();
  
  // Take first 1-2 words for display
  const words = cleanName.split(' ').slice(0, 2);
  return words.join(' ').toUpperCase();
}

/**
 * Displays a beautiful grid of ingredient images as a visual preview for recipes without images
 * Uses real ingredient images from TheMealDB with pastel backgrounds
 * 
 * @param {Array} ingredients - Array of ingredient objects or strings
 * @param {string|number} recipeId - Recipe ID for consistent layout selection
 * @param {number} maxItems - Maximum number of ingredients to show (default: 6)
 */
export default function IngredientPreview({ 
  ingredients = [], 
  recipeId,
  maxItems = 6,
}) {
  // Get display ingredients - show as many as possible up to maxItems
  const displayIngredients = useMemo(() => {
    const actualMax = Math.min(maxItems, ingredients.length);
    return ingredients.slice(0, actualMax).map(ing => ({
      raw: ing,
      name: getIngredientDisplayName(ing),
    }));
  }, [ingredients, maxItems]);

  // Get layout and colors
  const layout = useMemo(() => 
    getLayoutVariant(recipeId, displayIngredients.length), 
    [recipeId, displayIngredients.length]
  );
  
  const colors = useMemo(() => 
    getColorsForRecipe(recipeId, Math.max(displayIngredients.length, 6)), 
    [recipeId, displayIngredients.length]
  );

  // Render based on layout type
  switch (layout) {
    case 'grid3x2':
      return <Grid3x2Layout ingredients={displayIngredients} colors={colors} />;
    case 'grid2x3':
      return <Grid2x3Layout ingredients={displayIngredients} colors={colors} />;
    case 'mosaic':
      return <MosaicLayout ingredients={displayIngredients} colors={colors} />;
    case 'quadrant':
      return <QuadrantLayout ingredients={displayIngredients} colors={colors} />;
    case 'grid2x2':
      return <Grid2x2Layout ingredients={displayIngredients} colors={colors} />;
    case 'strips':
      return <StripsLayout ingredients={displayIngredients} colors={colors} />;
    default:
      return <Grid3x2Layout ingredients={displayIngredients} colors={colors} />;
  }
}

// Layout: 3 columns x 2 rows (6 ingredients)
function Grid3x2Layout({ ingredients, colors }) {
  const items = [...ingredients];
  while (items.length < 6) items.push(null);

  return (
    <View style={styles.grid3x2Container}>
      <View style={styles.grid3x2Row}>
        {items.slice(0, 3).map((item, index) => (
          <View 
            key={index} 
            style={[styles.grid3x2Card, { backgroundColor: colors[index] }]}
          >
            {item && (
              <>
                <IngredientIcon ingredient={item.raw} size={28} />
                <Text style={styles.grid3x2Label} numberOfLines={1}>{item.name}</Text>
              </>
            )}
          </View>
        ))}
      </View>
      <View style={styles.grid3x2Row}>
        {items.slice(3, 6).map((item, index) => (
          <View 
            key={index + 3} 
            style={[styles.grid3x2Card, { backgroundColor: colors[index + 3] }]}
          >
            {item && (
              <>
                <IngredientIcon ingredient={item.raw} size={28} />
                <Text style={styles.grid3x2Label} numberOfLines={1}>{item.name}</Text>
              </>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

// Layout: 2 columns x 3 rows (6 ingredients)
function Grid2x3Layout({ ingredients, colors }) {
  const items = [...ingredients];
  while (items.length < 6) items.push(null);

  return (
    <View style={styles.grid2x3Container}>
      {[0, 1, 2].map((rowIndex) => (
        <View key={rowIndex} style={styles.grid2x3Row}>
          {items.slice(rowIndex * 2, rowIndex * 2 + 2).map((item, index) => (
            <View 
              key={rowIndex * 2 + index} 
              style={[styles.grid2x3Card, { backgroundColor: colors[rowIndex * 2 + index] }]}
            >
              {item && (
                <>
                  <IngredientIcon ingredient={item.raw} size={26} />
                  <Text style={styles.grid2x3Label} numberOfLines={1}>{item.name}</Text>
                </>
              )}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

// Layout: Mosaic - varied sizes (6 ingredients)
function MosaicLayout({ ingredients, colors }) {
  const items = [...ingredients];
  while (items.length < 6) items.push(null);

  return (
    <View style={styles.mosaicContainer}>
      {/* Left column - 2 items stacked */}
      <View style={styles.mosaicLeft}>
        <View style={[styles.mosaicCardTall, { backgroundColor: colors[0] }]}>
          {items[0] && (
            <>
              <IngredientIcon ingredient={items[0].raw} size={32} />
              <Text style={styles.mosaicLabelLarge} numberOfLines={1}>{items[0].name}</Text>
            </>
          )}
        </View>
        <View style={[styles.mosaicCardShort, { backgroundColor: colors[1] }]}>
          {items[1] && (
            <>
              <IngredientIcon ingredient={items[1].raw} size={24} />
              <Text style={styles.mosaicLabel} numberOfLines={1}>{items[1].name}</Text>
            </>
          )}
        </View>
      </View>
      
      {/* Right column - 4 items in 2x2 */}
      <View style={styles.mosaicRight}>
        <View style={styles.mosaicRightRow}>
          <View style={[styles.mosaicCardSmall, { backgroundColor: colors[2] }]}>
            {items[2] && (
              <>
                <IngredientIcon ingredient={items[2].raw} size={22} />
                <Text style={styles.mosaicLabelSmall} numberOfLines={1}>{items[2].name}</Text>
              </>
            )}
          </View>
          <View style={[styles.mosaicCardSmall, { backgroundColor: colors[3] }]}>
            {items[3] && (
              <>
                <IngredientIcon ingredient={items[3].raw} size={22} />
                <Text style={styles.mosaicLabelSmall} numberOfLines={1}>{items[3].name}</Text>
              </>
            )}
          </View>
        </View>
        <View style={styles.mosaicRightRow}>
          <View style={[styles.mosaicCardSmall, { backgroundColor: colors[4] }]}>
            {items[4] && (
              <>
                <IngredientIcon ingredient={items[4].raw} size={22} />
                <Text style={styles.mosaicLabelSmall} numberOfLines={1}>{items[4].name}</Text>
              </>
            )}
          </View>
          <View style={[styles.mosaicCardSmall, { backgroundColor: colors[5] }]}>
            {items[5] && (
              <>
                <IngredientIcon ingredient={items[5].raw} size={22} />
                <Text style={styles.mosaicLabelSmall} numberOfLines={1}>{items[5].name}</Text>
              </>
            )}
          </View>
        </View>
      </View>
    </View>
  );
}

// Layout: Four quadrants with pastel backgrounds
function QuadrantLayout({ ingredients, colors }) {
  const items = [...ingredients];
  while (items.length < 4) items.push(null);

  return (
    <View style={styles.quadrantContainer}>
      <View style={styles.quadrantRow}>
        <View style={[styles.quadrant, { backgroundColor: colors[0] }]}>
          {items[0] && (
            <>
              <IngredientIcon ingredient={items[0].raw} size={32} />
              <Text style={styles.quadrantLabel} numberOfLines={1}>{items[0].name}</Text>
            </>
          )}
        </View>
        <View style={[styles.quadrant, { backgroundColor: colors[1] }]}>
          {items[1] && (
            <>
              <IngredientIcon ingredient={items[1].raw} size={32} />
              <Text style={styles.quadrantLabel} numberOfLines={1}>{items[1].name}</Text>
            </>
          )}
        </View>
      </View>
      <View style={styles.quadrantRow}>
        <View style={[styles.quadrant, { backgroundColor: colors[2] }]}>
          {items[2] && (
            <>
              <IngredientIcon ingredient={items[2].raw} size={32} />
              <Text style={styles.quadrantLabel} numberOfLines={1}>{items[2].name}</Text>
            </>
          )}
        </View>
        <View style={[styles.quadrant, { backgroundColor: colors[3] }]}>
          {items[3] && (
            <>
              <IngredientIcon ingredient={items[3].raw} size={32} />
              <Text style={styles.quadrantLabel} numberOfLines={1}>{items[3].name}</Text>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

// Layout: 2x2 rounded grid cards
function Grid2x2Layout({ ingredients, colors }) {
  const items = [...ingredients];
  while (items.length < 4) items.push(null);

  return (
    <View style={styles.grid2x2Container}>
      <View style={styles.grid2x2Row}>
        {items.slice(0, 2).map((item, index) => (
          <View 
            key={index} 
            style={[styles.grid2x2Card, { backgroundColor: colors[index] }]}
          >
            {item && (
              <>
                <IngredientIcon ingredient={item.raw} size={30} />
                <Text style={styles.grid2x2Label} numberOfLines={1}>{item.name}</Text>
              </>
            )}
          </View>
        ))}
      </View>
      <View style={styles.grid2x2Row}>
        {items.slice(2, 4).map((item, index) => (
          <View 
            key={index + 2} 
            style={[styles.grid2x2Card, { backgroundColor: colors[index + 2] }]}
          >
            {item && (
              <>
                <IngredientIcon ingredient={item.raw} size={30} />
                <Text style={styles.grid2x2Label} numberOfLines={1}>{item.name}</Text>
              </>
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

// Layout: Horizontal color strips
function StripsLayout({ ingredients, colors }) {
  const items = ingredients.slice(0, 4);

  return (
    <View style={styles.stripsContainer}>
      {items.map((item, index) => (
        <View 
          key={index} 
          style={[styles.strip, { backgroundColor: colors[index] }]}
        >
          <IngredientIcon ingredient={item.raw} size={26} />
          <Text style={styles.stripLabel} numberOfLines={1}>{item.name}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // Grid 3x2 Layout (6 ingredients)
  grid3x2Container: {
    flex: 1,
    width: "100%",
    height: "100%",
    padding: 4,
    gap: 4,
  },
  grid3x2Row: {
    flex: 1,
    flexDirection: "row",
    gap: 4,
  },
  grid3x2Card: {
    flex: 1,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    padding: 4,
  },
  grid3x2Label: {
    fontSize: 9,
    fontWeight: "700",
    color: "#333333",
    marginTop: 3,
    textAlign: "center",
    letterSpacing: 0.3,
  },

  // Grid 2x3 Layout (6 ingredients)
  grid2x3Container: {
    flex: 1,
    width: "100%",
    height: "100%",
    padding: 4,
    gap: 3,
  },
  grid2x3Row: {
    flex: 1,
    flexDirection: "row",
    gap: 4,
  },
  grid2x3Card: {
    flex: 1,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    padding: 3,
  },
  grid2x3Label: {
    fontSize: 9,
    fontWeight: "700",
    color: "#333333",
    marginTop: 2,
    textAlign: "center",
    letterSpacing: 0.3,
  },

  // Mosaic Layout (6 ingredients with varied sizes)
  mosaicContainer: {
    flex: 1,
    width: "100%",
    height: "100%",
    flexDirection: "row",
    padding: 4,
    gap: 4,
  },
  mosaicLeft: {
    flex: 1,
    gap: 4,
  },
  mosaicCardTall: {
    flex: 1.5,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    padding: 6,
  },
  mosaicCardShort: {
    flex: 1,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    padding: 4,
  },
  mosaicRight: {
    flex: 1,
    gap: 4,
  },
  mosaicRightRow: {
    flex: 1,
    flexDirection: "row",
    gap: 4,
  },
  mosaicCardSmall: {
    flex: 1,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    padding: 3,
  },
  mosaicLabelLarge: {
    fontSize: 10,
    fontWeight: "800",
    color: "#222222",
    marginTop: 4,
    textAlign: "center",
    letterSpacing: 0.4,
  },
  mosaicLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#333333",
    marginTop: 3,
    textAlign: "center",
    letterSpacing: 0.3,
  },
  mosaicLabelSmall: {
    fontSize: 8,
    fontWeight: "700",
    color: "#333333",
    marginTop: 2,
    textAlign: "center",
    letterSpacing: 0.2,
  },

  // Quadrant Layout
  quadrantContainer: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  quadrantRow: {
    flex: 1,
    flexDirection: "row",
  },
  quadrant: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 6,
  },
  quadrantLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#333333",
    marginTop: 4,
    textAlign: "center",
    letterSpacing: 0.4,
  },

  // Grid 2x2 Layout
  grid2x2Container: {
    flex: 1,
    width: "100%",
    height: "100%",
    padding: 5,
    gap: 5,
  },
  grid2x2Row: {
    flex: 1,
    flexDirection: "row",
    gap: 5,
  },
  grid2x2Card: {
    flex: 1,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    padding: 5,
  },
  grid2x2Label: {
    fontSize: 10,
    fontWeight: "700",
    color: "#333333",
    marginTop: 4,
    textAlign: "center",
    letterSpacing: 0.3,
  },

  // Strips Layout
  stripsContainer: {
    flex: 1,
    width: "100%",
    height: "100%",
    flexDirection: "row",
  },
  strip: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 4,
  },
  stripLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#333333",
    marginTop: 4,
    textAlign: "center",
    letterSpacing: 0.3,
    width: "100%",
  },
});
