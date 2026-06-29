## Goal
- Build a complete GLPI-inspired ITSM & Asset Management system with full GLPI-compatible schema

## Constraints & Preferences
- Sử dụng tiếng Việt khi trả lời
- Stack: Next.js 16 (App Router), TypeScript strict, Tailwind CSS v4, Prisma 5 (SQLite dev), NextAuth v5
- Schema phải giống GLPI thật nhất có thể

## Progress
### Completed
- Cài GLPI 11.0.7 thật trên Windows (D:\GLPI) với PHP 8.3.31 + MariaDB 11.4.5
- Phân tích GLPI database có 442 tables, InnoDB, ZERO foreign key constraints (application-level relations)
- Viết script auto-generate Prisma schema từ GLPI database (`scripts/generate-prisma-schema.mjs`):
  - Kết nối MariaDB GLPI, đọc tất cả tables + columns + indexes
  - Auto-detect FK relationships từ column naming conventions (`xxx_id`)
  - Xử lý polymorphic pattern (`itemtype` + `items_id`)
  - Infer model names từ table names
  - Topological sort để đảm bảo model dependency ordering
  - Inject backrefs cho tất cả named @relation fields
  - Xử lý non-id primary keys (OAuth tables), digit-starting field names
- Push schema thành công: **422 models** trong SQLite
- Prisma Client generated successfully

### Schema Stats
- Total GLPI tables: 442
- Models generated: 422
- Skipped: 20 (glpi_forms_*, glpi_dashboards_*, glpi_helpdesks_*, glpi_dropdowns_*)

## Kiến trúc Schema
422 models bao phủ tất cả module chính của GLPI:
1. **Entities & Organization**: Entity (tree hierarchy), Locations, States, Manufacturers
2. **Users, Profiles & Groups**: User, Profile, ProfileRight, Group + linking tables
3. **Assets (6 types)**: Computer, Monitor, Printer, Phone, Peripheral, NetworkEquipment + Model/Type
4. **Device Library**: 20 device defs (Processor, Memory, HardDrive, NetworkCard, GraphicCard, Motherboard, etc.) + linking tables (ItemDevice*)
5. **Asset Management**: ItemDisk, ItemAntivirus, ItemProcess, ItemVirtualMachine, ItemSoftwareVersion
6. **Inventory**: Agent, AgentType, Inventory
7. **Network**: Network, NetworkPort, NetworkName, IpAddress, IpNetwork, Vlan, Fqdn, NetworkAlias
8. **Financial**: Infocom, Budget, Contract, Supplier
9. **ITIL**: ItilCategory, Ticket/Problem/Change + all linking tables (ItemTicket, ContractItem, DocumentItem)
10. **SLA/OLA**: Slm, Sla, SlaLevel + Criteria/Action, Ola, OlaLevel, TicketSla
11. **Knowledge Base**: KnowledgeBaseItem, KbComment, KbRevision, KbCategory, KbProfile, KbUser
12. **DCIM**: Datacenter, Dcroom, Rack, Enclosure, PDU, PassiveDCEquipment
13. **Appliances**: Appliance, ApplianceType, ApplianceEnvironment, ApplianceItem
14. **Domain Management**: Domain, DomainType, DomainRecord, DomainRelation
15. **Cable Management**: Cable, CableType, CableStrand, Plug, Socket
16. **Clusters**: Cluster, ClusterType
17. **Database Management**: Database, DatabaseInstance, DatabaseInstanceCategory
18. **OS Management**: OperatingSystem, OSArchitecture, OSEdition, OSKernel, etc.
19. **Notifications**: Notification, NotificationTemplate, NotificationTarget, QueuedNotification, Webhook
20. **Planning**: PlanningExternalEvent, PlanningEventCategory, PlanningRecall
21. **Reservations**: Reservation, ReservationItem
22. **Impact Analysis**: ImpactCompound, ImpactContext, ImpactItem, ImpactRelation
23. **Cartridge/Consumables**: CartridgeItem, Cartridge, ConsumableItem
24. **Certificates**: Certificate, CertificateType
25. **OAuth**: OauthClient, OauthAccessToken, OauthAuthCode, OauthRefreshToken
26. **Integration**: AuthLDAP, AuthMail, SSOVariable, MailCollector
27. **Configuration**: Config, DisplayPreference, Transfer, FieldBlacklist, FieldUnicity, LockedField
28. **Crontasks**: Crontask, CrontaskLog
29. **Webhooks**: Webhook, WebhookCategory, QueuedWebhook
30. **Autoupdate System**: AutoUpdateSystem, SNMPCredential
31. **Impact**: ManualLink, Link, RegisteredID
32. **ITIL Templates**: TicketTemplate, ChangeTemplate, ProblemTemplate + hidden/mandatory/predefined/readonly fields

## Next Steps
1. **Seed data**: Tạo seed script với dữ liệu mẫu cho 422 models
2. **API Routes**: Rewrite API routes cho schema mới
3. **UI Components**: Cập nhật UI theo schema
4. **Script regenerate**: Khi cần cập nhật schema, chạy `node scripts/generate-prisma-schema.mjs`

## Relevant Files
- `prisma/schema.prisma`: Auto-generated từ GLPI database (422 models)
- `scripts/generate-prisma-schema.mjs`: Script generate schema
- `D:\GLPI\`: GLPI 11.0.7 installation (tham khảo)
