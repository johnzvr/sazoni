# Sazoni

Recetas, notas, guías y lista de compras de John, guardadas directo desde sus chats con Claude.

- **Ver el app:** https://johnzvr.github.io/sazoni/
- **Instalar en iPhone:** abrir el link en Safari → Compartir → *Agregar a pantalla de inicio*.
- **Guardar una receta:** en un chat con Claude, decir "guárdala en Sazoni".

## Cómo está hecho

PWA estática, sin build ni dependencias.

| Archivo | Qué es |
|---|---|
| `index.html`, `styles.css`, `app.js` | El app |
| `sw.js`, `manifest.webmanifest`, `icons/` | Instalación y uso sin conexión |
| `data/recetas/*.json`, `data/notas/*.json` | Las fichas (ver `SCHEMA.md`) |
| `data/index.json` | Índice generado con `node tools/build-index.mjs` |

Probar en local: `python3 -m http.server 8000` y abrir `http://localhost:8000`.
