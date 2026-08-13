# Reporte Ejecutivo — Proyecto GD CPDN

Página estática (GitHub Pages) que muestra el reporte ejecutivo del proyecto GD CPDN a partir de datos de Monday.com. Los datos se refrescan automáticamente mediante un GitHub Action programado — **no se leen en vivo directamente desde el navegador**, por seguridad (ver más abajo).

## Cómo funciona

1. `scripts/fetch-monday-data.mjs` consulta la API de Monday.com (GraphQL) y guarda un snapshot en `data/monday-data.json`.
2. `.github/workflows/update-monday-data.yml` ejecuta ese script cada 5 minutos (y también se puede correr manualmente) usando un token guardado como *secret* del repositorio, y sube el `data/monday-data.json` actualizado.
3. `index.html` es la página que ve el usuario: cada vez que alguien entra (o cada 5 minutos si deja la pestaña abierta, gracias a un auto-refresh incluido en la página), hace `fetch('data/monday-data.json', {cache:'no-store'})` y renderiza el reporte (KPIs, gráficos, tablas) con la última versión disponible.

En la práctica: cualquiera que entre a la página ve los datos de Monday con un desfase máximo de ~5 minutos, sin que nadie tenga que tocar nada.

## Por qué no es una llamada directa a Monday en cada carga

Este repositorio es **público**. Si `index.html` llamara directamente a la API de Monday desde el navegador, el token de acceso tendría que viajar en el código del cliente, y cualquier persona que vea el repo o inspeccione la página podría copiarlo y usarlo para leer o modificar tus boards de Monday. Por eso el token solo se usa del lado del servidor, dentro del GitHub Action, protegido como *secret*, y la página pública solo lee un archivo JSON ya generado.

Si prefieres otra frecuencia, edita la línea `cron: '*/5 * * * *'` en `.github/workflows/update-monday-data.yml` (sintaxis cron estándar, en UTC; GitHub no garantiza que corra exactamente cada 5 min si hay carga alta en su infraestructura, pero en la práctica corre muy cerca de ese ritmo) y el `5 * 60 * 1000` en el `setInterval` al final de `index.html`.

## Configuración inicial

### 1. Crear un token de API de Monday.com

1. En Monday.com, ve a tu avatar (esquina inferior izquierda) → **Administración** → **API**, o directamente a `https://<tu-cuenta>.monday.com/admin/integrations/api`.
2. Genera un **token de API personal** (o usa uno existente) con acceso de lectura a los boards del workspace "Proyecto GD - CPDN".
3. Copia el token — lo necesitarás en el siguiente paso. No lo compartas ni lo pegues en ningún archivo del repo.

### 2. Agregarlo como secret del repositorio

1. En GitHub, entra al repositorio → **Settings** → **Secrets and variables** → **Actions**.
2. Click en **New repository secret**.
3. Nombre: `MONDAY_API_TOKEN`. Valor: el token copiado en el paso anterior.
4. Guarda.

**Importante:** nunca pegues el token directamente en `index.html`, en el código del script, ni en ningún commit. Solo debe existir como secret de GitHub Actions.

### 3. Activar GitHub Pages

1. **Settings** → **Pages**.
2. En "Build and deployment", selecciona **Deploy from a branch**.
3. Branch: `main` (o la que uses), carpeta `/ (root)`.
4. Guarda. GitHub te dará la URL pública (algo como `https://<usuario>.github.io/<repo>/`).

### 4. Primera ejecución del Action

El workflow corre automáticamente cada 30 minutos, pero para generar el primer snapshot actualizado sin esperar:

1. Ve a la pestaña **Actions** del repositorio.
2. Selecciona el workflow **"Actualizar datos de Monday"**.
3. Click en **Run workflow** (botón a la derecha) → **Run workflow**.

Ya se incluye un `data/monday-data.json` inicial en este paquete para que la página funcione desde el primer despliegue, aunque el Action aún no haya corrido.

## Estructura del repositorio

```
index.html                              → la página del reporte
data/monday-data.json                   → snapshot de datos (se sobrescribe automáticamente)
scripts/fetch-monday-data.mjs           → script que consulta Monday y regenera el snapshot
.github/workflows/update-monday-data.yml → GitHub Action programado
README.md                               → este archivo
```

## Alcance de los datos

El reporte usa exclusivamente estos 3 boards del workspace "Proyecto GD - CPDN" y la columna "Estado ITOP":

- Registro Requerimientos (id 18254196175)
- Registro Req. Adicionales (id 18425634570)
- Registro Incidentes (id 18425631515)

"Cerrado" = Estado ITOP "Cerrado" o "Solucionado". "Pendiente" = Estado ITOP "Pendiente". Si el workspace cambia de estructura (nuevos boards, columnas renombradas), hay que actualizar los IDs de board/columna en `scripts/fetch-monday-data.mjs` y en el arreglo `BOARDS` dentro de `index.html`.
