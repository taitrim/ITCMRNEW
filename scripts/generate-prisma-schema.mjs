import mysql from 'mysql2/promise';
import { writeFileSync, copyFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB = { host: 'localhost', port: 3306, user: 'glpi', password: 'glpi', database: 'glpi' };
const PRISMA_FILE = join(__dirname, '..', 'prisma', 'schema.prisma');
const BACKUP_FILE = join(__dirname, '..', 'prisma', 'schema.prisma.backup');
const PREFIX = 'glpi_';

// Skip these tables
const SKIP = new Set(['glpi_forms_', 'glpi_dashboards_', 'glpi_helpdesks_', 'glpi_dropdowns_', 'glpi_events']);

function pascalCase(str) {
  return str.split('_').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
}

function tableToModel(tn) {
  if (!tn.startsWith(PREFIX)) return null;
  const r = tn.slice(PREFIX.length);
  // Special cases
  if (r === 'entities') return 'Entity';
  if (r === 'groups_users') return 'GroupUser';
  if (r === 'profiles_users') return 'ProfileUser';
  if (r === 'configs') return 'Config';
  if (r === 'logs') return 'Log';
  // Prefix-special tables: entities_knowbaseitems, profiles_reminders, etc.
  const prefixes = ['profiles_', 'entities_', 'groups_', 'users_', 'suppliers_', 'tickets_', 'changes_', 'problems_', 'projects_', 'contracts_', 'followups_'];
  for (const p of prefixes) {
    if (r.startsWith(p)) {
      const base = r.startsWith('entities_') ? 'Entity' :
                   r.startsWith('profiles_') ? 'Profile' :
                   r.startsWith('groups_') ? 'Group' :
                   r.startsWith('users_') ? 'User' :
                   r.startsWith('suppliers_') ? 'Supplier' :
                   r.startsWith('tickets_') ? 'Ticket' :
                   r.startsWith('changes_') ? 'Change' :
                   r.startsWith('problems_') ? 'Problem' :
                   r.startsWith('projects_') ? 'Project' :
                   r.startsWith('contracts_') ? 'Contract' :
                   r.startsWith('followups_') ? 'Followup' : pascalCase(r.slice(0, -1));
      const rest = r.slice(p.length).split('_').map(w => pascalCase(w)).join('');
      return base + rest;
    }
  }
  // Items linking tables: items_deviceprocessors, items_disks, etc.
  if (r.startsWith('items_') && !r.startsWith('items_tickets')) {
    const rest = r.slice(6);
    // Map known device item tables
    const map = {
      'devicebatteries': 'Battery',
      'devicecameras': 'Camera',
      'devicecases': 'Case',
      'devicecontrols': 'Control',
      'devicedrives': 'Drive',
      'devicefirmwares': 'Firmware',
      'devicegenerics': 'Generic',
      'devicegraphiccards': 'GraphicCard',
      'deviceharddrives': 'HardDrive',
      'devicememories': 'Memory',
      'devicemotherboards': 'Motherboard',
      'devicenetworkcards': 'NetworkCard',
      'devicepcis': 'Pci',
      'devicepowersupplies': 'PowerSupply',
      'deviceprocessors': 'Processor',
      'devicesensors': 'Sensor',
      'devicesimcards': 'Simcard',
      'devicesoundcards': 'SoundCard',
      'disks': 'Disk',
      'antiviruses': 'Antivirus',
      'processes': 'Process',
      'enclosures': 'Enclosure',
      'environments': 'Environment',
      'operatingsystems': 'OperatingSystem',
      'plugs': 'Plug',
      'racks': 'Rack',
      'remotemanagements': 'RemoteManagement',
      'softwarelicenses': 'SoftwareLicense',
      'softwareversions': 'SoftwareVersion',
      'virtualmachines': 'VirtualMachine',
      'clusters': 'Cluster',
      'kanbans': 'Kanban',
      'lines': 'Line',
      'ticketrecurrents': 'TicketRecurrent',
      'certificates': 'Certificate',
      'projects': 'Project',
    };
    return `Item${map[rest] || pascalCase(rest)}`;
  }
  // Kb items cross-refs
  if (r.startsWith('knowbaseitems_')) {
    const rest = r.slice(14);
    if (rest === 'items') return 'KbItemItem';
    if (rest === 'comments') return 'KbComment';
    if (rest === 'revisions') return 'KbRevision';
    if (rest === 'profiles') return 'KbProfile';
    if (rest === 'users') return 'KbUser';
    if (rest === 'translations') return 'KbTranslation';
    if (rest === 'knowbaseitemcategories') return 'KbCategoryItem';
    return `Kb${pascalCase(rest)}`;
  }
  // Device model/type tables
  if (r.startsWith('devicemotherboard')) return 'DeviceMotherboard' + (r.includes('models') ? 'Model' : '');
  if (r.startsWith('deviceprocessormodels')) return 'DeviceProcessorModel';
  
  // Special rename: glpi_authldapreplicates → AuthLdapReplicate (not Authldapreplicates)
  // Just return PascalCase of underscored parts
  return r.split('_').map(p => pascalCase(p)).join('');
}

function toPrismaType(colType, nul) {
  const t = colType.toLowerCase().replace(/\(.*\)/, '').replace(/ unsigned/g, '');
  if (t.includes('tinyint') && colType.includes('(1)')) return nul ? 'Boolean?' : 'Boolean';
  if (t.includes('char') || t.includes('text') || t.includes('blob') || t.includes('enum')) return nul ? 'String?' : 'String';
  if (t.includes('bigint')) return nul ? 'BigInt?' : 'BigInt';
  if (t.includes('int') || t.includes('tinyint') || t.includes('smallint') || t.includes('mediumint')) return nul ? 'Int?' : 'Int';
  if (t.includes('decimal') || t.includes('float') || t.includes('double')) return nul ? 'Float?' : 'Float';
  if (t.includes('timestamp') || t.includes('datetime') || t.includes('date')) return nul ? 'DateTime?' : 'DateTime';
  return nul ? 'String?' : 'String';
}

function camelCase(str) {
  return str.replace(/_([a-z0-9])/g, (_, l) => l.toUpperCase());
}

function sanitizeField(field) {
  if (/^\d/.test(field)) return `f_${field}`;
  return field;
}

async function main() {
  const conn = await mysql.createConnection(DB);
  console.log('Connected to GLPI database');

  const [tables] = await conn.execute(
    "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME LIKE 'glpi_%' ORDER BY TABLE_NAME", [DB.database]);

  const [allCols] = await conn.execute(
    `SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY, EXTRA
     FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME, ORDINAL_POSITION`, [DB.database]);

  const [indices] = await conn.execute(
    `SELECT TABLE_NAME, COLUMN_NAME, INDEX_NAME, NON_UNIQUE
     FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME, INDEX_NAME`, [DB.database]);

  // Organize by table
  const colsByTable = {};
  for (const c of allCols) {
    if (!colsByTable[c.TABLE_NAME]) colsByTable[c.TABLE_NAME] = [];
    colsByTable[c.TABLE_NAME].push(c);
  }
  const idxByTable = {};
  for (const idx of indices) {
    if (!idxByTable[idx.TABLE_NAME]) idxByTable[idx.TABLE_NAME] = [];
    idxByTable[idx.TABLE_NAME].push(idx);
  }

  // PASS 1: Build table→model name mapping
  const tableModel = {}; // table_name → model_name
  const modelTable = {}; // model_name → table_name
  for (const t of tables) {
    const tn = t.TABLE_NAME;
    let skip = false;
    for (const s of SKIP) { if (tn.startsWith(s)) { skip = true; break; } }
    if (skip) continue;
    const mn = tableToModel(tn);
    if (mn) { tableModel[tn] = mn; modelTable[mn] = tn; }
  }

  // PASS 2: Build column→model FK map from table names
  // A column named `xxx_id` references table `glpi_xxx`. Find the actual model name.
  function inferRefModel(colName) {
    if (!colName.endsWith('_id')) return null;
    if (colName === 'id') return null;
    if (colName === 'items_id' || colName === 'itemtype') return null; // polymorphic
    const base = colName.slice(0, -3); // e.g., 'computers' from 'computers_id'
    // Try exact match: glpi_computers → Computer
    const exactTable = `glpi_${base}`;
    if (tableModel[exactTable]) return tableModel[exactTable];
    // Try with underscores: glpi_peripheraltypes → peripheraltypes
    const altTable = `glpi_${base}`; // already same
    if (tableModel[altTable]) return tableModel[altTable];
    return null;
  }

  // PASS 3: Generate each model
  const models = {};
  const entityBackrefs = [];

  for (const [tn, mn] of Object.entries(tableModel)) {
    const cols = colsByTable[tn] || [];
    const idxs = idxByTable[tn] || [];
    const poly = cols.some(c => c.COLUMN_NAME === 'itemtype') && cols.some(c => c.COLUMN_NAME === 'items_id');
    let body = '';
    const seen = new Set();
    const multiColUniques = {};

    for (const idx of idxs) {
      if (!idx.NON_UNIQUE) {
        if (!multiColUniques[idx.INDEX_NAME]) multiColUniques[idx.INDEX_NAME] = [];
        multiColUniques[idx.INDEX_NAME].push(idx.COLUMN_NAME);
      }
    }

    // Check if table has an 'id' column
    const hasIdCol = cols.some(c => c.COLUMN_NAME === 'id');
    let syntheticPkAdded = false;

    for (const col of cols) {
      const cn = col.COLUMN_NAME;
      const ct = col.COLUMN_TYPE;
      const nul = col.IS_NULLABLE === 'YES';
      const pk = col.COLUMN_KEY === 'PRI';
      const auto = col.EXTRA.includes('auto_increment');
      if (seen.has(cn)) continue;
      seen.add(cn);

      if (cn === 'id') { body += `  id        String   @id @default(cuid())\n`; syntheticPkAdded = true; continue; }
      if (cn === 'date_mod') { body += `  updatedAt DateTime @updatedAt\n`; continue; }
      if (cn === 'date_creation') { body += `  createdAt DateTime @default(now())\n`; continue; }
      if (cn === 'is_deleted') { body += `  isDeleted Boolean @default(false)\n`; continue; }
      const pt = toPrismaType(ct, nul);
      let pc = camelCase(cn);
      pc = sanitizeField(pc);

      // Non-id PK: add @unique on the field itself (not @@unique to avoid name collisions)
      const pkUnique = (pk && cn !== 'id') ? ' @unique' : '';

      // Skip polymorphic type/id pair + items_id in general
      if ((cn === 'itemtype' || cn === 'items_id') && poly) { body += `  ${pc} ${pt}\n`; continue; }
      if (cn === 'items_id' && !poly) { body += `  ${pc} ${pt}\n`; continue; }
      if (cn === 'itemtype' && !poly) { body += `  ${pc} ${pt}\n`; continue; }

      // Skip self-referencing FK (Entity → entities_id → Entity)
      if (mn === 'Entity' && cn === 'entities_id') { body += `  ${pc} ${pt}\n`; continue; }
      
      // FK relation?
      const refModel = inferRefModel(cn);
      if (refModel && !pk && refModel !== mn) {
        const relName = pc.replace(/Id$/, '');
        if (cn === 'entities_id') {
          const relationName = `${mn}_entity`;
          body += `  entity Entity @relation("${relationName}", fields: [${pc}], references: [id])\n`;
          body += `  ${pc} String\n`;
          entityBackrefs.push({ model: mn, relationName });
        } else {
          const rn = `${mn}_${cn}`.replace(/[^a-zA-Z0-9_]/g, '_');
          body += `  ${relName} ${refModel}? @relation("${rn}", fields: [${pc}], references: [id])\n`;
          body += `  ${pc} ${nul ? 'String?' : 'String'}\n`;
        }
        seen.add(cn);
        continue;
      }

      // Skip `id` column for composite PKs (multi-column primary keys)
      if (pk && cn === 'id' && !auto) continue;

      body += `  ${pc} ${pt}${pkUnique}\n`;
    }

    // Add synthetic PK for tables without 'id' column
    if (!syntheticPkAdded) {
      body = `  id        String   @id @default(cuid())\n` + body;
    }

    // Multi-column uniques - deduplicate
    const seenUniques = new Set();
    for (const [name, ucols] of Object.entries(multiColUniques)) {
      // Skip id-only uniques (id is already PK)
      if (ucols.length === 1 && ucols[0] === 'id') continue;
      // Skip if this column already has @unique from PK handling
      const key = ucols.sort().join(',');
      if (seenUniques.has(key)) continue;
      seenUniques.add(key);
      // Skip single-column uniques that are already marked with @unique (PK columns)
      const colsArePk = ucols.every(c => cols.some(col => col.COLUMN_NAME === c && col.COLUMN_KEY === 'PRI'));
      if (ucols.length === 1 && colsArePk) continue;
      const pr = ucols.map(c => camelCase(c)).join(', ');
      body += `  @@unique([${pr}])\n`;
    }

    body += `  @@map("${tn}")\n`;
    models[mn] = body;
  }

  // PASS 4: Inject backrefs for all named @relation fields
  const relationBackrefs = {}; // refModel → [{fieldName, relationName, sourceModel}]
  for (const [mn, body] of Object.entries(models)) {
    // Match both Entity @relation("name" and Model? @relation("name"
    const relMatches = body.matchAll(/(\w+)\??\s+@relation\("([^"]+)", fields: \[(\w+)\], references: \[id\]\)/g);
    for (const m of relMatches) {
      const refModel = m[1];
      const relationName = m[2];
      const colName = m[3];
      if (!models[refModel]) continue;
      if (!relationBackrefs[refModel]) relationBackrefs[refModel] = [];
      relationBackrefs[refModel].push({ relationName, sourceModel: mn, colName });
    }
  }
  // Inject backrefs
  for (const [refModel, backrefs] of Object.entries(relationBackrefs)) {
    if (!models[refModel]) continue;
    let body = models[refModel];
    const existingFields = new Set();
    for (const line of body.split('\n')) {
      const m = line.match(/^\s+(\w+)\s/);
      if (m) existingFields.add(m[1]);
    }
    for (const br of backrefs) {
      // Generate backref field name
      const brName = br.sourceModel.charAt(0).toLowerCase() + br.sourceModel.slice(1);
      let brField = brName;
      if (existingFields.has(brField)) brField = brName + 'List';
      if (existingFields.has(brField)) brField = brName + 'Ref';
      existingFields.add(brField);
      body = body.replace('  @@map', `  ${brField} ${br.sourceModel}[] @relation("${br.relationName}")\n  @@map`);
    }
    models[refModel] = body;
  }

  // PASS 5: Topological sort
  const deps = {}; // model → set of models it depends on
  for (const [mn, body] of Object.entries(models)) {
    deps[mn] = new Set();
    // Parse relations from body to find dependencies
    const relMatches = body.matchAll(/(\w+)\? @relation\("(\w+)", fields: \[(\w+)\], references: \[id\]\)/g);
    for (const m of relMatches) {
      const refName = m[1];
      if (models[refName]) deps[mn].add(refName);
    }
    if (body.includes('Entity @relation') || body.includes('Entity? @relation')) deps[mn].add('Entity');
  }

  // Kahn's algorithm
  const inDeg = {};
  for (const mn of Object.keys(models)) inDeg[mn] = 0;
  for (const [mn, depSet] of Object.entries(deps)) {
    for (const d of depSet) {
      if (inDeg[d] === undefined) inDeg[d] = 0;
      inDeg[mn] = (inDeg[mn] || 0) + 1;
    }
  }
  const queue = Object.keys(inDeg).filter(m => inDeg[m] === 0);
  const sorted = [];
  while (queue.length) {
    const node = queue.shift();
    sorted.push(node);
    for (const [mn, depSet] of Object.entries(deps)) {
      if (depSet.has(node)) {
        inDeg[mn]--;
        if (inDeg[mn] === 0) queue.push(mn);
      }
    }
  }
  for (const mn of Object.keys(models)) {
    if (!sorted.includes(mn)) sorted.push(mn);
  }

  // PASS 5: Render
  let schema = `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

`;
  for (const mn of sorted) {
    if (models[mn]) schema += `\nmodel ${mn} {\n${models[mn]}}`;
  }

  if (existsSync(PRISMA_FILE)) copyFileSync(PRISMA_FILE, BACKUP_FILE);
  writeFileSync(PRISMA_FILE, schema, 'utf-8');
  console.log(`\nGenerated ${Object.keys(models).length} models → ${PRISMA_FILE}`);

  await conn.end();
}
main().catch(console.error);
