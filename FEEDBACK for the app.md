FEEDBACK FOR THE APP - STATUS TRACKING
========================================

1 - When I want to add a recipe/food to some days in the Meal planning page, it is pulling up many recipes I never seen since I am logged into my account. (Looks like it is showing me all recipes in the database. Other users recipes too. Which I think shouldn't happen) . Let me know if I am wrong or if I am maybe just tripping.I mean again I am just a tester but you would let me know how things should be or if that is normal or not.
✅ FIXED: Meal planning modal now only shows recipes from user's collections (Favorites, My Creations, Generated, Custom). Matches "My Recipes" page behavior.

2 - When we generate a recipe with the photo or camera feature, we have a section for "similar recipes" which is fine but it looks like it is showing other users recipes as similar recipes which I think is not a good thing. I mean again I am just a tester but you would let me know how things should be or if that is normal or not
✅ FIXED: Similar recipes now only show recipes from user's collections (same as My Recipes page). Privacy issue resolved.

3 - I noticed that when I talk to the app through the Voice input feature, he will get me some result/recipes propositions. However, when I choose one of them, get to that recipe page, and then hit Start cooking, the app crashes, and auto-closes. The same thing is happening after I generate a food with the AI name search and or the Photo recognition...
✅ FIXED: Added robust parsing and normalization for ingredients and instructions data (handles JSONB strings, inconsistent structures). App no longer crashes when starting cooking mode for AI-generated recipes.

4 - What are all the information taken in consideration by the vibe/voice input recipe generator ? Im curious and I am wondering and even guessing he is not taking in consideration all info he has to. Ex: current time. But this is just an example. There might be some other info that it doesn't consider and that I just didn't notice.
⏳ PENDING: Need to investigate what context is currently used and add missing context (time, preferences, etc.)

5 - Again with the voice input/vibe generator, when I finish talking and the bot generate me foods suggestions, there is a button there called View Planner. I don't know what it serves and it feels useless.... When I click it, it just bring me back to the home page. Could we replace it with something else that will be more useful for this app ? Otherwise delete it ?
✅ FIXED: "View Planner" button now navigates to meal planning page instead of just closing the modal. More useful functionality.

6  - Again with the voice input/vibe generator, when I finish talking and the bot gives me some suggestions, when I clik on save the recipe, it says, okay it is saved successfully but when I go to MyRecipe page, nthing there. The same thing is happenig when I generate the recipe with the Ai name search or even the AI photo recognition.
✅ FIXED: 
- Auto-creates "Generated" collection if missing when saving recipes
- Invalidates React Query cache after saving so MyRecipe page refreshes automatically
- All 3 system collections (Favorites, My Creations, Generated) now auto-created for all users (new and existing)

7 - Could we have a light, dark, and system mode in the app ? It needs to be well implemented though. You may ask a designer to help you out. 
⏳ PENDING: Theme support (light/dark/system) needs to be implemented.

ADDITIONAL FIXES:
- All 3 system collections (Favorites, My Creations, Generated) are now automatically created for all users when they access MyRecipe page or use related features
- Replaced "AI-Generated" badge with "Smart Recipe" for better customer experience






Others errors that my testers have found 

8 - When they try to scan a photo and get a recipe with our photo recognition featuere, it spin spin spin and then shows Analysis failed.
When I looked at the server I saw this log for the food they were trying to scan
Processing food recognition for image: https://res.cloudinary.com/dui3u9g4j/image/upload/v1768086220/recipe-app/b5tzerqrhlozd4mpc8fv.jpg
Parsed analysis: {
  dish_name: 'Spaghetti Bolognese',
  detected_ingredients: [
    'spaghetti',
    'ground beef',
    'tomato sauce',
    'parmesan cheese',
    'herbs'
  ],
  confidence: 0.95,
  cuisine: 'Italian',
  difficulty: 'easy',
  estimated_time: 30,
  category: 'dinner'
}
Error in food recognition: error: for SELECT DISTINCT, ORDER BY expressions must appear in select list
    at /opt/render/project/src/apps/web/node_modules/pg-pool/index.js:45:11
    at process.processTicksAndRejections (node:internal/process/task_queues:105:5)
    at async Module.POST (file:///opt/render/project/src/apps/web/src/app/api/food-recognition/route.js?update=1767963099432:172:9)
    at async handler (file:///opt/render/project/src/apps/web/build/server/index.js:926:20)
    at async dispatch (file:///opt/render/project/src/apps/web/node_modules/hono/dist/compose.js:22:17)
    at async cors2 (file:///opt/render/project/src/apps/web/node_modules/hono/dist/middleware/cors/index.js:79:5)
    at async dispatch (file:///opt/render/project/src/apps/web/node_modules/hono/dist/compose.js:22:17)
    at async cors2 (file:///opt/render/project/src/apps/web/node_modules/hono/dist/middleware/cors/index.js:79:5)
    at async dispatch (file:///opt/render/project/src/apps/web/node_modules/hono/dist/compose.js:22:17)
    at async file:///opt/render/project/src/apps/web/node_modules/@hono/auth-js/dist/index.js:85:5 {
  length: 148,
  severity: 'ERROR',
  code: '42P10',
  detail: undefined,
  hint: undefined,
  position: '608',
  internalPosition: undefined,
  internalQuery: undefined,
  where: undefined,
  schema: undefined,
  table: undefined,
  column: undefined,
  dataType: undefined,
  constraint: undefined,
  file: 'parse_clause.c',
  line: '3013',
  routine: 'transformDistinctClause'
}



9 - Refreshing issue: this is an issue I talked about already regarding how data are on the MyRecipes page.
THey do not refresh after a change is made. 
To explain in detail, the user created a recipe in a collection, he came back, click on the trah button to delete it. Click confirm on the modal that appear. After that, he was still seeing the recipe on the page so he went ahead and clicked again on the Delete button. Then, the apps said that "No recipes found" (which may make sense because in the back when the user deleted it the first it was deleted but just not updated on the screen). Now something else that is happening though is, that when the user fold, and then unfold the collection/folder, the recipe disappear (looks like it updates now.) However again, even after that updates, the collection still count 1 recipe like if the recipe was still there but it is no longer there. 
Does it make sense overall ? If not - ask questions.


10 - This is something happening the first time the user opens the app and want to talk to the AI vibe by using our voice input. Of course the app asks for authorization, and when we accepts, it gives the app the authorization under the hood but throw an error to the user. I will provide you what the error says when we will get to fizing this but in short, it looks like the apps does receive the authorization that we allowed (since the user is able to talk fine to the vibe and get a result). but the app throws the error because it wanted to use the mic for the first time but the authorization wasnt already granted so it encountered like a blocus which lead to throw that error. Error which happens just the first time th user opens the app and asks for permission (and doesn't actually prevent the user for speaking afterwards when ignored) 

The error pop up says "Recording Error
Failed to start recording: Prepare
encountered an error: Error
Domain=EXModulesErrorDomain
Code=0 "This experience is currently
in the background, so the audio
session could not be activated."
UserInfo={NSLocalizedDescription=Thi
s experience is currently in the
background, so the audio session
could not be activated.}. You can use
the quick suggestions below or try
again.

OK

Try Again"