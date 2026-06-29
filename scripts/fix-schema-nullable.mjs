import { readFileSync, writeFileSync } from 'fs';

let data = readFileSync('prisma/schema.prisma', 'utf8');

const modelNames = [
  'Entity', 'Users', 'Locations', 'Manufacturers', 'States', 'Itilcategories',
  'Computers', 'Tickets', 'Printers', 'Monitors', 'Networkequipments',
  'Softwares', 'Softwarelicenses', 'Slas', 'Slalevels', 'Changes',
  'Problems', 'Projects', 'Suppliers', 'Contracts', 'Budgets',
  'Certificates', 'Knowbaseitems', 'Consumableitems', 'Itilfollowups',
  'Tickettasks', 'ProblemTickets', 'Problemtasks', 'ChangeTickets',
  'Changetasks', 'ContractSuppliers', 'ItemDisk', 'ItemSoftwareLicense',
  'TicketUsers', 'Consumables', 'Projecttasks', 'Contractcosts',
  'Infocoms', 'Domains', 'Domaintypes', 'Fqdns', 'Ipaddresses',
  'CustomerCategory', 'Customer', 'CustomerAddress',
  'CustomerContact', 'CustomerEmployee', 'CustomerItem',
];

for (const name of modelNames) {
  const re = new RegExp(`^model ${name} \\{[\\s\\S]*?^\\}`, 'm');
  data = data.replace(re, (match) => {
    return match.split('\n').map(line => {
      const t = line.trim();
      if (t.includes('?') || t.includes('@id') || t.includes('@default') ||
          t.includes('@relation') || t.includes('[]') || t.startsWith('//') || t.startsWith('}')) {
        return line;
      }
      if (/^\w+\s+Int\b/.test(t)) return line.replace(/\bInt\b/, 'Int?');
      if (/^\w+\s+String\b/.test(t)) return line.replace(/\bString\b/, 'String?');
      if (/^\w+\s+Float\b/.test(t)) return line.replace(/\bFloat\b/, 'Float?');
      if (/^\w+\s+BigInt\b/.test(t)) return line.replace(/\bBigInt\b/, 'BigInt?');
      if (/^\w+\s+Boolean\b/.test(t)) return line.replace(/\bBoolean\b/, 'Boolean?');
      return line;
    }).join('\n');
  });
}

writeFileSync('prisma/schema.prisma', data);
console.log('Done - fixed', modelNames.length, 'models');
