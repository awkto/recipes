#!/usr/bin/env python3
"""Validate recipes.json against the schema the site expects.

The site fetches recipes.json at page load and renders straight from it, so a
malformed file blanks the whole site with no error a reader would understand.
This catches the breakage before it ships.

Exits 0 if the file is valid (warnings are allowed), 1 otherwise.
"""

import json
import re
import sys
from pathlib import Path

REQUIRED = ["id", "title", "ingredients", "steps"]
OPTIONAL = [
    "description",
    "servings",
    "prepTime",
    "marinateTime",
    "cookTime",
    "tags",
    "variations",
    "notes",
    "shopping",
]
ID_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")

DEFAULT_PATH = Path(__file__).resolve().parent.parent / "recipes.json"

errors = []
warnings = []


def err(where, message):
    errors.append(f"{where}: {message}")


def warn(where, message):
    warnings.append(f"{where}: {message}")


def is_str_list(value):
    return isinstance(value, list) and all(isinstance(v, str) for v in value)


def check_ingredients(where, ingredients):
    if not isinstance(ingredients, list) or not ingredients:
        err(where, "'ingredients' must be a non-empty list")
        return
    for i, item in enumerate(ingredients):
        at = f"{where} ingredients[{i}]"
        if isinstance(item, str):
            continue
        if not isinstance(item, dict):
            err(at, "must be a string or a {group, items} object, "
                    f"got {type(item).__name__}")
            continue
        if "group" not in item:
            err(at, "group object is missing 'group'")
        elif not isinstance(item["group"], str):
            err(at, "'group' must be a string")
        if "items" not in item:
            err(at, "group object is missing 'items'")
        elif not is_str_list(item["items"]):
            err(at, "'items' must be a list of strings")
        elif not item["items"]:
            err(at, "'items' is empty")


def check_shopping(where, shopping):
    if not isinstance(shopping, list):
        err(where, "'shopping' must be a list")
        return
    for i, entry in enumerate(shopping):
        at = f"{where} shopping[{i}]"
        if not isinstance(entry, dict):
            err(at, f"must be a {{section, items}} object, got {type(entry).__name__}")
            continue
        if "section" not in entry:
            err(at, "missing 'section'")
        elif not isinstance(entry["section"], str):
            err(at, "'section' must be a string")
        if "items" not in entry:
            err(at, "missing 'items'")
            continue
        if not isinstance(entry["items"], list):
            err(at, "'items' must be a list")
            continue
        for j, item in enumerate(entry["items"]):
            item_at = f"{at} items[{j}]"
            if not isinstance(item, dict):
                err(item_at, f"must be an object with a 'name', got {type(item).__name__}")
                continue
            if not item.get("name"):
                err(item_at, "missing a non-empty 'name'")
            elif not isinstance(item["name"], str):
                err(item_at, "'name' must be a string")


def check_recipe(index, recipe, seen_ids):
    where = f"recipe[{index}]"
    if not isinstance(recipe, dict):
        err(where, f"must be an object, got {type(recipe).__name__}")
        return

    # Prefer the id for the label once we know it's usable.
    rid = recipe.get("id")
    if isinstance(rid, str) and rid:
        where = f"recipe[{index}] ({rid})"

    for field in REQUIRED:
        if field not in recipe:
            err(where, f"missing required field '{field}'")

    for key in recipe:
        if key not in REQUIRED and key not in OPTIONAL:
            warn(where, f"unknown top-level key '{key}'")

    if "id" in recipe:
        if not isinstance(rid, str):
            err(where, "'id' must be a string")
        elif not ID_RE.match(rid):
            err(where, f"'id' must be lowercase words separated by dashes, got '{rid}'")
        elif rid in seen_ids:
            err(where, f"duplicate id '{rid}' (also recipe[{seen_ids[rid]}])")
        if isinstance(rid, str) and rid not in seen_ids:
            seen_ids[rid] = index

    if "title" in recipe and not isinstance(recipe["title"], str):
        err(where, "'title' must be a string")

    if "ingredients" in recipe:
        check_ingredients(where, recipe["ingredients"])

    if "steps" in recipe and not is_str_list(recipe["steps"]):
        err(where, "'steps' must be a list of strings")

    if "tags" in recipe and not is_str_list(recipe["tags"]):
        err(where, "'tags' must be a list of strings")

    if "shopping" in recipe:
        check_shopping(where, recipe["shopping"])


def main():
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_PATH

    try:
        raw = path.read_text(encoding="utf-8")
    except OSError as e:
        print(f"error: cannot read {path}: {e}", file=sys.stderr)
        return 1

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        print(f"error: {path} is not valid JSON: line {e.lineno} column {e.colno}: {e.msg}",
              file=sys.stderr)
        return 1

    if not isinstance(data, list):
        print(f"error: {path} must be a JSON array of recipes, "
              f"got {type(data).__name__}", file=sys.stderr)
        return 1

    seen_ids = {}
    for i, recipe in enumerate(data):
        check_recipe(i, recipe, seen_ids)

    for w in warnings:
        print(f"warning: {w}", file=sys.stderr)

    if errors:
        for e in errors:
            print(f"error: {e}", file=sys.stderr)
        print(f"\n{len(errors)} error(s) in {path}", file=sys.stderr)
        return 1

    print(f"ok: {len(data)} recipe(s) valid in {path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
