# Our Recipes

A tiny static recipe site for the two of us. No backend, no database, no framework,
no build step — just HTML/CSS/JS and one JSON file. Lives at
**https://awkto.github.io/recipes/**.

```
index.html      home page — list, search, tag filter
list.html       mobile shopping-list checklist (one per recipe, ticks saved on the phone)
app.js          renders the recipe pages
style.css       styling (warm, print-friendly)
recipes.json    ← all the recipes live here
scripts/        validate-recipes.py — schema check, runs in CI
```

## Adding or editing a recipe

Everything lives in `recipes.json` — one object per recipe. Edit it, validate, commit,
push. Only `id`, `title`, `ingredients` and `steps` are required; the rest are optional.

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

- **`id`** — required, unique, URL-friendly (lowercase words separated by dashes). It
  becomes the link: `awkto.github.io/recipes/#/recipe/banana-bread`.
- **`title`** — required, a string.
- **`ingredients`** — required, non-empty. Either a flat list of strings, **or** groups:
  `[{ "group": "The sauce", "items": ["...", "..."] }, ...]`. The gyro uses groups.
- **`steps`** — required, a list of strings.
- **`tags`** — optional list of strings; powers the filter chips and search on the home page.
- **`variations`** — optional; add these once you've made it a few times. Each is a
  string, or `{ "title": "...", "body": "..." }`. They show as their own section.
- **`shopping`** — optional; if present, the recipe gets a **🛒 Shopping list** button
  that opens `list.html` as a tickable, phone-friendly checklist. Each entry is
  `{ "section": "...", "items": [...] }` and every item needs at least a `name`
  (`amt` and `hint` are optional). Ticks are saved in the browser (localStorage), so
  you can check things off as you walk the aisles.
- `description`, `servings`, `prepTime`, `marinateTime`, `cookTime` and `notes` are all
  optional free-form extras.

Write real unicode straight into the file — `—`, `–`, `°C`, `½` — rather than `\u`
escapes, and keep the 2-space indent.

## Validating

A stray comma in `recipes.json` blanks the entire site, so check before you push:

```sh
python3 -m json.tool recipes.json      # is it even JSON?
python3 scripts/validate-recipes.py    # does it match the schema above?
```

The validator prints readable errors and exits non-zero if anything is wrong. Unknown
top-level keys are warnings, not errors. It defaults to the repo's `recipes.json`;
pass a path to check a different file. Both commands also run in CI on every push and
pull request, and a failing check blocks the deploy.

## Running locally

Because the pages fetch `recipes.json`, open through a server, not `file://`:

```sh
python3 -m http.server 8000   # then visit http://localhost:8000
```

## Deployment

The site is published to **GitHub Pages** by `.github/workflows/pages.yml` on every
push to `main` (and on demand via *Actions → Deploy to GitHub Pages → Run workflow*).
Pull requests run the validation job only — they never deploy.

The deploy job stages `index.html`, `list.html`, `app.js`, `style.css` and
`recipes.json` into `_site/` and uploads only that, so `scripts/`, `.github/` and this
README aren't served.

**One-time setup:** in the repo's **Settings → Pages**, set **Source** to
**"GitHub Actions"**. Without that the workflow has nothing to deploy into.

So the whole workflow is: **edit `recipes.json` → validate → `git push` → live once the
Action finishes.**
