RecipeApp – Full MVP Specification

(for repo: https://github.com/rapetoh/RecipeApp)

0. Context (Important)

You are working inside this existing monorepo:

GitHub: https://github.com/rapetoh/RecipeApp

Structure:

database/ – PostgreSQL schema and Docker setup

apps/web/ – backend / API (Node)

apps/mobile/ – Expo React Native mobile app

Do NOT rebuild a new project.
Use and complete the existing code, schema, and integrations:

PostgreSQL

Auth implementation described in AUTHENTICATION.md

OpenAI (for food recognition + recipe generation)

Cloudinary (for image upload)

Goal: ship a working MVP mobile app that a normal user can download and use to answer:

“What should I cook today, and how do I cook it?”

1. Product Goal & User Scenarios
Main product goal

Help users decide what to cook and how to cook it with as little thinking as possible.

Core user scenarios (must be fully supported)

No idea what to cook (main scenario)

User opens the app after work/school with no plan.

App shows daily suggestions for Breakfast / Lunch / Dinner that fit their preferences.

User has a photo of a dish

User takes or uploads a photo of a dish (e.g., pizza, bibimbap).

App analyzes the image → identifies the dish → generates a recipe with ingredients + steps.

User knows the name of a dish

User types “Bibimbap”, “Pepperoni Pizza”, “Chicken Curry”, etc.

App finds matching recipes and lets them open one and cook it.

2. Current State Summary

From repo + actual usage:

2.1 Things that already work (keep and improve)

Auth flow exists and basic login/register works.

Home screen layout is implemented:

Shows greeting: “Good morning, Roch!”

Shows horizontal categories (All, Breakfast, Lunch, …).

Shows recipe cards on Home (e.g., “Bibimbap”).

Recipe Details screen exists:

Shows image, name, description, time, difficulty, servings, ingredients, instructions.

Food Recognition:

User can pick/take a picture.

Analysis now works: e.g., pizza photo → “Pepperoni Pizza (95% confidence)” → generated recipe.

2.2 Things that are broken or incomplete

Search is broken / inconsistent

Example: “Bibimbap” appears on Home.

When searching “Bib…” in the Search tab, it shows “No recipes found”.

This means existing recipes are not searchable (DB/endpoint or mobile logic is wrong).

Notification badge is fake

Logged out: bell icon without red dot.

Logged in: red dot appears, but tapping the bell shows “No new notifications”.

There is no real notification system; badge is hardcoded.

Food Recognition image mismatch

Analysis works and returns a correct dish name + recipe.

But the image shown on some generated recipe details can be from a previous recognition, not the current dish.

“Start Cooking” is not implemented

Button exists on Recipe Details.

Tapping it shows a “Feature Coming Soon – cooking timer and step-by-step guide coming soon!” alert.

This is blocking and feels fake; instructions are already on the screen.

Spinner on image analysis is static

“Analyzing image…” shows what looks like a spinner, but it does not animate.

UX feels frozen.

Meal planning is partially implemented

UI exists (calendar, breakfast/lunch/dinner slots).

Some actions show “Coming Soon” (e.g., grocery list generation).

We don’t need a full smart planner yet, but the basic UX must not rely on “coming soon” popups.

3. MVP Features (What must work end-to-end)
3.1 Authentication & User Profile

Use the existing auth design in AUTHENTICATION.md.

Requirements:

Email/password sign up and login work from mobile app.

When credentials are invalid or email is already used:

Show clear error messages in the UI (not generic or silent).

After the first login, user can set and update:

Diet: none | vegetarian | vegan | halal | gluten-free | other

Allergies: multi-select (nuts, shellfish, dairy, eggs, gluten, etc.)

Disliked ingredients: free-text list

Behavior:

These preferences are stored in DB (use existing tables/columns, or extend schema if needed).

API must return these preferences to the mobile app and use them in recommendations and search filters.

3.2 Home Screen – Daily Suggestions (Scenario 1)

UI:

Greet the logged-in user by name.

Horizontal category chips: All / Breakfast / Lunch / Dinner / etc.

Under that, show recipe cards (list/grid) for the selected category (as already designed).

Backend behavior:

Mobile calls something like:
GET /api/recommendations/today or GET /api/recipes?category=<...>

The backend:

Looks at user preferences (diet, allergies, dislikes).

Fetches recipes from DB (and optionally from external APIs in the future).

Filters out recipes with disallowed ingredients.

Returns a list of normalized recipe objects.

MVP requirement:

Home must reliably show recipes from the DB.

Any recipe shown on Home must also be searchable by its title.

3.3 Search – Name-based search (Scenario 3)

Current issue:
Search says “No recipes found” even for recipes that exist on Home (e.g., Bibimbap).

MVP requirements:

Implement a working search endpoint and fix the mobile Search screen.

Backend:

Endpoint:
GET /api/recipes?query=<text>&category=<optional>

Behavior:

Search recipe title (and optionally description) by partial match.

Case-insensitive.

Return the same recipe format as used on Home.

Mobile:

Search screen shows:

Search bar (placeholder: “Search for a dish…”).

If results exist: list of recipe cards (like Home cards).

If no results:

“No recipes found. Try different search terms or adjust your filters.”

Important constraint:

If a recipe is visible on Home, searching for its name must return it.

Example test:

“Bibimbap” visible on Home.

Search → type “Bibimbap” → that recipe appears.

3.4 Recipe Details & Favorites

Recipe Details is already implemented visually; we need to complete the behavior.

UI details (keep):

Recipe image

Title, cuisine, time, difficulty, servings

Description

Nutritional info if available (calories, protein, carbs, fat)

Ingredients list (quantity + unit + ingredient)

Instructions list (numbered steps)

Heart icon (favorite)

“Start Cooking” button (see section 3.7)

Backend:

GET /api/recipes/:id returns full recipe details.

Favorites:

GET /api/favorites – list of recipes saved by current user.

POST /api/favorites – save recipe { recipeId }.

DELETE /api/favorites/:recipeId – remove saved recipe.

MVP behavior:

Tapping heart on a recipe toggles favorite:

On success: icon updates immediately.

On error: show a clear error message (“Couldn’t save this recipe, please try again.”).

Favorites tab:

Shows list of all saved recipes.

Empty state if no favorites.

No fetch errors in normal conditions.

Also ensure data consistency:
If the detail screen shows “Pepperoni Pizza”, the ingredients and instructions must describe pizza, not another dish.

3.5 Food Recognition – Photo → Dish → Recipe (Scenario 2)

Food recognition is already functioning, we only need to make it robust and consistent.

Flow:

User taps “Scan Food” on Home or Profile.

User takes a photo or selects one from gallery.

Mobile uploads the image (Cloudinary or direct to backend).

Backend endpoint (e.g., POST /api/ai/analyze-image):

Uses OpenAI vision to:

Detect dish name.

Optional: detect some ingredients and cuisine.

Option A: if dish exists in DB, return that recipe.

Option B: if not, generate a new structured recipe (ingredients + steps + meta).

App shows Analysis Results screen:

Photo of the dish.

Dish name, confidence %, cuisine, difficulty.

List of detected ingredients.

Button: “View Generated Recipe”.

Tapping “View Generated Recipe” opens Recipe Details screen for this dish.

MVP fixes required:

Image mapping bug

For each analysis request, tie the current photo to the generated recipe.

When the user opens the generated recipe, the header image should:

Preferably be the original photo they took, OR

Be another image chosen/generated for that dish — but it must correspond to the current detection, not a previous one.

Ensure that scanning Dish A then Dish B does not reuse Dish A’s picture in Dish B’s detail.

Spinner animation

Replace static icon with a real animated spinner during analysis.

Spinner should be visible and moving while the request is pending, and disappear when results appear.

Error handling

If image cannot be analyzed (low confidence, network error, OpenAI error):

Show a clear message like:

“We couldn’t analyze this photo. Make sure the dish is clearly visible and try again.”

Avoid generic “Error” modals with no explanation.

3.6 Meal Planning (simple MVP)

We do not need a full smart planner yet, but what is present should be real, not fake.

MVP behavior:

User can select a date and assign recipes to:

Breakfast

Lunch

Dinner

Data is saved in DB and can be fetched again.

User can see which recipes are planned for a specific day.

UI:

Use the existing calendar + meal slots layout.

When user taps a “+” in a slot:

Show a simple recipe picker or search.

After selection, show that recipe name in the slot.

Important:
Remove or hide “Coming Soon” popups in this flow for MVP.
If you can’t implement grocery list generation now, hide that button instead of showing “coming soon”.

3.7 Start Cooking – no more “coming soon”

Currently, tapping “Start Cooking” shows a “Feature Coming Soon” alert, even though instructions are present.

MVP requirement:

Replace this with a very simple but real behavior.

Options (choose one):

Option 1 (simplest):

On tap:

Scroll the screen to the “Instructions” section.

Optionally highlight step 1 briefly.

No modal, no coming-soon message.

Option 2 (slightly better):

Open a “Cooking Mode” view:

Shows one step at a time.

“Next” / “Previous” buttons.

Optional very basic timer (but timer is not required for MVP).

In any case: remove “Feature Coming Soon” from the Start Cooking button.

3.8 Notifications

Currently:

Logged-in users see a red badge on the bell, but opening notifications shows “No new notifications”.

MVP requirement:

Either:

No real notifications implemented → remove the fake badge.

Show just a plain bell icon with no red dot.

If the user taps it, show something honest like:

“You don’t have any notifications yet.”

Or implement real notifications:

Store notifications in DB.

Show the red badge only if there are unread notifications.

The modal should list them.

For MVP, option (1) is enough and simpler.

4. Technical Expectations
4.1 Backend (apps/web)

Use existing Node + Postgres setup and environment variables.

Ensure these endpoints exist and behave as described:

Auth / user:

POST /api/auth/signup

POST /api/auth/login

GET /api/user/me

PUT /api/user/me (for preferences)

Recipes:

GET /api/recipes?query=&category= – search/list

GET /api/recipes/:id – details

Favorites:

GET /api/favorites

POST /api/favorites

DELETE /api/favorites/:recipeId

AI:

POST /api/ai/analyze-image – image → dish + recipe

Meal plans (basic):

GET /api/meal-plans?from=&to=

POST /api/meal-plans (create/update entries for a day + slot)

Also:

Fix any SQL issues (e.g. using Neon tag correctly, or equivalent).

Replace any leftover “CreateAnything-specific” logic in recommendations with standard OpenAI + DB usage.

Always return clear JSON error messages with appropriate HTTP status codes.

4.2 Mobile app (apps/mobile)

Use EXPO_PUBLIC_API_URL (or existing config) for API base URL.

Make sure all tabs work:

Home

Search

Saved

Profile

Food Recognition

Meal Planning

Every screen must handle:

Loading state

Error state (with user-friendly text)

Empty state (no recipes, no favorites, etc.)

5. Definition of “MVP Done”

From a real user’s perspective, the app is MVP-ready when:

I can sign up, log in, and see my name on Home.

I can set my diet/allergies and they persist.

Home shows meal ideas, and these recipes open correctly.

Search returns recipes that I see on Home (e.g., “Bibimbap”).

I can open a recipe, see accurate ingredients and steps, and save/unsave it to favorites.

Favorites tab always loads my saved recipes (no random errors).

I can scan a dish photo and get a correct dish name, a recipe, and a matching image for that scan.

“Start Cooking” does something real (scrolls to steps or opens a simple step-by-step view).

Meal planning lets me attach recipes to days and see them later, with no “coming soon” blocking core actions.

The notification bell has no fake badge; either no badge or real notifications.

There are no “App error detected” overlays or blank screens in normal usage.RecipeApp – Full MVP Specification

(for repo: https://github.com/rapetoh/RecipeApp)

0. Context (Important)

You are working inside this existing monorepo:

GitHub: https://github.com/rapetoh/RecipeApp

Structure:

database/ – PostgreSQL schema and Docker setup

apps/web/ – backend / API (Node)

apps/mobile/ – Expo React Native mobile app

Do NOT rebuild a new project.
Use and complete the existing code, schema, and integrations:

PostgreSQL

Auth implementation described in AUTHENTICATION.md

OpenAI (for food recognition + recipe generation)

Cloudinary (for image upload)

Goal: ship a working MVP mobile app that a normal user can download and use to answer:

“What should I cook today, and how do I cook it?”

1. Product Goal & User Scenarios
Main product goal

Help users decide what to cook and how to cook it with as little thinking as possible.

Core user scenarios (must be fully supported)

No idea what to cook (main scenario)

User opens the app after work/school with no plan.

App shows daily suggestions for Breakfast / Lunch / Dinner that fit their preferences.

User has a photo of a dish

User takes or uploads a photo of a dish (e.g., pizza, bibimbap).

App analyzes the image → identifies the dish → generates a recipe with ingredients + steps.

User knows the name of a dish

User types “Bibimbap”, “Pepperoni Pizza”, “Chicken Curry”, etc.

App finds matching recipes and lets them open one and cook it.

2. Current State Summary

From repo + actual usage:

2.1 Things that already work (keep and improve)

Auth flow exists and basic login/register works.

Home screen layout is implemented:

Shows greeting: “Good morning, Roch!”

Shows horizontal categories (All, Breakfast, Lunch, …).

Shows recipe cards on Home (e.g., “Bibimbap”).

Recipe Details screen exists:

Shows image, name, description, time, difficulty, servings, ingredients, instructions.

Food Recognition:

User can pick/take a picture.

Analysis now works: e.g., pizza photo → “Pepperoni Pizza (95% confidence)” → generated recipe.

2.2 Things that are broken or incomplete

Search is broken / inconsistent

Example: “Bibimbap” appears on Home.

When searching “Bib…” in the Search tab, it shows “No recipes found”.

This means existing recipes are not searchable (DB/endpoint or mobile logic is wrong).

Notification badge is fake

Logged out: bell icon without red dot.

Logged in: red dot appears, but tapping the bell shows “No new notifications”.

There is no real notification system; badge is hardcoded.

Food Recognition image mismatch

Analysis works and returns a correct dish name + recipe.

But the image shown on some generated recipe details can be from a previous recognition, not the current dish.

“Start Cooking” is not implemented

Button exists on Recipe Details.

Tapping it shows a “Feature Coming Soon – cooking timer and step-by-step guide coming soon!” alert.

This is blocking and feels fake; instructions are already on the screen.

Spinner on image analysis is static

“Analyzing image…” shows what looks like a spinner, but it does not animate.

UX feels frozen.

Meal planning is partially implemented

UI exists (calendar, breakfast/lunch/dinner slots).

Some actions show “Coming Soon” (e.g., grocery list generation).

We don’t need a full smart planner yet, but the basic UX must not rely on “coming soon” popups.

3. MVP Features (What must work end-to-end)
3.1 Authentication & User Profile

Use the existing auth design in AUTHENTICATION.md.

Requirements:

Email/password sign up and login work from mobile app.

When credentials are invalid or email is already used:

Show clear error messages in the UI (not generic or silent).

After the first login, user can set and update:

Diet: none | vegetarian | vegan | halal | gluten-free | other

Allergies: multi-select (nuts, shellfish, dairy, eggs, gluten, etc.)

Disliked ingredients: free-text list

Behavior:

These preferences are stored in DB (use existing tables/columns, or extend schema if needed).

API must return these preferences to the mobile app and use them in recommendations and search filters.

3.2 Home Screen – Daily Suggestions (Scenario 1)

UI:

Greet the logged-in user by name.

Horizontal category chips: All / Breakfast / Lunch / Dinner / etc.

Under that, show recipe cards (list/grid) for the selected category (as already designed).

Backend behavior:

Mobile calls something like:
GET /api/recommendations/today or GET /api/recipes?category=<...>

The backend:

Looks at user preferences (diet, allergies, dislikes).

Fetches recipes from DB (and optionally from external APIs in the future).

Filters out recipes with disallowed ingredients.

Returns a list of normalized recipe objects.

MVP requirement:

Home must reliably show recipes from the DB.

Any recipe shown on Home must also be searchable by its title.

3.3 Search – Name-based search (Scenario 3)

Current issue:
Search says “No recipes found” even for recipes that exist on Home (e.g., Bibimbap).

MVP requirements:

Implement a working search endpoint and fix the mobile Search screen.

Backend:

Endpoint:
GET /api/recipes?query=<text>&category=<optional>

Behavior:

Search recipe title (and optionally description) by partial match.

Case-insensitive.

Return the same recipe format as used on Home.

Mobile:

Search screen shows:

Search bar (placeholder: “Search for a dish…”).

If results exist: list of recipe cards (like Home cards).

If no results:

“No recipes found. Try different search terms or adjust your filters.”

Important constraint:

If a recipe is visible on Home, searching for its name must return it.

Example test:

“Bibimbap” visible on Home.

Search → type “Bibimbap” → that recipe appears.

3.4 Recipe Details & Favorites

Recipe Details is already implemented visually; we need to complete the behavior.

UI details (keep):

Recipe image

Title, cuisine, time, difficulty, servings

Description

Nutritional info if available (calories, protein, carbs, fat)

Ingredients list (quantity + unit + ingredient)

Instructions list (numbered steps)

Heart icon (favorite)

“Start Cooking” button (see section 3.7)

Backend:

GET /api/recipes/:id returns full recipe details.

Favorites:

GET /api/favorites – list of recipes saved by current user.

POST /api/favorites – save recipe { recipeId }.

DELETE /api/favorites/:recipeId – remove saved recipe.

MVP behavior:

Tapping heart on a recipe toggles favorite:

On success: icon updates immediately.

On error: show a clear error message (“Couldn’t save this recipe, please try again.”).

Favorites tab:

Shows list of all saved recipes.

Empty state if no favorites.

No fetch errors in normal conditions.

Also ensure data consistency:
If the detail screen shows “Pepperoni Pizza”, the ingredients and instructions must describe pizza, not another dish.

3.5 Food Recognition – Photo → Dish → Recipe (Scenario 2)

Food recognition is already functioning, we only need to make it robust and consistent.

Flow:

User taps “Scan Food” on Home or Profile.

User takes a photo or selects one from gallery.

Mobile uploads the image (Cloudinary or direct to backend).

Backend endpoint (e.g., POST /api/ai/analyze-image):

Uses OpenAI vision to:

Detect dish name.

Optional: detect some ingredients and cuisine.

Option A: if dish exists in DB, return that recipe.

Option B: if not, generate a new structured recipe (ingredients + steps + meta).

App shows Analysis Results screen:

Photo of the dish.

Dish name, confidence %, cuisine, difficulty.

List of detected ingredients.

Button: “View Generated Recipe”.

Tapping “View Generated Recipe” opens Recipe Details screen for this dish.

MVP fixes required:

Image mapping bug

For each analysis request, tie the current photo to the generated recipe.

When the user opens the generated recipe, the header image should:

Preferably be the original photo they took, OR

Be another image chosen/generated for that dish — but it must correspond to the current detection, not a previous one.

Ensure that scanning Dish A then Dish B does not reuse Dish A’s picture in Dish B’s detail.

Spinner animation

Replace static icon with a real animated spinner during analysis.

Spinner should be visible and moving while the request is pending, and disappear when results appear.

Error handling

If image cannot be analyzed (low confidence, network error, OpenAI error):

Show a clear message like:

“We couldn’t analyze this photo. Make sure the dish is clearly visible and try again.”

Avoid generic “Error” modals with no explanation.

3.6 Meal Planning (simple MVP)

We do not need a full smart planner yet, but what is present should be real, not fake.

MVP behavior:

User can select a date and assign recipes to:

Breakfast

Lunch

Dinner

Data is saved in DB and can be fetched again.

User can see which recipes are planned for a specific day.

UI:

Use the existing calendar + meal slots layout.

When user taps a “+” in a slot:

Show a simple recipe picker or search.

After selection, show that recipe name in the slot.

Important:
Remove or hide “Coming Soon” popups in this flow for MVP.
If you can’t implement grocery list generation now, hide that button instead of showing “coming soon”.

3.7 Start Cooking – no more “coming soon”

Currently, tapping “Start Cooking” shows a “Feature Coming Soon” alert, even though instructions are present.

MVP requirement:

Replace this with a very simple but real behavior.

Options (choose one):

Option 1 (simplest):

On tap:

Scroll the screen to the “Instructions” section.

Optionally highlight step 1 briefly.

No modal, no coming-soon message.

Option 2 (slightly better):

Open a “Cooking Mode” view:

Shows one step at a time.

“Next” / “Previous” buttons.

Optional very basic timer (but timer is not required for MVP).

In any case: remove “Feature Coming Soon” from the Start Cooking button.

3.8 Notifications

Currently:

Logged-in users see a red badge on the bell, but opening notifications shows “No new notifications”.

MVP requirement:

Either:

No real notifications implemented → remove the fake badge.

Show just a plain bell icon with no red dot.

If the user taps it, show something honest like:

“You don’t have any notifications yet.”

Or implement real notifications:

Store notifications in DB.

Show the red badge only if there are unread notifications.

The modal should list them.

For MVP, option (1) is enough and simpler.

4. Technical Expectations
4.1 Backend (apps/web)

Use existing Node + Postgres setup and environment variables.

Ensure these endpoints exist and behave as described:

Auth / user:

POST /api/auth/signup

POST /api/auth/login

GET /api/user/me

PUT /api/user/me (for preferences)

Recipes:

GET /api/recipes?query=&category= – search/list

GET /api/recipes/:id – details

Favorites:

GET /api/favorites

POST /api/favorites

DELETE /api/favorites/:recipeId

AI:

POST /api/ai/analyze-image – image → dish + recipe

Meal plans (basic):

GET /api/meal-plans?from=&to=

POST /api/meal-plans (create/update entries for a day + slot)

Also:

Fix any SQL issues (e.g. using Neon tag correctly, or equivalent).

Replace any leftover “CreateAnything-specific” logic in recommendations with standard OpenAI + DB usage.

Always return clear JSON error messages with appropriate HTTP status codes.

4.2 Mobile app (apps/mobile)

Use EXPO_PUBLIC_API_URL (or existing config) for API base URL.

Make sure all tabs work:

Home

Search

Saved

Profile

Food Recognition

Meal Planning

Every screen must handle:

Loading state

Error state (with user-friendly text)

Empty state (no recipes, no favorites, etc.)

5. Definition of “MVP Done”

From a real user’s perspective, the app is MVP-ready when:

I can sign up, log in, and see my name on Home.

I can set my diet/allergies and they persist.

Home shows meal ideas, and these recipes open correctly.

Search returns recipes that I see on Home (e.g., “Bibimbap”).

I can open a recipe, see accurate ingredients and steps, and save/unsave it to favorites.

Favorites tab always loads my saved recipes (no random errors).

I can scan a dish photo and get a correct dish name, a recipe, and a matching image for that scan.

“Start Cooking” does something real (scrolls to steps or opens a simple step-by-step view).

Meal planning lets me attach recipes to days and see them later, with no “coming soon” blocking core actions.

The notification bell has no fake badge; either no badge or real notifications.

There are no “App error detected” overlays or blank screens in normal usage.