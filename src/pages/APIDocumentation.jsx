import { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { 
  Database, Server, Layout, Download, Copy, Check, 
  Globe, Shield, HardDrive, Cloud
} from 'lucide-react';
import { toast } from 'sonner';

const APP_CONFIG = {
  name: 'Statistical Digest Management System',
  version: '1.0.0',
  description: 'Enterprise-grade platform for managing agricultural commodity statistics',
  targetPlatforms: ['Convex.dev', 'DigitalOcean', 'Vercel']
};

const ENTITIES = [
  {
    name: 'StatisticalData',
    description: 'Core entity for agricultural commodity statistical records',
    fields: [
      { name: 'year', type: 'number', required: true, description: 'Year of the data' },
      { name: 'zone', type: 'string', required: true, description: 'Geographic zone' },
      { name: 'state', type: 'string', required: true, description: 'State name' },
      { name: 'category', type: 'string', required: true, description: 'Commodity category' },
      { name: 'commodity_name', type: 'string', required: true, description: 'Name of the commodity' },
      { name: 'unit_of_measurement', type: 'string', required: true, description: 'Unit of measurement' },
      { name: 'january-december', type: 'number', required: false, description: 'Monthly values' },
      { name: 'total', type: 'number', required: false, description: 'Annual total' },
      { name: 'average', type: 'number', required: false, description: 'Annual average' }
    ],
    operations: ['list', 'filter', 'create', 'update', 'delete', 'bulkCreate']
  },
  {
    name: 'AuditLog',
    description: 'Tracks all system activities and user actions',
    fields: [
      { name: 'action', type: 'string', enum: ['create','update','delete','import','export'], required: true },
      { name: 'entity_type', type: 'string', required: false },
      { name: 'entity_id', type: 'string', required: false },
      { name: 'details', type: 'string', required: true },
      { name: 'user_email', type: 'string', required: false }
    ],
    operations: ['list', 'filter', 'create']
  },
  {
    name: 'User',
    description: 'Built-in user entity with role-based access control',
    fields: [
      { name: 'email', type: 'string', required: true },
      { name: 'full_name', type: 'string', required: false },
      { name: 'role', type: 'string', enum: ['admin','data_entry','viewer'], required: true }
    ],
    operations: ['list', 'update', 'inviteUser']
  }
];

const BACKEND_FUNCTIONS = [
  {
    name: 'Data Management',
    functions: [
      { name: 'list', endpoint: 'GET /entities/StatisticalData', description: 'Retrieve all statistical records' },
      { name: 'filter', endpoint: 'POST /entities/StatisticalData/filter', description: 'Query records with filters' },
      { name: 'create', endpoint: 'POST /entities/StatisticalData', description: 'Create single record' },
      { name: 'update', endpoint: 'PUT /entities/StatisticalData/:id', description: 'Update record by ID' },
      { name: 'delete', endpoint: 'DELETE /entities/StatisticalData/:id', description: 'Delete record by ID' },
      { name: 'bulkCreate', endpoint: 'POST /entities/StatisticalData/bulk', description: 'Bulk insert multiple records' }
    ]
  },
  {
    name: 'Audit Logging',
    functions: [
      { name: 'logAction', endpoint: 'POST /entities/AuditLog', description: 'Create audit log entry' },
      { name: 'list', endpoint: 'GET /entities/AuditLog', description: 'Retrieve audit logs' }
    ]
  },
  {
    name: 'Integrations',
    functions: [
      { name: 'UploadFile', endpoint: 'POST /integrations/core/upload', description: 'Upload Excel/CSV files' },
      { name: 'ExtractDataFromUploadedFile', endpoint: 'POST /integrations/core/extract', description: 'Extract data from files using AI' }
    ]
  }
];

const FRONTEND_COMPONENTS = [
  { category: 'Layout', components: ['AppLayout', 'AuthLayout', 'ProtectedRoute'] },
  { category: 'Dashboard', components: ['StatCard', 'DashboardCharts'] },
  { category: 'Data Management', components: ['DataTable', 'DataFilters', 'RecordFormDialog'] },
  { category: 'Import/Export', components: ['ImportData'] },
  { category: 'Analytics', components: ['Reports'] },
  { category: 'Audit', components: ['AuditLog'] },
  { category: 'UI Components', components: ['Button', 'Card', 'Table', 'Dialog', 'Select', 'Input', 'Badge', 'Tabs', 'Toast'] }
];

const API_ENDPOINTS = [
  { method: 'GET', path: '/api/statistical-data', description: 'List all records', auth: true },
  { method: 'GET', path: '/api/statistical-data/filter', description: 'Filter records', auth: true },
  { method: 'POST', path: '/api/statistical-data', description: 'Create record', auth: true, role: 'admin,data_entry' },
  { method: 'PUT', path: '/api/statistical-data/:id', description: 'Update record', auth: true, role: 'admin,data_entry' },
  { method: 'DELETE', path: '/api/statistical-data/:id', description: 'Delete record', auth: true, role: 'admin' },
  { method: 'POST', path: '/api/statistical-data/bulk', description: 'Bulk import', auth: true, role: 'admin,data_entry' },
  { method: 'GET', path: '/api/audit-logs', description: 'List audit logs', auth: true, role: 'admin' },
  { method: 'POST', path: '/api/import/upload', description: 'Upload file', auth: true, role: 'admin,data_entry' },
  { method: 'POST', path: '/api/import/extract', description: 'Extract data from file', auth: true, role: 'admin,data_entry' },
  { method: 'GET', path: '/api/reports/state', description: 'State analytics', auth: true },
  { method: 'GET', path: '/api/reports/zone', description: 'Zone analytics', auth: true },
  { method: 'GET', path: '/api/reports/commodity', description: 'Commodity analytics', auth: true },
  { method: 'GET', path: '/api/reports/annual', description: 'Annual trends', auth: true },
  { method: 'POST', path: '/api/auth/login', description: 'User login', auth: false },
  { method: 'POST', path: '/api/auth/register', description: 'User registration', auth: false },
  { method: 'POST', path: '/api/users/invite', description: 'Invite user', auth: true, role: 'admin' }
];

const DEPLOYMENT_CONFIG = {
  convex: {
    schema: `import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  statisticalData: defineTable({
    year: v.number(),
    zone: v.string(),
    state: v.string(),
    category: v.string(),
    commodity_name: v.string(),
    unit_of_measurement: v.string(),
    january: v.optional(v.number()),
    february: v.optional(v.number()),
    march: v.optional(v.number()),
    april: v.optional(v.number()),
    may: v.optional(v.number()),
    june: v.optional(v.number()),
    july: v.optional(v.number()),
    august: v.optional(v.number()),
    september: v.optional(v.number()),
    october: v.optional(v.number()),
    november: v.optional(v.number()),
    december: v.optional(v.number()),
    total: v.optional(v.number()),
    average: v.optional(v.number()),
  }).index("by_year", ["year"])
    .index("by_state", ["state"])
    .index("by_zone", ["zone"])
    .index("by_category", ["category"])
    .index("by_commodity", ["commodity_name"]),
  
  auditLog: defineTable({
    action: v.string(),
    entity_type: v.optional(v.string()),
    entity_id: v.optional(v.string()),
    details: v.string(),
    user_email: v.optional(v.string()),
    created_date: v.number(),
  }).index("by_action", ["action"])
    .index("by_date", ["created_date"]),
});`,
    env: 'CONVEX_DEPLOYMENT=your-deployment-url'
  },
  digitalOcean: {
    appSpec: `name: statistical-digest-system
services:
- name: web
  github:
    repo: your-org/statistical-digest
    branch: main
  run_command: npm run build
  environment_slug: node-js
  instance_size_slug: basic-xxs
  instance_count: 1
  routes:
  - path: /
envs:
- key: DATABASE_URL
  scope: RUN_TIME
  type: SECRET
- key: JWT_SECRET
  scope: RUN_TIME
  type: SECRET`,
    env: 'DATABASE_URL=postgresql://...\nJWT_SECRET=your-secret-key'
  },
  vercel: {
    config: `{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "vite",
  "outputDirectory": "dist"
}`,
    env: 'DATABASE_URL=postgresql://...\nNEXT_PUBLIC_API_URL=https://your-api.com'
  }
};

function CodeBlock({ code, language = 'javascript' }) {
  const [copied, setCopied] = useState(false);
  
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-xs max-h-96">
        <code>{code}</code>
      </pre>
      <Button size="icon" variant="ghost" className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100" onClick={copy}>
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      </Button>
    </div>
  );
}

function ExportJSON() {
  const exportData = {
    app: APP_CONFIG,
    entities: ENTITIES,
    apiEndpoints: API_ENDPOINTS,
    components: FRONTEND_COMPONENTS,
    deployment: DEPLOYMENT_CONFIG
  };
  
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'statistical-digest-api-spec.json';
  a.click();
  toast.success('API specification exported');
}

export default function APIDocumentation() {
  const { user } = useAuth();
  
  if (user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-lg font-semibold">Access Denied</p>
          <p className="text-sm text-muted-foreground">This page is only accessible to administrators</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading">API Documentation & Export</h1>
          <p className="text-sm text-muted-foreground mt-1">Complete API specification for migration and deployment</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={ExportJSON} className="gap-2">
            <Download className="w-4 h-4" /> Export JSON
          </Button>
        </div>
      </div>

      {/* App Overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Cloud className="w-5 h-5 text-primary" />
            Application Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Name</p>
            <p className="text-sm font-semibold">{APP_CONFIG.name}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Version</p>
            <p className="text-sm font-semibold">{APP_CONFIG.version}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Target Platforms</p>
            <div className="flex gap-1 mt-1">
              {APP_CONFIG.targetPlatforms.map(p => (
                <Badge key={p} variant="outline" className="text-[10px]">{p}</Badge>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Description</p>
            <p className="text-sm">{APP_CONFIG.description}</p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="entities">
        <TabsList>
          <TabsTrigger value="entities">Entities</TabsTrigger>
          <TabsTrigger value="api">API Endpoints</TabsTrigger>
          <TabsTrigger value="components">Components</TabsTrigger>
          <TabsTrigger value="deployment">Deployment</TabsTrigger>
        </TabsList>

        <TabsContent value="entities" className="space-y-4 mt-4">
          {ENTITIES.map(entity => (
            <Card key={entity.name}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Database className="w-4 h-4 text-primary" />
                  {entity.name}
                  <Badge variant="outline" className="text-[10px] ml-auto">{entity.fields.length} fields</Badge>
                </CardTitle>
                <p className="text-xs text-muted-foreground">{entity.description}</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Fields</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {entity.fields.map(field => (
                        <div key={field.name} className="flex items-start gap-2 text-xs p-2 bg-muted/30 rounded">
                          <Badge variant="outline" className="text-[10px]">{field.type}</Badge>
                          <div className="flex-1">
                            <p className="font-medium">{field.name} {field.required && <span className="text-destructive">*</span>}</p>
                            <p className="text-muted-foreground">{field.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Operations</p>
                    <div className="flex gap-1 flex-wrap">
                      {entity.operations.map(op => (
                        <Badge key={op} variant="secondary" className="text-[10px]">{op}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="api" className="space-y-4 mt-4">
          {BACKEND_FUNCTIONS.map(section => (
            <Card key={section.name}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Server className="w-4 h-4 text-primary" />
                  {section.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {section.functions.map(fn => (
                    <div key={fn.name} className="flex items-center gap-3 text-xs p-2 border rounded hover:bg-muted/30">
                      <Badge className="w-16 text-[10px]">{fn.method || 'GET'}</Badge>
                      <code className="flex-1 font-mono text-primary">{fn.endpoint}</code>
                      <p className="text-muted-foreground">{fn.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">All API Endpoints</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {API_ENDPOINTS.map((ep, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs p-2 border rounded">
                    <Badge className={`w-16 text-[10px] ${ep.method === 'GET' ? 'bg-accent' : ep.method === 'POST' ? 'bg-primary' : ep.method === 'DELETE' ? 'bg-destructive' : 'bg-secondary'}`}>
                      {ep.method}
                    </Badge>
                    <code className="flex-1 font-mono">{ep.path}</code>
                    <p className="text-muted-foreground">{ep.description}</p>
                    {ep.auth && <Badge variant="outline" className="text-[10px]">Auth</Badge>}
                    {ep.role && <Badge variant="outline" className="text-[10px]">{ep.role}</Badge>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="components" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FRONTEND_COMPONENTS.map(cat => (
              <Card key={cat.category}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Layout className="w-4 h-4 text-primary" />
                    {cat.category}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1">
                    {cat.components.map(c => (
                      <Badge key={c} variant="secondary" className="text-[10px]">{c}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="deployment" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Cloud className="w-4 h-4 text-primary" />
                Convex.dev Schema
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <CodeBlock code={DEPLOYMENT_CONFIG.convex.schema} language="typescript" />
              <div className="text-xs text-muted-foreground">
                <p className="font-semibold mb-1">Environment Variables:</p>
                <code className="bg-muted px-2 py-1 rounded">{DEPLOYMENT_CONFIG.convex.env}</code>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-primary" />
                DigitalOcean App Spec
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <CodeBlock code={DEPLOYMENT_CONFIG.digitalOcean.appSpec} language="yaml" />
              <div className="text-xs text-muted-foreground">
                <p className="font-semibold mb-1">Environment Variables:</p>
                <pre className="bg-muted px-2 py-1 rounded text-[11px]">{DEPLOYMENT_CONFIG.digitalOcean.env}</pre>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" />
                Vercel Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <CodeBlock code={DEPLOYMENT_CONFIG.vercel.config} language="json" />
              <div className="text-xs text-muted-foreground">
                <p className="font-semibold mb-1">Environment Variables:</p>
                <pre className="bg-muted px-2 py-1 rounded text-[11px]">{DEPLOYMENT_CONFIG.vercel.env}</pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}