# FMB Survey Builder

A modern web app for building, validating, importing, previewing, and exporting multi-language surveys.

## Quick Start

### Prerequisites

- Node.js 14+
- npm 6+

### Backend

```bash
cd server
npm install
cp data/store.json.template data/store.json
npm start
```

Backend runs at `http://localhost:5001`.

### Frontend

```bash
cd client
npm install
npm start
```

Frontend runs at `http://localhost:3000`.



- Storage is JSON file-based for simplicity.
- For production: migrate to a database, add auth, and move Tailwind/Bootstrap to build-time bundles.
