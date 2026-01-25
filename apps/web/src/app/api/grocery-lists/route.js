import sql from "../utils/sql.js";

// GET /api/grocery-lists - Get grocery lists for a user
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return Response.json(
        { success: false, error: "User ID is required" },
        { status: 401 },
      );
    }

    const groceryLists = await sql`
      SELECT *
      FROM grocery_lists
      WHERE user_id = ${userId}::uuid
      ORDER BY created_at DESC
    `;

    return Response.json({
      success: true,
      data: groceryLists,
    });
  } catch (error) {
    console.error("Error fetching grocery lists:", error);
    return Response.json(
      { success: false, error: "Failed to fetch grocery lists" },
      { status: 500 },
    );
  }
}

// POST /api/grocery-lists - Generate grocery list from meal plans
export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, startDate, endDate, name } = body;

    if (!userId) {
      return Response.json(
        { success: false, error: "User ID is required" },
        { status: 401 },
      );
    }

    if (!startDate || !endDate) {
      return Response.json(
        { success: false, error: "Start date and end date are required" },
        { status: 400 },
      );
    }

    console.log(
      `Generating grocery list for user ${userId} from ${startDate} to ${endDate}`,
    );

    // Get meal plans for the specified date range
    const mealPlans = await sql`
      SELECT 
        mp.date, mp.meal_type,
        r.name as recipe_name, r.ingredients, r.servings
      FROM meal_plans mp
      JOIN recipes r ON mp.recipe_id = r.id
      WHERE mp.user_id = ${userId}::uuid 
        AND mp.date >= ${startDate}::date 
        AND mp.date <= ${endDate}::date
      ORDER BY mp.date ASC, mp.meal_type
    `;

    if (mealPlans.length === 0) {
      return Response.json(
        {
          success: false,
          error: "No meal plans found for the specified date range",
        },
        { status: 400 },
      );
    }

    // Aggregate ingredients from all meal plans
    const ingredientMap = new Map();

    mealPlans.forEach((mealPlan) => {
      const ingredients = mealPlan.ingredients || [];

      ingredients.forEach((ingredient) => {
        const key = ingredient.name.toLowerCase();
        const amount = parseFloat(ingredient.amount) || 1;
        const unit = ingredient.unit || "";

        if (ingredientMap.has(key)) {
          const existing = ingredientMap.get(key);
          // If same unit, add amounts; otherwise, create separate entries
          if (existing.unit === unit) {
            existing.amount += amount;
            existing.recipes.add(mealPlan.recipe_name);
          } else {
            // Create new entry with different unit
            const newKey = `${key}_${unit}`;
            if (ingredientMap.has(newKey)) {
              const existingWithUnit = ingredientMap.get(newKey);
              existingWithUnit.amount += amount;
              existingWithUnit.recipes.add(mealPlan.recipe_name);
            } else {
              ingredientMap.set(newKey, {
                name: ingredient.name,
                amount: amount,
                unit: unit,
                recipes: new Set([mealPlan.recipe_name]),
                checked: false,
              });
            }
          }
        } else {
          ingredientMap.set(key, {
            name: ingredient.name,
            amount: amount,
            unit: unit,
            recipes: new Set([mealPlan.recipe_name]),
            checked: false,
          });
        }
      });
    });

    // Convert map to array
    const groceryItems = Array.from(ingredientMap.values()).map((item) => ({
      ...item,
      recipes: Array.from(item.recipes),
    }));

    // Check if a grocery list already exists for this date range
    const existingList = await sql`
      SELECT id FROM grocery_lists
      WHERE user_id = ${userId}::uuid
        AND meal_plan_week = ${startDate}::date
        AND created_from_meal_plan = true
      LIMIT 1
    `;

    let savedList;
    if (existingList.length > 0) {
      // Update existing list
      savedList = await sql`
        UPDATE grocery_lists
        SET 
          name = ${name || `Grocery List - Week of ${new Date(startDate).toLocaleDateString()}`},
          items = ${JSON.stringify(groceryItems)},
          estimated_cost = NULL,
          updated_at = NOW()
        WHERE id = ${existingList[0].id}
        RETURNING *
      `;
    } else {
      // Create new list
      savedList = await sql`
        INSERT INTO grocery_lists (
          user_id, name, items, created_from_meal_plan, 
          meal_plan_week, estimated_cost
        ) VALUES (
          ${userId}::uuid,
          ${name || `Grocery List - Week of ${new Date(startDate).toLocaleDateString()}`},
          ${JSON.stringify(groceryItems)},
          ${true},
          ${startDate}::date,
          NULL
        ) RETURNING *
      `;
    }

    console.log("Successfully generated grocery list:", savedList[0].id);

    return Response.json({
      success: true,
      data: savedList[0],
      message: "Grocery list generated successfully",
    });
  } catch (error) {
    console.error("Error generating grocery list:", error);
    return Response.json(
      { success: false, error: "Failed to generate grocery list" },
      { status: 500 },
    );
  }
}

// PUT /api/grocery-lists - Update grocery list (mark items as checked/unchecked)
export async function PUT(request) {
  try {
    const body = await request.json();
    const { listId, items, userId } = body;

    if (!userId || !listId) {
      return Response.json(
        {
          success: false,
          error: "User ID and list ID are required",
        },
        { status: 400 },
      );
    }

    const updatedList = await sql`
      UPDATE grocery_lists 
      SET items = ${JSON.stringify(items)}, updated_at = now()
      WHERE id = ${listId} AND user_id = ${userId}::uuid
      RETURNING *
    `;

    if (updatedList.length === 0) {
      return Response.json(
        { success: false, error: "Grocery list not found" },
        { status: 404 },
      );
    }

    return Response.json({
      success: true,
      data: updatedList[0],
      message: "Grocery list updated successfully",
    });
  } catch (error) {
    console.error("Error updating grocery list:", error);
    return Response.json(
      { success: false, error: "Failed to update grocery list" },
      { status: 500 },
    );
  }
}

