// Descarga los datos de los 3 boards de Monday.com y genera data/monday-data.json.
// Requiere la variable de entorno MONDAY_API_TOKEN (nunca la incluyas en el código ni la subas al repo).
//
// Uso local (opcional, para probar antes de que corra el GitHub Action):
//   MONDAY_API_TOKEN="tu_token" node scripts/fetch-monday-data.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TOKEN = process.env.MONDAY_API_TOKEN;

if (!TOKEN) {
  console.error("Falta la variable de entorno MONDAY_API_TOKEN.");
  process.exit(1);
}

const BOARDS = [
  { id: 18254196175, name: "Registro Requerimientos", columnIds: ["color_mm60709f", "multiple_person_mm0pjp0", "date_mm60p5g3", "text_mkx0xt5q"] },
  { id: 18425634570, name: "Registro Req. Adicionales", columnIds: ["color_mm638s7q", "multiple_person_mm0pjp0", "date_mm63bz4h", "text_mkx0xt5q"] },
  { id: 18425631515, name: "Registro Incidentes", columnIds: ["color_mm63rtdt", "multiple_person_mm0pjp0", "date_mm632exz", "text_mkx0xt5q", "text_mm60j51z"] }
];

async function fetchBoard(board) {
  const query = `
    query ($boardId: [ID!], $columnIds: [String!]) {
      boards(ids: $boardId) {
        items_page(limit: 500) {
          items {
            id
            name
            url
            created_at
            updated_at
            column_values(ids: $columnIds) {
              id
              text
            }
          }
        }
      }
    }
  `;

  const res = await fetch("https://api.monday.com/v2", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": TOKEN,
      "API-Version": "2024-10"
    },
    body: JSON.stringify({
      query,
      variables: { boardId: [String(board.id)], columnIds: board.columnIds }
    })
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} al consultar el board ${board.name} (${board.id})`);
  }

  const json = await res.json();
  if (json.errors) {
    throw new Error(`Error de Monday API en board ${board.name}: ${JSON.stringify(json.errors)}`);
  }

  const rawItems = json.data?.boards?.[0]?.items_page?.items || [];
  const items = rawItems.map(it => {
    const column_values = {};
    (it.column_values || []).forEach(cv => { column_values[cv.id] = cv.text; });
    return {
      id: it.id,
      name: it.name,
      url: it.url,
      created_at: it.created_at,
      updated_at: it.updated_at,
      column_values
    };
  });

  return { name: board.name, items };
}

async function main() {
  const boards = {};
  for (const board of BOARDS) {
    console.log(`Descargando board ${board.name} (${board.id})...`);
    boards[String(board.id)] = await fetchBoard(board);
  }

  const output = {
    generated_at: new Date().toISOString(),
    boards
  };

  const outPath = path.join(__dirname, "..", "data", "monday-data.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2) + "\n", "utf-8");
  console.log(`Listo. Datos guardados en ${outPath}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
