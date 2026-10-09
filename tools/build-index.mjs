// Genera data/index.json a partir de data/recetas/*.json y data/notas/*.json.
// Uso: node tools/build-index.mjs   (también valida cada ficha)
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const CATS = ["fondos", "entradas", "postres", "bebidas", "otros"];
const errors = [];

function load(dir) {
  const full = join(root, "data", dir);
  return readdirSync(full)
    .filter((f) => f.endsWith(".json"))
    .map((f) => {
      const path = `data/${dir}/${f}`;
      let doc;
      try { doc = JSON.parse(readFileSync(join(full, f), "utf8")); }
      catch (e) { errors.push(`${path}: JSON inválido (${e.message})`); return null; }
      if (doc.id !== f.replace(/\.json$/, "")) errors.push(`${path}: "id" debe ser igual al nombre del archivo`);
      if (!doc.title) errors.push(`${path}: falta "title"`);
      return { doc, path };
    })
    .filter(Boolean);
}

const recetas = load("recetas").map(({ doc, path }) => {
  if (doc.type !== "receta") errors.push(`${path}: "type" debe ser "receta"`);
  if (!CATS.includes(doc.category)) errors.push(`${path}: "category" debe ser uno de ${CATS.join(", ")}`);
  if (!Array.isArray(doc.ingredients) || !doc.ingredients.length) errors.push(`${path}: faltan "ingredients"`);
  if (!Array.isArray(doc.steps) || !doc.steps.length) errors.push(`${path}: faltan "steps"`);
  if (doc.macros) {
    for (const f of ["kcal", "protein", "carbs", "fat"]) {
      if (typeof doc.macros[f] !== "number") errors.push(`${path}: "macros.${f}" debe ser un número`);
    }
  }
  const ing = (doc.ingredients || []).flatMap((g) => (g.items || []).map((i) => i.name));
  return {
    id: doc.id, type: "receta", file: path, title: doc.title, summary: doc.summary || "",
    category: doc.category, time_min: doc.time_min ?? null, servings: doc.servings ?? null,
    difficulty: doc.difficulty || "", tags: doc.tags || [], created: doc.created || "",
    kcal: doc.macros?.kcal ?? null,
    ingredient_count: ing.length, search: [doc.title, doc.summary, ...(doc.tags || []), ...ing].join(" "),
  };
});

const notas = load("notas").map(({ doc, path }) => {
  if (!["nota", "guia"].includes(doc.type)) errors.push(`${path}: "type" debe ser "nota" o "guia"`);
  return {
    id: doc.id, type: doc.type, file: path, title: doc.title, summary: doc.summary || "",
    tags: doc.tags || [], created: doc.created || "", step_count: (doc.steps || []).length,
    search: [doc.title, doc.summary, ...(doc.tags || []), doc.body || ""].join(" "),
  };
});

if (errors.length) {
  console.error("Errores en las fichas:\n- " + errors.join("\n- "));
  process.exit(1);
}

const byDate = (a, b) => (b.created || "").localeCompare(a.created || "") || a.title.localeCompare(b.title, "es");
const index = { updated: new Date().toISOString(), recetas: recetas.sort(byDate), notas: notas.sort(byDate) };
writeFileSync(join(root, "data", "index.json"), JSON.stringify(index, null, 2) + "\n");
console.log(`index.json: ${recetas.length} recetas, ${notas.length} notas`);
