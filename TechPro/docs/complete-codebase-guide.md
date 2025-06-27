# TechPro Solutions - Complete Codebase Guide

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture Deep Dive](#architecture-deep-dive)
3. [Database Layer](#database-layer)
4. [Backend Implementation](#backend-implementation)
5. [Frontend Implementation](#frontend-implementation)
6. [PostgreSQL Clustering](#postgresql-clustering)
7. [Authentication System](#authentication-system)
8. [Code Structure Reference](#code-structure-reference)
9. [Dependencies Guide](#dependencies-guide)
10. [Development Workflow](#development-workflow)

## Project Overview

TechPro Solutions is a full-stack web application for IT services companies serving individuals and SMEs in Malaysia. It provides a professional client portal with appointment scheduling, billing management, and service request tracking.

### Key Features
- **Landing Page**: Marketing site with service showcase and contact forms
- **Client Portal**: Secure dashboard for authenticated users
- **Admin Panel**: User management and system monitoring
- **PostgreSQL Clustering**: Multi-node database redundancy support
- **Responsive Design**: Mobile-first UI with Tailwind CSS

### Technology Stack
```
Frontend: React 18 + TypeScript + Vite
Backend: Node.js + Express.js + TypeScript
Database: PostgreSQL + Drizzle ORM
Authentication: Replit Auth (OpenID Connect)
UI: Shadcn/UI + Tailwind CSS + Radix UI
State: TanStack Query for server state
```

## Architecture Deep Dive

### Monorepo Structure
```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Route-level components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utility functions and configurations
│   │   └── main.tsx       # Application entry point
│   └── index.html         # HTML template
├── server/                # Backend Express application
│   ├── db.ts             # Database connection (single node)
│   ├── db-cluster.ts     # Database clustering support
│   ├── index.ts          # Server entry point
│   ├── routes.ts         # API route definitions
│   ├── storage.ts        # Data access layer
│   ├── replitAuth.ts     # Authentication middleware
│   └── vite.ts           # Development server integration
├── shared/               # Shared types and schemas
│   └── schema.ts         # Database schema and validation
└── docs/                 # Documentation
```

### Data Flow Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Browser   │───▶│   Vite Dev  │───▶│   Express   │
│             │    │   Server    │    │   Server    │
└─────────────┘    └─────────────┘    └─────────────┘
                                              │
                                              ▼
                                      ┌─────────────┐
                                      │ PostgreSQL  │
                                      │  Database   │
                                      └─────────────┘
```

**Request Flow:**
1. User interacts with React frontend
2. TanStack Query manages API calls
3. Vite dev server proxies to Express backend
4. Express routes handle business logic
5. Storage layer interacts with PostgreSQL
6. Response flows back through the stack

## Database Layer

### Core Schema (`shared/schema.ts`)

#### User Management
```typescript
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),           // Replit user ID
  email: varchar("email").unique(),                   // User email
  firstName: varchar("first_name"),                   // First name
  lastName: varchar("last_name"),                     // Last name
  profileImageUrl: varchar("profile_image_url"),      // Avatar URL
  role: varchar("role").default("client"),            // client|admin
  isActive: boolean("is_active").default(true),       // Account status
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

#### Business Operations
```typescript
export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: varchar("title").notNull(),
  serviceType: varchar("service_type").notNull(),     // cloud-computing, network-setup, etc.
  description: text("description"),
  scheduledAt: timestamp("scheduled_at").notNull(),
  status: varchar("status").default("pending"),        // pending, confirmed, cancelled
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const serviceRequests = pgTable("service_requests", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: varchar("title").notNull(),
  serviceType: varchar("service_type").notNull(),
  priority: varchar("priority").default("medium"),     // low, medium, high, urgent
  description: text("description"),
  status: varchar("status").default("open"),           // open, in-progress, resolved, closed
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  status: varchar("status").default("pending"),        // pending, paid, overdue
  dueDate: timestamp("due_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
```

#### Marketing & Support
```typescript
export const contactSubmissions = pgTable("contact_submissions", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  email: varchar("email").notNull(),
  subject: varchar("subject").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Required for Replit Auth session storage
export const sessions = pgTable("sessions", {
  sid: varchar("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire").notNull(),
});
```

### Database Connection (`server/db.ts`)

```typescript
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });
```

### Storage Layer (`server/storage.ts`)

The storage layer implements the Repository pattern, providing a clean interface between business logic and database operations:

```typescript
export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Business operations
  getAppointments(userId: string): Promise<Appointment[]>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: number, userId: string, data: Partial<InsertAppointment>): Promise<Appointment | undefined>;
  deleteAppointment(id: number, userId: string): Promise<boolean>;
  
  // Service requests, invoices, contact submissions...
  // Admin operations for user management...
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: { ...userData, updatedAt: new Date() },
      })
      .returning();
    return user;
  }
  
  // Implementation continues for all business operations...
}
```

## Backend Implementation

### Server Entry Point (`server/index.ts`)

```typescript
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }
      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Global error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });

  // Development vs Production setup
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = 5000;
  server.listen({ port, host: "0.0.0.0", reusePort: true }, () => {
    log(`serving on port ${port}`);
  });
})();
```

### API Routes (`server/routes.ts`)

#### Authentication Routes
```typescript
export async function registerRoutes(app: Express): Promise<Server> {
  // Setup Replit Auth
  await setupAuth(app);

  // Get authenticated user
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
```

#### Business Logic Routes
```typescript
  // Appointments CRUD
  app.get("/api/appointments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const appointments = await storage.getAppointments(userId);
      res.json(appointments);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      res.status(500).json({ message: "Failed to fetch appointments" });
    }
  });

  app.post("/api/appointments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validatedData = insertAppointmentSchema.parse({
        ...req.body,
        userId,
      });
      const appointment = await storage.createAppointment(validatedData);
      res.status(201).json(appointment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid appointment data", errors: error.errors });
      } else {
        console.error("Error creating appointment:", error);
        res.status(500).json({ message: "Failed to create appointment" });
      }
    }
  });
```

#### Admin Routes with Role-Based Access
```typescript
  const isAdmin: RequestHandler = async (req: any, res, next) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const user = await storage.getUser(userId);
      if (!user || user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      next();
    } catch (error) {
      console.error("Error checking admin status:", error);
      res.status(500).json({ message: "Failed to verify admin status" });
    }
  };

  app.get("/api/admin/users", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching all users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });
```

### Authentication System (`server/replitAuth.ts`)

#### OpenID Connect Configuration
```typescript
import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";
import passport from "passport";
import session from "express-session";

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
    },
  });
}
```

#### Authentication Middleware
```typescript
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  // Token refresh logic
  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};
```

## Frontend Implementation

### Application Structure (`client/src/App.tsx`)

```typescript
import { useAuth } from "@/hooks/useAuth";
import { Switch, Route } from "wouter";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Appointments from "@/pages/appointments";
import Services from "@/pages/services";
import Billing from "@/pages/billing";
import Admin from "@/pages/admin";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={Home} />
          <Route path="/appointments" component={Appointments} />
          <Route path="/services" component={Services} />
          <Route path="/billing" component={Billing} />
          <Route path="/admin" component={Admin} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster />
      <Router />
    </QueryClientProvider>
  );
}
```

### Authentication Hook (`client/src/hooks/useAuth.ts`)

```typescript
import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
```

### Data Fetching Layer (`client/src/lib/queryClient.ts`)

```typescript
import { QueryClient } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    throw new Error(`${res.status}: ${res.statusText}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: any
): Promise<any> {
  const config: RequestInit = {
    method,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  };

  if (data) {
    config.body = JSON.stringify(data);
  }

  const res = await fetch(url, config);
  await throwIfResNotOk(res);
  return res.json();
}

type UnauthorizedBehavior = "returnNull" | "throw";

export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => (queryContext: { queryKey: readonly unknown[] }) => Promise<T | null> =
  ({ on401 }) =>
  async ({ queryKey }) => {
    try {
      const url = queryKey[0] as string;
      return await apiRequest("GET", url);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("401") &&
        on401 === "returnNull"
      ) {
        return null;
      }
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      staleTime: Infinity,
      refetchInterval: false,
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
});
```

### Form Implementation Example (`client/src/pages/appointments.tsx`)

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { insertAppointmentSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

type AppointmentFormData = z.infer<typeof insertAppointmentSchema>;

export default function Appointments() {
  const { isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();

  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(insertAppointmentSchema.omit({ userId: true })),
    defaultValues: {
      title: "",
      serviceType: "",
      description: "",
      scheduledAt: "",
    },
  });

  const { data: appointments, isLoading: appointmentsLoading } = useQuery({
    queryKey: ["/api/appointments"],
    enabled: isAuthenticated,
  });

  const createAppointmentMutation = useMutation({
    mutationFn: async (data: AppointmentFormData) => {
      await apiRequest("POST", "/api/appointments", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      form.reset();
      toast({
        title: "Success",
        description: "Appointment created successfully",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create appointment",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AppointmentFormData) => {
    createAppointmentMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Form Section */}
          <Card>
            <CardHeader>
              <CardTitle>Schedule New Appointment</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input placeholder="Appointment title" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="serviceType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Service Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select service type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="cloud-computing">Cloud Computing</SelectItem>
                            <SelectItem value="network-setup">Network & Server Setup</SelectItem>
                            <SelectItem value="cybersecurity">Cybersecurity</SelectItem>
                            <SelectItem value="devops">DevOps & Automation</SelectItem>
                            <SelectItem value="it-support">IT Support & Maintenance</SelectItem>
                            <SelectItem value="data-analytics">Data Analytics</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={createAppointmentMutation.isPending}
                  >
                    {createAppointmentMutation.isPending ? "Creating..." : "Schedule Appointment"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Appointments List */}
          <Card>
            <CardHeader>
              <CardTitle>Your Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              {appointmentsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading appointments...</p>
                </div>
              ) : appointments?.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No appointments scheduled</p>
              ) : (
                <div className="space-y-4">
                  {appointments?.map((appointment: any) => (
                    <div key={appointment.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">{appointment.title}</h3>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(appointment.status)}
                          <span className={getStatusColor(appointment.status)}>
                            {appointment.status}
                          </span>
                        </div>
                      </div>
                      <p className="text-gray-600 mb-2">{appointment.serviceType}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(appointment.scheduledAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
```

## PostgreSQL Clustering

### Cluster Architecture Support (`server/db-cluster.ts`)

```typescript
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Primary database connection (writes)
const primaryConnectionString = process.env.DATABASE_URL_PRIMARY || process.env.DATABASE_URL;
const replicaConnectionString = process.env.DATABASE_URL_REPLICA || process.env.DATABASE_URL;

if (!primaryConnectionString) {
  throw new Error(
    "DATABASE_URL_PRIMARY or DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Connection pools
export const primaryPool = new Pool({ 
  connectionString: primaryConnectionString,
  max: 20, // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const replicaPool = new Pool({ 
  connectionString: replicaConnectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Database instances
export const primaryDb = drizzle({ client: primaryPool, schema });
export const replicaDb = drizzle({ client: replicaPool, schema });

// Default export for compatibility
export const db = primaryDb;
export const pool = primaryPool;

// Health check function
export async function checkClusterHealth() {
  const results = {
    primary: { healthy: false, latency: 0, error: null as string | null },
    replica: { healthy: false, latency: 0, error: null as string | null }
  };

  // Test primary connection
  try {
    const start = Date.now();
    await primaryDb.execute('SELECT 1');
    results.primary.healthy = true;
    results.primary.latency = Date.now() - start;
  } catch (error) {
    results.primary.error = error instanceof Error ? error.message : 'Unknown error';
  }

  // Test replica connection
  try {
    const start = Date.now();
    await replicaDb.execute('SELECT 1');
    results.replica.healthy = true;
    results.replica.latency = Date.now() - start;
  } catch (error) {
    results.replica.error = error instanceof Error ? error.message : 'Unknown error';
  }

  return results;
}
```

### Clustering Deployment Options

#### 1. Patroni + HAProxy Setup
```yaml
# patroni.yml
scope: techpro-cluster
name: node1
restapi:
  listen: 0.0.0.0:8008
etcd:
  hosts: 10.0.1.10:2379,10.0.1.11:2379,10.0.1.12:2379
postgresql:
  listen: 0.0.0.0:5432
  data_dir: /var/lib/postgresql/data
  authentication:
    replication:
      username: replicator
      password: secure_password
```

```haproxy
# HAProxy configuration
backend postgres_primary
  option httpchk GET /primary
  server node1 10.0.1.10:5432 check port 8008
  server node2 10.0.1.11:5432 check port 8008 backup
  server node3 10.0.1.12:5432 check port 8008 backup

backend postgres_replicas
  balance roundrobin
  option httpchk GET /replica
  server node1 10.0.1.10:5432 check port 8008 backup
  server node2 10.0.1.11:5432 check port 8008
  server node3 10.0.1.12:5432 check port 8008
```

#### 2. pgEdge Multi-Master
```bash
# Install pgEdge
curl -fsSL https://pgedge.com/install.py | python3

# Initialize nodes
./pgedge install db1 --port=5432 --superuser=admin --password=secure_password --database=techpro

# Configure replication
./pgedge spock node-create node1 'host=node1.example.com port=5432 dbname=techpro'
./pgedge spock repset-create techpro_repset
./pgedge spock repset-add-table techpro_repset users
./pgedge spock repset-add-table techpro_repset appointments
./pgedge spock repset-add-table techpro_repset service_requests
./pgedge spock repset-add-table techpro_repset invoices
```

#### 3. CloudNativePG on Kubernetes
```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: techpro-cluster
spec:
  instances: 3
  postgresql:
    parameters:
      max_connections: "200"
      shared_buffers: "256MB"
      effective_cache_size: "1GB"
  bootstrap:
    initdb:
      database: techpro
      owner: admin
      secret:
        name: postgres-credentials
  storage:
    size: 100Gi
    storageClass: fast-ssd
```

### Environment Configuration
```bash
# .env.cluster
DATABASE_URL_PRIMARY=postgresql://admin:password@haproxy-server:5000/techpro
DATABASE_URL_REPLICA=postgresql://admin:password@haproxy-server:5001/techpro
DATABASE_URL=postgresql://admin:password@haproxy-server:5000/techpro

# Session configuration
SESSION_SECRET=your-secure-session-secret

# Replit environment
REPL_ID=your-repl-id
REPLIT_DOMAINS=your-app.replit.app

# Monitoring
CLUSTER_HEALTH_INTERVAL=30000
ENABLE_HEALTH_ENDPOINTS=true
```

## Code Structure Reference

### File Purposes and Relationships

#### Core Application Files
- **`server/index.ts`**: Server entry point, middleware setup, error handling
- **`server/routes.ts`**: API endpoints, authentication, business logic
- **`server/storage.ts`**: Data access layer, database operations
- **`server/replitAuth.ts`**: Authentication middleware, OpenID Connect setup
- **`shared/schema.ts`**: Database schema, types, validation schemas
- **`client/src/App.tsx`**: Frontend router, authentication flow
- **`client/src/main.tsx`**: React application entry point

#### Data Flow Relationships
```
client/src/App.tsx
    ↓ (uses)
client/src/hooks/useAuth.ts
    ↓ (queries)
client/src/lib/queryClient.ts
    ↓ (calls)
server/routes.ts
    ↓ (uses)
server/storage.ts
    ↓ (queries)
server/db.ts
    ↓ (connects to)
PostgreSQL Database
```

#### Component Organization
```
client/src/components/
├── ui/                    # Base UI components (shadcn/ui)
│   ├── button.tsx
│   ├── form.tsx
│   ├── input.tsx
│   └── ...
├── navigation.tsx         # App navigation bar
├── hero.tsx              # Landing page hero section
├── services-section.tsx  # Services showcase
└── contact-section.tsx   # Contact form component

client/src/pages/
├── landing.tsx           # Public marketing page
├── home.tsx              # Authenticated user dashboard
├── appointments.tsx      # Appointment management
├── services.tsx          # Service request management
├── billing.tsx           # Invoice and payment history
├── admin.tsx             # Admin panel
└── not-found.tsx         # 404 error page
```

#### Configuration Files
- **`package.json`**: Dependencies, scripts, project metadata
- **`vite.config.ts`**: Vite build configuration, path aliases
- **`tailwind.config.ts`**: Tailwind CSS configuration
- **`tsconfig.json`**: TypeScript configuration
- **`drizzle.config.ts`**: Database configuration for Drizzle ORM
- **`components.json`**: Shadcn/UI configuration

## Dependencies Guide

### Backend Dependencies

#### Core Framework
```json
{
  "express": "^4.18.2",              // Web server framework
  "@types/express": "^4.17.17",      // TypeScript types for Express
  "tsx": "^4.0.0",                   // TypeScript execution for development
  "typescript": "^5.0.0"             // TypeScript compiler
}
```

#### Database Layer
```json
{
  "drizzle-orm": "^0.29.0",          // Type-safe SQL query builder
  "drizzle-kit": "^0.20.0",          // Database migrations and schema generation
  "@neondatabase/serverless": "^0.6.0", // Neon PostgreSQL driver
  "drizzle-zod": "^0.5.1",           // Zod integration for validation
  "zod": "^3.22.0"                   // Schema validation library
}
```

#### Authentication
```json
{
  "passport": "^0.6.0",              // Authentication middleware
  "@types/passport": "^1.0.12",      // TypeScript types
  "openid-client": "^5.6.0",         // OpenID Connect client
  "express-session": "^1.17.3",      // Session management
  "connect-pg-simple": "^9.0.1",     // PostgreSQL session store
  "memoizee": "^0.4.15"              // Function memoization
}
```

#### Development Tools
```json
{
  "vite": "^5.0.0",                  // Build tool and dev server
  "@vitejs/plugin-react": "^4.0.0",  // React plugin for Vite
  "esbuild": "^0.19.0"               // JavaScript bundler
}
```

### Frontend Dependencies

#### React Ecosystem
```json
{
  "react": "^18.2.0",                // UI library
  "react-dom": "^18.2.0",            // DOM renderer
  "@types/react": "^18.2.0",         // TypeScript types
  "@types/react-dom": "^18.2.0",     // TypeScript types
  "wouter": "^2.12.0"                // Lightweight router
}
```

#### State Management
```json
{
  "@tanstack/react-query": "^5.0.0", // Server state management
  "react-hook-form": "^7.47.0",      // Form management
  "@hookform/resolvers": "^3.3.0"    // Form validation resolvers
}
```

#### UI Framework
```json
{
  "tailwindcss": "^3.3.0",           // Utility-first CSS framework
  "@tailwindcss/typography": "^0.5.0", // Typography plugin
  "tailwindcss-animate": "^1.0.7",   // Animation utilities
  "class-variance-authority": "^0.7.0", // Component variants
  "clsx": "^2.0.0",                  // Conditional classes
  "tailwind-merge": "^1.14.0"        // Merge Tailwind classes
}
```

#### Radix UI Components
```json
{
  "@radix-ui/react-dialog": "^1.0.5",
  "@radix-ui/react-dropdown-menu": "^2.0.6",
  "@radix-ui/react-form": "^0.0.3",
  "@radix-ui/react-label": "^2.0.2",
  "@radix-ui/react-select": "^2.0.0",
  "@radix-ui/react-tabs": "^1.0.4",
  "@radix-ui/react-toast": "^1.1.5"
}
```

#### Icons and Utilities
```json
{
  "lucide-react": "^0.292.0",        // Icon library
  "react-icons": "^4.11.0",          // Additional icons
  "date-fns": "^2.30.0"              // Date manipulation
}
```

### Development Dependencies

#### TypeScript Configuration
```json
{
  "@types/node": "^20.0.0",          // Node.js types
  "@types/express-session": "^1.17.7",
  "@types/connect-pg-simple": "^7.0.0",
  "@types/memoizee": "^0.4.8",
  "@types/ws": "^8.5.5"
}
```

#### Build Tools
```json
{
  "postcss": "^8.4.31",              // CSS post-processor
  "autoprefixer": "^10.4.16",        // CSS vendor prefixing
  "@replit/vite-plugin-cartographer": "^1.0.0", // Replit integration
  "@replit/vite-plugin-runtime-error-modal": "^1.0.0"
}
```

## Development Workflow

### Setting Up Development Environment

1. **Install Dependencies**
```bash
npm install
```

2. **Environment Configuration**
```bash
# Create .env file
DATABASE_URL=postgresql://username:password@localhost:5432/techpro
SESSION_SECRET=your-secure-session-secret
REPL_ID=your-repl-id
```

3. **Database Setup**
```bash
# Push schema to database
npm run db:push

# Generate types (optional)
npm run db:generate
```

4. **Start Development Server**
```bash
npm run dev
```

### Database Operations

#### Schema Changes
```bash
# After modifying shared/schema.ts
npm run db:push          # Push changes to database
npm run db:studio        # Open Drizzle Studio (database GUI)
```

#### Backup and Restore
```bash
# Backup
pg_dump $DATABASE_URL > backup.sql

# Restore
psql $DATABASE_URL < backup.sql
```

### Code Quality

#### Type Checking
```bash
# Check TypeScript errors
npx tsc --noEmit

# Check specific file
npx tsc --noEmit server/routes.ts
```

#### Testing API Endpoints
```bash
# Health check
curl http://localhost:5000/api/health/database

# Test authentication (requires login)
curl -b cookies.txt http://localhost:5000/api/auth/user
```

### Deployment Checklist

#### Pre-deployment
- [ ] All TypeScript errors resolved
- [ ] Database schema up to date
- [ ] Environment variables configured
- [ ] Session secret set securely
- [ ] REPL_ID and REPLIT_DOMAINS configured

#### Production Environment
- [ ] Database clustering configured (if needed)
- [ ] Backup strategy implemented
- [ ] Monitoring endpoints enabled
- [ ] Error logging configured
- [ ] SSL/TLS certificates valid

### Monitoring and Maintenance

#### Health Monitoring
```bash
# Check application health
curl https://your-app.replit.app/api/health/database

# Monitor logs
tail -f /var/log/application.log
```

#### Performance Optimization
- Monitor database query performance
- Use connection pooling
- Implement caching where appropriate
- Optimize bundle size with code splitting

### Troubleshooting Common Issues

#### Database Connection Issues
```typescript
// Check connection in server/db.ts
try {
  await db.execute('SELECT 1');
  console.log('Database connected successfully');
} catch (error) {
  console.error('Database connection failed:', error);
}
```

#### Authentication Problems
- Verify REPL_ID and REPLIT_DOMAINS
- Check session configuration
- Ensure cookies are being sent with requests

#### Build Errors
- Clear node_modules and reinstall dependencies
- Check for TypeScript version conflicts
- Verify all imports are using correct paths

This comprehensive guide covers the entire codebase structure, implementation details, and operational procedures for the TechPro Solutions application, including full PostgreSQL clustering support for production scalability.