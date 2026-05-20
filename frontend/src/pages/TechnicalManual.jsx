import { Link } from 'react-router-dom'

const sections = [
  {
    id: 'cover', title: '',
    content: '',
    subsections: [],
    isCover: true,
  },
  {
    id: 'overview', title: '1. System Overview',
    content: `Survey is a modern web-based survey computation and coordinate management application developed for professional land survey computations, coordinate storage, spatial analysis, and interactive geospatial visualization.`,
    subsections: [
      { title: 'Integrated Survey Computation', text: 'The system enables registered users to create survey projects, store coordinate points, perform survey calculations, visualize points on interactive maps, compute joins, polar calculations, and areas, manage coordinate systems, and analyze spatial relationships between points.' },
      { title: 'System Conventions', text: 'The system strictly follows: Zero South orientation, X increases South, Y increases West, Bearings in Degrees Minutes Seconds (DMS), Banker\'s Rounding system (round half to even).' },
      { title: 'System Objectives', text: 'To automate survey coordinate computations, provide secure project-based coordinate storage, simplify join and polar calculations, enable interactive geospatial visualization, support Gauss Conformal and UTM coordinate systems, improve computational accuracy through banker\'s rounding, and provide a modern GIS-enabled survey calculator.' },
      { title: 'Architecture', text: 'The application follows a standard client-server architecture with a React single-page application (SPA) frontend communicating with a Node.js/Express REST API backend. A PostgreSQL relational database stores all persistent data. The frontend is built with Vite for fast development and production builds.' },
      { title: 'Repository Structure', text: 'The project is organised into two main directories: frontend/ (React SPA) and backend/ (Express API server). Configuration files, database initialisation scripts, and shared utilities reside at the root of each directory.' },
    ]
  },
  {
    id: 'system-arch', title: '2. System Architecture',
    content: 'The system uses a Modular Client–Server MVC Architecture.',
    subsections: [
      { title: 'Architecture Layers', text: '' },
    ]
  },
  {
    id: 'tech-stack', title: '3. Technology Stack',
    content: '',
    subsections: [
      { title: 'Frontend Technologies', text: 'React 18 with functional components and hooks. Routing via react-router-dom v6. State management uses React Context (authentication) and local component state. Styling via Tailwind CSS with dark mode support (class-based strategy). Icons and UI elements use standard HTML/SVG — no heavy icon library. The build tool is Vite for fast development server and optimized production builds.' },
      { title: 'Backend Technologies', text: 'Node.js with Express 4 framework. RESTful API design with JSON request/response bodies. CORS enabled for cross-origin requests. Route handlers in separate modules. PostgreSQL client via the pg (node-postgres) library with parameterised queries to prevent SQL injection. JWT (JSON Web Token) for session authentication.' },
      { title: 'Database', text: 'PostgreSQL relational database. Tables: users (authentication), projects (survey metadata), points (coordinate data). Soft delete implemented via deleted_at TIMESTAMP columns. The init.js script auto-creates tables and applies schema migrations on server start.' },
      { title: 'Geospatial & Mapping', text: 'proj4js for coordinate reference system transformations between projected coordinates (Gauss-Kruger, UTM) and WGS84 (latitude/longitude). Pre-defined CRS definitions stored in a shared config file covering 17+ systems including WGS84/UTM zones 35S–37S, Arc 1950/UTM zones 35S–36S, and Gauss LO zones 17–35. Leaflet with react-leaflet for interactive maps. Tile layers from free sources: Esri World Imagery (satellite), OpenStreetMap (street), Esri World Topo (topographic). Custom DivIcon markers with colour-coded selection states. UTM grid overlay component for professional GIS context.' },
      { title: 'Diagram Generation', text: 'Pure SVG generated programmatically in React. No external diagramming library — all shapes, text, and layout calculated in JavaScript. Produces A3-landscape formatted survey diagrams compliant with ZIM (Zimbabwe) survey standards, including title block, beacon schedule, line measurements, dual north arrow, scale bar, legend, certification block, and Surveyor General office block.' },
      { title: 'Authentication', text: 'JWT (JSON Web Token) based authentication. Passwords hashed with bcrypt. User sessions managed via token stored in localStorage and attached to API requests via Authorization header.' },
    ]
  },
  {
    id: 'design-approaches', title: '4. Design Approaches',
    content: '',
    subsections: [
      { title: 'Design Summary', text: '' },
    ]
  },
  {
    id: 'modules', title: '5. Functional Modules',
    content: '',
    subsections: [
      { title: '5.1 Authentication Module', text: 'Handles user registration, login, password encryption (bcrypt), session authentication via JWT, and user authorization across protected routes. Input: username/email and password. Output: user session token and secure dashboard access.' },
      { title: '5.2 Project Management Module', text: 'Create and manage survey projects with coordinate system selection. Supports Gauss Conformal (with Lo/Longitude of Origin) and UTM (with zone selection). Projects are soft-deleted to a recycle bin with restore and permanent delete options.' },
      { title: '5.3 Coordinate Storage Module', text: 'Store, edit, delete, and retrieve survey points with name, X (Southing), and Y (Westing). CSV import with flexible header matching (name/point/easting/x/latitude etc), BOM handling, delimiter auto-detection, and duplicate name detection. Export to CSV, GeoJSON (QGIS), and DXF (CAD).' },
      { title: '5.4 Join Calculation Module', text: 'Computes distance and bearing between coordinate pairs. Three modes: Single Join (one pair of points), Radial Join (from one reference point to multiple target points), Sequential Join (sequentially across multiple points: A→B→C→D). Formula: Distance D = √(ΔX² + ΔY²), Bearing θ = atan(ΔY / ΔX).' },
      { title: '5.5 Polar Calculation Module', text: 'Computes new coordinates from a reference point using distance and bearing. Three modes: Single Polar (one target point), Radial Polar (multiple points from one setup), Sequential Polar (traverse: sequentially through connected points). Formula: X₂ = X₁ + D·cos(θ), Y₂ = Y₁ + D·sin(θ).' },
      { title: '5.6 Area Calculation Module', text: 'Uses the Shoelace Method (Gauss area formula). Requires minimum 3 points forming a closed polygon. Formula: Area = ½|Σ(xᵢ·yᵢ₊₁ − yᵢ·xᵢ₊₁)|. Convention: area < 10000 m² displayed in square metres; area ≥ 10000 m² displayed in hectares.' },
      { title: '5.7 Interactive Mapping Module', text: 'Built with Leaflet + OpenStreetMap. Click one point: display point name, X, Y in popup. Click two points: compute join with distance and bearing. Close a polygon: compute and display polygon area. Three tile layers: satellite (Esri World Imagery), street (OSM), topographic (Esri). UTM grid overlay, cursor coordinate readout, and add-point-on-map mode.' },
      { title: '5.8 Diagram Generator', text: 'Produces A3-landscape printable survey diagram as pure SVG. Plan view with scaled drawing, beacon schedule (name + description + coordinates), line measurements (bearing + distance), dual north arrow (True + Magnetic), scale bar with ticks, legend, abbreviations (B.P., C.B., I.P., S.P.), adjoining properties, area statement, compilation info, certification block, and Surveyor General office block. Full metadata form for owner/surveyor/license/firm/parcel/ref/diagram number/sheet.' },
      { title: '5.9 Timeline Module', text: 'Activity log tracking all point additions, deletions, and CSV imports with timestamps. Data stored in localStorage keyed by project ID. Visual timeline with colour-coded icons (● add, ✕ delete, ▼ import) and chronological ordering.' },
    ]
  },
  {
    id: 'coordinate-system', title: '6. Coordinate Orientation System',
    content: 'The entire system uses Zero South Orientation.',
    subsections: [
      { title: 'Orientation Rules', text: 'X increases South (positive X = Southing). Y increases West (positive Y = Westing). Bearings measured in Degrees Minutes Seconds (DMS) from South in the ZIM convention. When converting to WGS84 via proj4js, the input array is [easting, northing] = [-Y, X]. This convention is consistent across all calculation modules and the map view.' },
    ]
  },
  {
    id: 'bearing-system', title: '7. Bearing System',
    content: 'Bearings are stored and displayed as Degrees Minutes Seconds (DMS).',
    subsections: [
      { title: 'Bearing Structure', text: 'Degrees: integer (0–359). Minutes: integer (0–59). Seconds: decimal (0–59.999). Display format: DDD°MM\'SS.SS". Computed using: d = floor(|θ|), m = floor((|θ| − d)·60), s = ((|θ| − d − m/60)·3600). All bearings normalized to 0–360° range.' },
    ]
  },
  {
    id: 'rounding-system', title: '8. Rounding System',
    content: 'The system uses Banker\'s Rounding (round half to even).',
    subsections: [
      { title: 'Banker\'s Rounding Rules', text: 'When the digit to round is exactly 5, round to the nearest even number. Examples: 2.5 → 2 (2 is even), 3.5 → 4 (4 is even), 2.4 → 2, 2.6 → 3. This reduces cumulative rounding bias compared to traditional round-half-up. Implemented as: Math.round((v + Number.EPSILON) * m) / m where m = 10^decimalPlaces.' },
    ]
  },
  {
    id: 'data-flow', title: '9. Data Flow & Calculations',
    content: '',
    subsections: [
      { title: 'Coordinate Transformation Pipeline', text: '1) User enters/imports coordinate pairs (X, Y) in the project\'s native CRS. 2) The config file maps the CRS ID to a proj4 definition string. 3) proj4js transforms [easting=-Y, northing=X] → [longitude, latitude] in WGS84. 4) Leaflet map renders points at [lat, lng] on EPSG:3857 basemap. 5) Diagram generation uses raw (X, Y) coordinates directly without projection.' },
      { title: 'Join Calculation Pipeline', text: '1) Two points selected. 2) ΔX = X₂ − X₁, ΔY = Y₂ − Y₁ computed. 3) Distance = √(ΔX² + ΔY²). 4) Bearing = atan2(ΔY, ΔX) converted to degrees and normalized to 0–360°. 5) DMS conversion applied. 6) Results displayed with visual join line on both diagram and map.' },
      { title: 'Polar Calculation Pipeline', text: '1) Reference point selected, distance and bearing input by user. 2) Bearing converted from DMS to decimal degrees. 3) New coordinates: X₂ = X₁ + D·cos(θ), Y₂ = Y₁ + D·sin(θ). 4) Results displayed with option to save to project database.' },
      { title: 'Area Calculation Pipeline', text: '1) Three or more points selected forming closed polygon. 2) Shoelace formula applied: Area = ½|Σ(xᵢ·yᵢ₊₁ − yᵢ·xᵢ₊₁)|. 3) Result rounded using banker\'s rounding to 3 decimal places. 4) Displayed in m² (if < 10000) or hectares (if ≥ 10000). 5) Polygon rendered on map with fill opacity.' },
      { title: 'CSV Import Pipeline', text: '1) File read as text with BOM removal and \\r\\n normalisation. 2) Delimiter auto-detected (comma, semicolon, tab). 3) Header row matched against known alias lists. 4) Rows parsed and validated (numeric X/Y, non-empty name). 5) Duplicate names checked against existing project points (with confirm dialog). 6) Points sent to backend via POST /bulk. 7) Timeline entry created.' },
      { title: 'Diagram Generation Pipeline', text: '1) Selected points passed to the SurveyDiagram component. 2) Join calculations performed for every adjacent pair. 3) Area calculated via Shoelace formula if 3+ points. 4) Bounds computed with 12% padding for margins. 5) SVG viewBox mapped to coordinate space. 6) Tables (beacons, lines) rendered at fixed positions outside the drawing area. 7) Browser print() outputs A3 landscape PDF.' },
    ]
  },
  {
    id: 'database', title: '10. Database Design',
    content: '',
    subsections: [
      { title: 'Entity Relationship', text: 'The database consists of three main tables: users, projects, and points. Each user has many projects. Each project has many points. Soft delete is implemented on both projects and points via a deleted_at TIMESTAMP column.' },
      { title: 'Users Table', text: 'id (SERIAL PK), username (VARCHAR UNIQUE), email (VARCHAR UNIQUE), password_hash (TEXT), name (VARCHAR), created_at (TIMESTAMP).' },
      { title: 'Projects Table', text: 'id (SERIAL PK), user_id (INTEGER FK → users), name (VARCHAR), coordinate_system (VARCHAR), lo_or_zone (VARCHAR NULLABLE), created_at (TIMESTAMP), deleted_at (TIMESTAMP NULL).' },
      { title: 'Points Table', text: 'id (SERIAL PK), project_id (INTEGER FK → projects), name (VARCHAR), x (DOUBLE PRECISION — Southing), y (DOUBLE PRECISION — Westing), created_at (TIMESTAMP), deleted_at (TIMESTAMP NULL).' },
      { title: 'Schema Migrations', text: 'The db/init.js script runs on server start, creating tables if they do not exist and applying ALTER TABLE migrations (such as adding deleted_at columns) using safe IF NOT EXISTS / IF EXISTS checks.' },
    ]
  },
  {
    id: 'api', title: '11. REST API Structure',
    content: '',
    subsections: [
      { title: 'Authentication Endpoints', text: 'POST /api/register — Register new user. POST /api/login — Authenticate and receive JWT token.' },
      { title: 'Project Endpoints', text: 'GET /api/projects — List active projects. POST /api/projects — Create project. GET /api/projects/:id — Get single project. DELETE /api/projects/:id — Soft-delete to trash. GET /api/projects/trash — List deleted projects. POST /api/projects/:id/restore — Restore from trash. DELETE /api/projects/:id/permanent — Hard delete.' },
      { title: 'Point Endpoints', text: 'GET /api/projects/:id/points — List points. POST /api/projects/:id/points — Add single point. POST /api/projects/:id/points/bulk — Bulk CSV import. DELETE /api/projects/:id/points/:ptId — Delete point.' },
      { title: 'Calculation Endpoints', text: 'POST /api/calculations/join — Compute join between two points (returns distance, bearing, delta). POST /api/calculations/area — Compute polygon area using Shoelace formula (returns area in m² and formatted display).' },
    ]
  },
  {
    id: 'coord-config', title: '12. Coordinate System Configuration',
    content: '',
    subsections: [
      { title: 'Pre-defined Systems', text: '17 coordinate systems in 4 groups: WGS84 / UTM (zones 35S, 36S, 37S), Arc 1950 / UTM (zones 35S, 36S), Gauss LO (zones 17–35), and Custom. Each entry includes: id, name, group, proj4 definition string, EPSG code, hasZone flag, zoneLabel, zonePlaceholder.' },
      { title: 'Adding a New System', text: 'Edit frontend/src/config/coordinateSystems.js. Add a new object following the same schema: { id, name, group, proj4, epsg, hasZone, zoneLabel, zonePlaceholder }. The backend validates coordinate_system as any string >= 3 characters, so no backend changes needed.' },
    ]
  },
  {
    id: 'workflow', title: '13. Full System Workflow',
    content: '',
    subsections: [
      { title: 'User Journey', text: '' },
    ]
  },
  {
    id: 'exports', title: '14. Export Formats',
    content: '',
    subsections: [
      { title: 'CSV', text: 'Comma-separated values with header row. Columns: name, x, y. Compatible with Microsoft Excel, Google Sheets, and most GIS applications.' },
      { title: 'GeoJSON', text: 'RFC 7946 compliant GeoJSON FeatureCollection with CRS metadata. Each point as a Feature with Point geometry [Y, X]. Suitable for QGIS, ArcGIS, Leaflet, and Mapbox.' },
      { title: 'DXF R12', text: 'AutoCAD R12 DXF format with four layers: POINTS (point entities), BOUNDARY (closed polyline), TEXT (point labels), DIMENSION (bearing + distance annotations). Openable in AutoCAD, DraftSight, LibreCAD, and QGIS DXF import.' },
      { title: 'PDF Diagram', text: 'A3 landscape SVG rendered in the browser. Use the Print/Save PDF button to generate a PDF via the browser\'s native print dialog. The diagram includes title block, plan view, beacon schedule, line measurements, area, certification, and official stamp block.' },
    ]
  },
  {
    id: 'security', title: '15. Security Features',
    content: '',
    subsections: [
      { title: 'Security Summary', text: '' },
    ]
  },
  {
    id: 'setup', title: '16. Development Setup',
    content: '',
    subsections: [
      { title: 'Prerequisites', text: 'Node.js 18+, PostgreSQL 14+, npm or yarn. Git for version control.' },
      { title: 'Installation', text: 'Clone the repository. Run npm install in both backend/ and frontend/ directories. Create a PostgreSQL database named survey_db. Copy backend/.env.example to backend/.env and configure DATABASE_URL and JWT_SECRET.' },
      { title: 'Running the Application', text: 'Start the backend: cd backend && npm run dev (port 5000). Start the frontend: cd frontend && npm run dev (port 3000, proxied to backend via Vite config). Open http://localhost:3000 in a browser.' },
      { title: 'Production Build', text: 'Frontend: npm run build (outputs to frontend/dist). Backend serves static files from dist in production mode. The combined app runs on port 5000.' },
    ]
  },
  {
    id: 'advantages', title: '17. Advantages of the System',
    content: '',
    subsections: [
      { title: 'Key Benefits', text: '' },
    ]
  },
  {
    id: 'future', title: '18. Future Improvements',
    content: '',
    subsections: [
      { title: 'Planned Enhancements', text: '' },
    ]
  },
  {
    id: 'conclusion', title: '19. Conclusion',
    content: '',
    subsections: [
      { title: 'Summary', text: '' },
    ]
  },
]

const designApproaches = [
  ['Overall System', 'Client–Server Architecture'],
  ['Internal Organization', 'MVC Pattern'],
  ['Functional Separation', 'Modular Design'],
  ['Programming Paradigm', 'Object-Oriented Design'],
  ['Communication', 'REST API'],
  ['Spatial Visualization', 'GIS / Web Mapping Architecture'],
]

const securityFeatures = [
  ['Password Hashing', 'Secure passwords via bcrypt'],
  ['JWT Authentication', 'Stateless session protection'],
  ['Input Validation', 'Prevent invalid / malformed data'],
  ['Parameterised Queries', 'SQL injection prevention'],
  ['API Authorization', 'Protected routes per user'],
  ['Soft Delete', 'Data recovery via recycle bin'],
]

const advantages = [
  'Automated survey computations eliminating manual calculation errors',
  'Reduced human error through validated data entry and banker\'s rounding',
  'Secure project-based storage with per-user authentication',
  'GIS-enabled interactive mapping with satellite / street / topo basemaps',
  'Modular architecture allowing independent feature development',
  'Support for multiple coordinate systems (Gauss Conformal, UTM, Arc 1950)',
  'Coordinate system flexibility with 17+ pre-defined CRS definitions',
  'Professional survey diagram generation compliant with ZIM standards',
  'One-click export to CSV, GeoJSON (QGIS), DXF (CAD), and PDF',
  'Recycle bin with restore capability preventing accidental data loss',
]

const futureImprovements = [
  'GNSS raw data import (RINEX, .dat)',
  'Traverse adjustment and least squares adjustment computations',
  '3D terrain visualization with elevation data integration',
  'Cloud synchronization across devices',
  'Mobile application version for field data collection',
  'Offline functionality with local-first architecture (IndexedDB)',
  'Multi-user collaboration with project sharing',
  'Automated PDF report generation with cover page and full documentation',
  'Integration with total station data download',
  'Machine learning for automatic feature detection from satellite imagery',
]

export default function TechnicalManual() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 no-print">
        <Link to="/" className="text-blue-600 dark:text-blue-400 hover:underline text-sm">&larr; Back to Dashboard</Link>
        <button onClick={() => window.print()}
          className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 transition">
          Download PDF
        </button>
      </div>

      <style>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; font-size: 10pt; }
          .no-print { display: none !important; }
          @page { size: A4; margin: 15mm; }
          .manual-page { box-shadow: none !important; border: none !important; }
          h2 { page-break-before: always; margin-top: 20pt; }
          h2:first-of-type, .toc-section { page-break-before: avoid; }
          table { font-size: 9pt; }
          pre { white-space: pre-wrap; word-break: break-word; font-size: 8pt; }
          .print-only { display: block !important; }
        }
        .print-only { display: none; }
      `}</style>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 md:p-12 transition-colors manual-page">
        {/* ===== COVER PAGE ===== */}
        <div className="text-center mb-12 pb-12 border-b border-gray-200 dark:border-gray-700 no-print">
          <div className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-1">SURVEY CALCULATOR</div>
          <div className="text-lg text-blue-600 dark:text-blue-400 mb-2 font-semibold">Integrated Survey Computation and Coordinate Management System</div>
          <div className="text-md text-gray-500 dark:text-gray-400 mb-6">Technical Manual &amp; System Documentation</div>
          <div className="text-sm text-gray-400 dark:text-gray-500">
            Version 1.0 &mdash; {new Date().toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>

        <div className="text-center mb-16 print-only">
          <div style={{ fontSize: '24pt', fontWeight: 'bold', marginBottom: '4pt' }}>SURVEY CALCULATOR</div>
          <div style={{ fontSize: '14pt', color: '#2563eb', marginBottom: '8pt', fontWeight: '600' }}>Integrated Survey Computation and Coordinate Management System</div>
          <div style={{ fontSize: '12pt', color: '#666', marginBottom: '24pt' }}>Technical Manual &amp; System Documentation</div>
          <div style={{ fontSize: '10pt', color: '#999', marginTop: '200pt' }}>
            Version 1.0 &mdash; {new Date().toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>

        {/* ===== TABLE OF CONTENTS ===== */}
        <div className="toc-section mb-10 p-6 bg-gray-50 dark:bg-gray-700/50 rounded-lg no-print">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-3" style={{ pageBreakBefore: 'avoid' }}>Table of Contents</h2>
          <ul className="space-y-1 columns-2">
            {sections.filter(s => !s.isCover).map(s => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="text-blue-600 dark:text-blue-400 hover:underline text-sm">{s.title}</a>
              </li>
            ))}
          </ul>
        </div>

        <div className="print-only" style={{ marginBottom: '30pt' }}>
          <div style={{ fontSize: '16pt', fontWeight: 'bold', marginBottom: '10pt' }}>Table of Contents</div>
          {sections.filter(s => !s.isCover).map((s, i) => (
            <div key={s.id} style={{ fontSize: '10pt', marginBottom: '3pt' }}>{s.title}</div>
          ))}
        </div>

        {/* ===== SECTIONS ===== */}
        {sections.map(section => {
          if (section.isCover) return null

          if (section.id === 'system-arch') {
            return (
              <section key={section.id} id={section.id} className="mb-10">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-3 pb-2 border-b-2 border-blue-500">{section.title}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">{section.content}</p>
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg mb-4 font-mono text-xs leading-relaxed text-gray-700 dark:text-gray-300" style={{ whiteSpace: 'pre' }}>
{`┌──────────────────────────────────────┐
│            FRONTEND LAYER            │
│  Tailwind CSS  +  Leaflet  +  React  │
└──────────────────┬───────────────────┘
                   │  REST API (JSON)
                   ▼
┌──────────────────────────────────────┐
│         CONTROLLER LAYER            │
│      Express.js Route Handlers      │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│       SERVICE / CALCULATION LAYER    │
│     Survey Computation Engine        │
│  (Joins · Polars · Areas · Bearings) │
└──────────────────┬───────────────────┘
                   │
                   ▼
┌──────────────────────────────────────┐
│          DATABASE LAYER              │
│     PostgreSQL  +  node-postgres     │
└──────────────────────────────────────┘`}
                </div>
              </section>
            )
          }

          if (section.id === 'design-approaches') {
            return (
              <section key={section.id} id={section.id} className="mb-10">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-3 pb-2 border-b-2 border-blue-500">{section.title}</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-100 dark:bg-gray-700">
                        <th className="text-left p-2 border border-gray-300 dark:border-gray-600 font-semibold text-gray-700 dark:text-gray-300">Design Aspect</th>
                        <th className="text-left p-2 border border-gray-300 dark:border-gray-600 font-semibold text-gray-700 dark:text-gray-300">Approach</th>
                      </tr>
                    </thead>
                    <tbody>
                      {designApproaches.map(([aspect, approach], i) => (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-800/50'}>
                          <td className="p-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium">{aspect}</td>
                          <td className="p-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">{approach}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )
          }

          if (section.id === 'workflow') {
            return (
              <section key={section.id} id={section.id} className="mb-10">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-3 pb-2 border-b-2 border-blue-500">{section.title}</h2>
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg font-mono text-xs leading-relaxed text-gray-700 dark:text-gray-300" style={{ whiteSpace: 'pre' }}>
{`  ┌──────────────┐
  │   REGISTER    │
  │  (New User)   │
  └──────┬───────┘
         ▼
  ┌──────────────┐
  │    LOGIN     │
  │ (JWT Token)  │
  └──────┬───────┘
         ▼
  ┌──────────────┐
  │  DASHBOARD   │
  │ (Projects)   │
  └──────┬───────┘
         ▼
  ┌──────────────────────────────┐
  │       CREATE PROJECT         │
  │  ┌──────────────────────┐    │
  │  │ Coordinate System    │    │
  │  │ Gauss  ◉  UTM  ○     │    │
  │  │ Lo / Zone: [____]    │    │
  │  │ Project: [_________] │    │
  │  └──────────────────────┘    │
  └──────┬───────────────────────┘
         ▼
  ┌──────────────────────────────────────────┐
  │           PROJECT WORKSPACE              │
  │                                          │
  │  ┌──────────┐ ┌──────────┐ ┌──────────┐  │
  │  │ POINTS   │ │  JOIN    │ │  POLAR   │  │
  │  │ CRUD     │ │ Single   │ │ Single   │  │
  │  │ CSV      │ │ Radial   │ │ Radial   │  │
  │  │ Import   │ │ Sequence │ │ Sequence │  │
  │  └──────────┘ └──────────┘ └──────────┘  │
  │                                          │
  │  ┌──────────┐ ┌──────────┐ ┌──────────┐  │
  │  │  AREA    │ │   MAP    │ │ DIAGRAM  │  │
  │  │ Shoelace │ │ Leaflet  │ │ SVG Plan │  │
  │  │ Formula  │ │ Satellite│ │ ZIM Comp │  │
  │  └──────────┘ └──────────┘ └──────────┘  │
  │                                          │
  │  ┌──────────┐                             │
  │  │TIMELINE  │                             │
  │  │ Activity │                             │
  │  └──────────┘                             │
  └──────┬───────────────────────────────────┘
         ▼
  ┌──────────────┐     ┌──────────────┐
  │   RESULTS    │ ──► │   EXPORT     │
  │ Display      │     │ CSV / GeoJSON│
  │              │     │ DXF / PDF    │
  └──────┬───────┘     └──────────────┘
         ▼
  ┌──────────────┐
  │  DATABASE    │
  │  PostgreSQL  │
  └──────────────┘`}
                </div>
              </section>
            )
          }

          if (section.id === 'advantages') {
            return (
              <section key={section.id} id={section.id} className="mb-10">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-3 pb-2 border-b-2 border-blue-500">{section.title}</h2>
                <ul className="space-y-2">
                  {advantages.map((adv, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <span className="text-green-600 dark:text-green-400 font-bold mt-0.5">&#x2713;</span>
                      <span>{adv}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )
          }

          if (section.id === 'future') {
            return (
              <section key={section.id} id={section.id} className="mb-10">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-3 pb-2 border-b-2 border-blue-500">{section.title}</h2>
                <ul className="space-y-2">
                  {futureImprovements.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <span className="text-blue-600 dark:text-blue-400 font-bold mt-0.5">&#x2192;</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )
          }

          if (section.id === 'security') {
            return (
              <section key={section.id} id={section.id} className="mb-10">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-3 pb-2 border-b-2 border-blue-500">{section.title}</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gray-100 dark:bg-gray-700">
                        <th className="text-left p-2 border border-gray-300 dark:border-gray-600 font-semibold text-gray-700 dark:text-gray-300">Feature</th>
                        <th className="text-left p-2 border border-gray-300 dark:border-gray-600 font-semibold text-gray-700 dark:text-gray-300">Purpose</th>
                      </tr>
                    </thead>
                    <tbody>
                      {securityFeatures.map(([feature, purpose], i) => (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-800/50'}>
                          <td className="p-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium">{feature}</td>
                          <td className="p-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300">{purpose}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )
          }

          if (section.id === 'conclusion') {
            return (
              <section key={section.id} id={section.id} className="mb-10">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-3 pb-2 border-b-2 border-blue-500">{section.title}</h2>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                  Survey is a modern GIS-enabled survey computation and coordinate management system developed using
                  modular client-server architecture and MVC principles. The system integrates advanced survey computation
                  methods (joins, polars, areas via Shoelace formula), interactive mapping (Leaflet with satellite/street/topo
                  basemaps), secure authentication (JWT + bcrypt), spatial data management (PostgreSQL with soft delete),
                  and professional survey diagram generation (ZIM-compliant SVG with certification blocks) into a unified
                  web application platform for professional surveying operations.
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mt-3">
                  Built with React, Node.js, Express, PostgreSQL, and Leaflet, the system supports 17+ coordinate systems
                  including Gauss Conformal LO zones, UTM, and Arc 1950. All calculations use Zero South orientation,
                  Degrees Minutes Seconds bearings, and Banker's Rounding for computational accuracy. The system provides
                  one-click export to CSV, GeoJSON, DXF, and PDF formats, making it a complete end-to-end solution for
                  modern land surveying workflows.
                </p>
              </section>
            )
          }

          return (
            <section key={section.id} id={section.id} className="mb-10">
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-3 pb-2 border-b-2 border-blue-500">{section.title}</h2>
              {section.content && <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">{section.content}</p>}
              {section.subsections.map((sub, i) => (
                <div key={i} className="mb-3">
                  {sub.text ? (
                    <>
                      <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300 mb-1">{sub.title}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{sub.text}</p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed font-medium">{sub.title}</p>
                  )}
                </div>
              ))}
            </section>
          )
        })}

        <div className="text-center text-xs text-gray-400 dark:text-gray-500 mt-12 pt-6 border-t border-gray-200 dark:border-gray-700">
          Survey Calculator &mdash; Technical Manual &amp; System Documentation &mdash; Generated {new Date().toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>
    </div>
  )
}
