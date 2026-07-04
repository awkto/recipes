# Our Recipes

A tiny static recipe site for the two of us. No backend, no database, no framework,
no build step — just HTML/CSS/JS and one JSON file. Lives at
**https://recipes.box.dnsif.ca**.

```
index.html      home page — list, search, tag filter
list.html       mobile shopping-list checklist (one per recipe, ticks saved on the phone)
app.js          renders the recipe pages
style.css       styling (warm, print-friendly)
recipes.json    ← all the recipes live here
```

## Adding or editing a recipe

Everything lives in `recipes.json` — one object per recipe. Edit it, commit, push.
The box picks up the change within 5 minutes (see Deployment). Only `id`, `title`,
`ingredients` and `steps` are required; the rest are optional.

```json
{
  "id": "banana-bread",
  "title": "Banana Bread",
  "description": "Uses up those brown bananas.",
  "servings": 8,
  "prepTime": "10 min",
  "marinateTime": "20 min",
  "cookTime": "55 min",
  "tags": ["baking", "vegetarian"],
  "ingredients": ["3 ripe bananas", "..."],
  "steps": ["Heat oven to 175°C.", "..."],
  "variations": [
    { "title": "Chocolate chip", "body": "Fold in a handful of dark chocolate before baking." }
  ],
  "notes": "Freezes well.",
  "shopping": [
    { "section": "Fruit & Veg", "items": [
      { "name": "Bananas", "amt": "3 ripe", "hint": "the browner the better" }
    ]}
  ]
}
```

Field notes:

- **`id`** — unique, URL-friendly (lowercase, dashes). It becomes the link:
  `recipes.box.dnsif.ca/#/recipe/banana-bread`.
- **`ingredients`** — either a flat list of strings, **or** groups:
  `[{ "group": "The sauce", "items": ["...", "..."] }, ...]`. The gyro uses groups.
- **`variations`** — optional; add these once you've made it a few times. Each is a
  string, or `{ "title": "...", "body": "..." }`. They show as their own section.
- **`shopping`** — optional; if present, the recipe gets a **🛒 Shopping list** button
  that opens `list.html` as a tickable, phone-friendly checklist. Ticks are saved in
  the browser (localStorage), so you can check things off as you walk the aisles.
- `tags` power the filter chips and search on the home page.

Tip: run `python3 -m json.tool recipes.json` after editing to catch typos — a broken
comma will blank the site.

## Running locally

Because the pages fetch `recipes.json`, open through a server, not `file://`:

```sh
python3 -m http.server 8000   # then visit http://localhost:8000
```

## Deployment (how it actually runs)

The site is **static files served straight from a git checkout** — no app process, so
it adds essentially **zero RAM** on the box (which matters: box.dnsif.ca runs on ~1 GB).
This mirrors the existing `learn.dnsif.ca` setup.

- **Repo:** `github.com/awkto/recipes` (public).
- **On the box:** checked out at `/home/altanc/git/recipes`, served by nginx at
  `recipes.box.dnsif.ca` using the wildcard cert (`/etc/nginx/ssl/box.dnsif.ca.*`) and
  wildcard DNS (`*.box.dnsif.ca` → the box). nginx config: `deploy/recipes.box.dnsif.ca`.
- **Auto-pull:** a cron job every 5 minutes does a hard reset to `origin/main`:
  ```
  */5 * * * * cd /home/altanc/git/recipes && git fetch origin -q && git clean -fd -q && git reset --hard origin/main -q
  ```

So the whole workflow is: **edit `recipes.json` → `git push` → live within 5 minutes.**
No SSH, no redeploy. To push a change instantly instead of waiting, SSH in and run the
cron line by hand.
