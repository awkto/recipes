"use strict";

const app = document.getElementById("app");
let RECIPES = [];
let activeTag = null;

// ---- Data loading -----------------------------------------------------------
fetch("recipes.json", { cache: "no-cache" })
  .then((r) => {
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r.json();
  })
  .then((data) => {
    RECIPES = Array.isArray(data) ? data : [];
    router();
  })
  .catch((err) => {
    app.innerHTML =
      '<p class="empty">Could not load recipes.json — ' + escapeHtml(err.message) + "</p>";
  });

window.addEventListener("hashchange", router);

// ---- Router -----------------------------------------------------------------
function router() {
  const hash = location.hash.replace(/^#\/?/, "");
  const parts = hash.split("/").filter(Boolean);

  if (parts[0] === "recipe" && parts[1]) {
    renderRecipe(decodeURIComponent(parts[1]));
  } else {
    renderList();
  }
  window.scrollTo(0, 0);
}

// ---- List view --------------------------------------------------------------
function renderList() {
  document.title = "Our Recipes";
  const allTags = [...new Set(RECIPES.flatMap((r) => r.tags || []))].sort();

  const tagRow = allTags
    .map(
      (t) =>
        '<button class="tag-chip' +
        (t === activeTag ? " active" : "") +
        '" data-tag="' +
        escapeHtml(t) +
        '">' +
        escapeHtml(t) +
        "</button>"
    )
    .join("");

  app.innerHTML =
    '<div class="toolbar">' +
    '<input class="search" id="search" type="search" placeholder="Search recipes or ingredients…" autocomplete="off">' +
    '<div class="tags-row">' +
    tagRow +
    "</div></div>" +
    '<div class="grid" id="grid"></div>';

  const search = document.getElementById("search");
  search.addEventListener("input", () => drawCards(search.value));

  app.querySelectorAll(".tag-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const t = chip.dataset.tag;
      activeTag = activeTag === t ? null : t;
      renderList();
      drawCards("");
    });
  });

  drawCards("");
}

function drawCards(query) {
  const q = (query || "").trim().toLowerCase();
  const grid = document.getElementById("grid");

  const matches = RECIPES.filter((r) => {
    if (activeTag && !(r.tags || []).includes(activeTag)) return false;
    if (!q) return true;
    const hay = [
      r.title,
      r.description,
      (r.tags || []).join(" "),
      ingredientLines(r).join(" "),
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });

  if (!matches.length) {
    grid.innerHTML = '<p class="empty">No recipes match.</p>';
    return;
  }

  grid.innerHTML = matches
    .map((r) => {
      const miniTags = (r.tags || [])
        .map((t) => '<span class="mini-tag">' + escapeHtml(t) + "</span>")
        .join("");
      const timeBits = [];
      if (r.prepTime) timeBits.push("Prep " + escapeHtml(r.prepTime));
      if (r.cookTime) timeBits.push("Cook " + escapeHtml(r.cookTime));
      return (
        '<a class="card" href="#/recipe/' +
        encodeURIComponent(r.id) +
        '">' +
        "<h2>" +
        escapeHtml(r.title) +
        "</h2>" +
        (r.description ? "<p>" + escapeHtml(r.description) + "</p>" : "") +
        '<div class="meta">' +
        timeBits.join(" · ") +
        "</div>" +
        '<div class="mini-tags">' +
        miniTags +
        "</div>" +
        "</a>"
      );
    })
    .join("");
}

// ---- Detail view ------------------------------------------------------------
function renderRecipe(id) {
  const r = RECIPES.find((x) => x.id === id);
  if (!r) {
    app.innerHTML =
      '<a class="back" href="#/">← All recipes</a><p class="empty">Recipe not found.</p>';
    return;
  }
  document.title = r.title + " · Our Recipes";

  const stats = [
    r.servings ? ["Servings", r.servings] : null,
    r.prepTime ? ["Prep", r.prepTime] : null,
    r.marinateTime ? ["Marinate", r.marinateTime] : null,
    r.cookTime ? ["Cook", r.cookTime] : null,
  ].filter(Boolean);

  const statsHtml = stats
    .map(
      (s) =>
        '<div class="stat"><span class="label">' +
        escapeHtml(String(s[0])) +
        '</span><span class="value">' +
        escapeHtml(String(s[1])) +
        "</span></div>"
    )
    .join("");

  const steps = (r.steps || []).map((s) => "<li>" + escapeHtml(s) + "</li>").join("");

  const shopBtn =
    r.shopping && r.shopping.length
      ? '<a class="shop-btn" href="list.html?r=' +
        encodeURIComponent(r.id) +
        '">🛒 Shopping list</a>'
      : "";

  app.innerHTML =
    '<a class="back" href="#/">← All recipes</a>' +
    '<div class="detail-actions">' +
    shopBtn +
    '<button class="print-btn" onclick="window.print()">Print</button>' +
    "</div>" +
    '<h1 class="recipe-title">' +
    escapeHtml(r.title) +
    "</h1>" +
    (r.description
      ? '<p class="recipe-desc">' + escapeHtml(r.description) + "</p>"
      : "") +
    (statsHtml ? '<div class="stats">' + statsHtml + "</div>" : "") +
    (r.ingredients && r.ingredients.length
      ? '<h2 class="section-title">Ingredients</h2>' + renderIngredients(r.ingredients)
      : "") +
    (steps
      ? '<h2 class="section-title">Method</h2><ol class="steps">' + steps + "</ol>"
      : "") +
    renderVariations(r.variations) +
    (r.notes
      ? '<div class="notes"><strong>Notes:</strong> ' + escapeHtml(r.notes) + "</div>"
      : "");
}

// Optional: recipe variations, added over time. Each is a string or {title, body}.
function renderVariations(vars) {
  if (!vars || !vars.length) return "";
  const items = vars
    .map((v) => {
      if (typeof v === "string") return "<li>" + escapeHtml(v) + "</li>";
      return (
        "<li>" +
        (v.title ? "<strong>" + escapeHtml(v.title) + ".</strong> " : "") +
        escapeHtml(v.body || "") +
        "</li>"
      );
    })
    .join("");
  return '<h2 class="section-title">Variations</h2><ul class="variations">' + items + "</ul>";
}

// Ingredients can be a flat array of strings, or groups of {group, items:[...]}.
function renderIngredients(ings) {
  const isGrouped = ings.some((x) => x && typeof x === "object" && x.items);
  if (!isGrouped) {
    return (
      '<ul class="ingredients">' +
      ings.map((i) => "<li>" + escapeHtml(i) + "</li>").join("") +
      "</ul>"
    );
  }
  return ings
    .map((g) => {
      if (typeof g === "string") {
        return '<ul class="ingredients"><li>' + escapeHtml(g) + "</li></ul>";
      }
      return (
        '<h3 class="ing-group">' +
        escapeHtml(g.group || "") +
        '</h3><ul class="ingredients">' +
        (g.items || []).map((i) => "<li>" + escapeHtml(i) + "</li>").join("") +
        "</ul>"
      );
    })
    .join("");
}

// Flatten ingredients to plain strings for search.
function ingredientLines(r) {
  const out = [];
  (r.ingredients || []).forEach((x) => {
    if (typeof x === "string") out.push(x);
    else if (x && x.items) x.items.forEach((i) => out.push(i));
  });
  return out;
}

// ---- Utils ------------------------------------------------------------------
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
