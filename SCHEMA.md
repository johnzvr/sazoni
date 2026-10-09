# Esquema de fichas

## Receta (`data/recetas/<id>.json`)

```json
{
  "id": "aji-de-gallina",
  "type": "receta",
  "title": "Ají de gallina",
  "summary": "Una o dos líneas que describen el plato.",
  "category": "fondos",
  "cuisine": "criolla",
  "time_min": 50,
  "difficulty": "Fácil | Media | Difícil",
  "servings": 4,
  "macros": { "per": "porción", "kcal": 720, "protein": 42, "carbs": 62, "fat": 33 },
  "tags": ["pollo", "almuerzo"],
  "created": "2026-10-08T21:40",
  "ingredients": [
    {
      "group": "Para el guiso",
      "items": [
        { "qty": 600, "unit": "g", "name": "pechuga de pollo", "note": "opcional", "aisle": "mercado" },
        { "qty": null, "unit": "", "name": "sal y pimienta", "note": "al gusto", "aisle": "despensa" }
      ]
    }
  ],
  "steps": [
    { "text": "Instrucción del paso.", "timer_min": 20, "uses": ["pechuga de pollo"] }
  ],
  "tips": ["Consejo opcional."]
}
```

| Campo | Obligatorio | Notas |
|---|---|---|
| `id` | sí | kebab-case, igual al nombre del archivo |
| `category` | sí | `fondos`, `entradas`, `postres`, `bebidas`, `otros` |
| `servings` | recomendado | base para escalar porciones |
| `macros` | recomendado | estimado por porción: `kcal`, `protein`, `carbs`, `fat` (g); `per` nombra la porción ("porción", "hot dog", "vaso") |
| `created` | sí | `YYYY-MM-DDTHH:mm` en hora de Lima; ordena la lista y decide la "recién guardada" |
| `ingredients[].items[].qty` | sí | número o `null` |
| `ingredients[].items[].unit` | sí | `g`, `kg`, `ml`, `taza`, `cda`, `cdta`, `dientes`, `latas`… o `""` para unidades sueltas |
| `ingredients[].items[].aisle` | sí | `mercado`, `bodega`, `despensa` |
| `steps[].timer_min` | no | minutos del temporizador del paso |
| `steps[].uses` | no | nombres exactos de ingredientes que se usan en el paso |

## Nota o guía (`data/notas/<id>.json`)

```json
{
  "id": "papa-amarilla-entera",
  "type": "guia",
  "title": "Papa amarilla que no se deshaga",
  "summary": "Una línea.",
  "tags": ["papa"],
  "created": "2026-10-08",
  "steps": ["Paso 1", "Paso 2"],
  "body": "Texto libre. Párrafos separados con \\n\\n."
}
```

- `type`: `guia` cuando el contenido es un procedimiento con pasos y `nota` cuando es texto libre.
- Una guía usa `steps`; una nota usa `body`. Pueden convivir.
