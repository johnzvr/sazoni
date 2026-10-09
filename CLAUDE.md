# Sazoni

App personal de John (PWA estática en GitHub Pages) para guardar recetas, notas y guías que salen de sus chats con Claude, más una lista de compras. John dirige arte y UX; Claude implementa. Siempre en español neutro o peruano.

## Flujo "guárdala en Sazoni"

Cuando John pida guardar algo:

1. Convierte el contenido a una ficha JSON según `SCHEMA.md`.
   - Receta → `data/recetas/<id>.json`
   - Nota o guía → `data/notas/<id>.json`
   - `id` en kebab-case sin tildes, igual al nombre del archivo.
   - `created` = fecha de hoy (YYYY-MM-DD, hora de Lima).
2. Corre `node tools/build-index.mjs`. Valida las fichas y regenera `data/index.json`. Si falla, corrige y vuelve a correr.
3. Commit con un mensaje corto, por ejemplo `Receta: Ají de gallina`, y push a `main`.
4. Confírmale a John en una línea que ya está en el app (Pages tarda alrededor de un minuto).

Para editar una ficha existente ("ponle 3 ajíes"), cambia solo el campo necesario, vuelve a correr el índice y haz commit.

## Reglas de contenido

- Cantidades como número (`0.5`, no `"1/2"`); el app muestra fracciones. `null` cuando es "al gusto".
- Cada ingrediente lleva `aisle`: `mercado`, `bodega` o `despensa`. Así se agrupa la lista de compras.
- Si un paso tiene una espera concreta, ponla en `timer_min`. Si usa ingredientes, nómbralos en `uses` con el mismo texto de `name`.
- `category`: `fondos`, `entradas`, `postres`, `bebidas` u `otros`.

## Código

- Sin build ni dependencias: `index.html`, `styles.css`, `app.js`, `sw.js`.
- El estado del usuario (marcados, porciones, favoritas, compras) vive en `localStorage` del teléfono, nunca en el repo.
- Al cambiar archivos del app, sube `CACHE_VERSION` en `sw.js`.
- Paleta: azul marino `#14213D`, naranja `#E85A1F`, amarillo ají `#FFC94A`, durazno `#FFC7A8`, rosa `#F6C0D6`, celeste `#C3D0F4`, crema `#FAF3E4`. Sin verdes.
- Tipografía: Archivo (900, ancho 110-115 %) para títulos en mayúsculas; Instrument Sans para texto.
