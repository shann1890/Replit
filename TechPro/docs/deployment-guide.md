# TechPro Solutions - Production Deployment Guide

## Overview
Complete deployment guide for taking the TechPro Solutions application from development to production with PostgreSQL clustering, monitoring, and scalability considerations.

## Table of Contents
1. [Pre-deployment Checklist](#pre-deployment-checklist)
2. [PostgreSQL Clustering Deployment](#postgresql-clustering-deployment)
3. [Application Deployment](#application-deployment)
4. [Environment Configuration](#environment-configuration)
5. [Monitoring and Logging](#monitoring-and-logging)
6. [Security Hardening](#security-hardening)
7. [Backup and Recovery](#backup-and-recovery)
8. [Performance Optimization](#performance-optimization)
9. [Maintenance Procedures](#maintenance-procedures)

## Pre-deployment Checklist

### Code Quality
- [ ] All TypeScript errors resolved
- [ ] No console.error or console.warn in production code
- [ ] Database schema finalized and tested
- [ ] All API endpoints tested with proper error handling
- [ ] Authentication flow tested end-to-end
- [ ] Admin panel access controls verified

### Security
- [ ] Environment variables secured (no hardcoded secrets)
- [ ] Session secret is cryptographically secure (32+ characters)
- [ ] Database credentials use strong passwords
- [ ] HTTPS/TLS certificates configured
- [ ] CORS policy configured for production domains
- [ ] Rate limiting implemented for public endpoints

### Performance
- [ ] Database indexes optimized for query patterns
- [ ] Frontend bundle size analyzed and optimized
- [ ] Image assets optimized and compressed
- [ ] CDN configuration planned for static assets

### Monitoring
- [ ] Health check endpoints functional
- [ ] Error logging configured
- [ ] Performance monitoring tools selected
- [ ] Backup procedures documented and tested

## PostgreSQL Clustering Deployment

### Option 1: Patroni + HAProxy (Self-managed)

#### Infrastructure Requirements
```yaml
# Minimum production setup
Nodes: 3 database servers + 1 load balancer
CPU: 4 cores per database node
RAM: 8GB per database node
Storage: 200GB SSD per database node
Network: 1Gbps connectivity between nodes
Load Balancer: 2 cores, 4GB RAM
```

#### Step 1: Server Preparation
```bash
# On each database node (Ubuntu 22.04 LTS)
sudo apt update && sudo apt upgrade -y
sudo apt install postgresql-15 postgresql-15-contrib python3-pip python3-dev etcd -y

# Install Patroni
pip3 install patroni[etcd] psycopg2-binary

# Configure PostgreSQL service
sudo systemctl stop postgresql
sudo systemctl disable postgresql
```

#### Step 2: etcd Cluster Setup
```bash
# Node 1 (10.0.1.10)
sudo tee /etc/systemd/system/etcd.service << EOF
[Unit]
Description=etcd
After=network.target

[Service]
Type=notify
User=etcd
WorkingDirectory=/var/lib/etcd
ExecStart=/usr/bin/etcd \\
  --name=etcd1 \\
  --data-dir=/var/lib/etcd \\
  --listen-client-urls=http://0.0.0.0:2379 \\
  --advertise-client-urls=http://10.0.1.10:2379 \\
  --listen-peer-urls=http://0.0.0.0:2380 \\
  --initial-advertise-peer-urls=http://10.0.1.10:2380 \\
  --initial-cluster=etcd1=http://10.0.1.10:2380,etcd2=http://10.0.1.11:2380,etcd3=http://10.0.1.12:2380 \\
  --initial-cluster-state=new
Restart=always
RestartSec=10s

[Install]
WantedBy=multi-user.target
EOF

sudo useradd -r -d /var/lib/etcd -s /bin/false etcd
sudo mkdir -p /var/lib/etcd
sudo chown etcd:etcd /var/lib/etcd
sudo systemctl daemon-reload
sudo systemctl enable etcd
sudo systemctl start etcd
```

#### Step 3: Patroni Configuration
```yaml
# /etc/patroni/patroni.yml (Node 1)
scope: techpro-cluster
name: postgres-01
namespace: /db/

restapi:
  listen: 10.0.1.10:8008
  connect_address: 10.0.1.10:8008

etcd:
  hosts: 10.0.1.10:2379,10.0.1.11:2379,10.0.1.12:2379

bootstrap:
  dcs:
    ttl: 30
    loop_wait: 10
    retry_timeout: 30
    maximum_lag_on_failover: 1048576
    postgresql:
      use_pg_rewind: true
      use_slots: true
      parameters:
        max_connections: 200
        shared_buffers: 2GB
        effective_cache_size: 6GB
        maintenance_work_mem: 512MB
        checkpoint_completion_target: 0.9
        wal_buffers: 16MB
        default_statistics_target: 100
        random_page_cost: 1.1
        effective_io_concurrency: 200
        work_mem: 16MB
        min_wal_size: 1GB
        max_wal_size: 4GB
        max_worker_processes: 8
        max_parallel_workers_per_gather: 4
        max_parallel_workers: 8
        max_parallel_maintenance_workers: 4
        wal_level: replica
        max_wal_senders: 10
        max_replication_slots: 10
        hot_standby: on
        logging_collector: on
        log_directory: pg_log
        log_filename: postgresql-%Y-%m-%d_%H%M%S.log
        log_rotation_size: 100MB
        log_rotation_age: 1d
        log_min_duration_statement: 1000
        log_checkpoints: on
        log_connections: on
        log_disconnections: on
        log_lock_waits: on

  initdb:
    - encoding: UTF8
    - data-checksums

  pg_hba:
    - host replication replicator 10.0.1.0/24 md5
    - host all all 10.0.1.0/24 md5
    - host all all 0.0.0.0/0 md5

  users:
    admin:
      password: "{{ POSTGRES_ADMIN_PASSWORD }}"
      options:
        - createrole
        - createdb

postgresql:
  listen: 10.0.1.10:5432
  connect_address: 10.0.1.10:5432
  data_dir: /var/lib/postgresql/15/main
  bin_dir: /usr/lib/postgresql/15/bin
  pgpass: /tmp/pgpass
  authentication:
    replication:
      username: replicator
      password: "{{ POSTGRES_REPLICATION_PASSWORD }}"
    superuser:
      username: postgres
      password: "{{ POSTGRES_SUPERUSER_PASSWORD }}"

tags:
  nofailover: false
  noloadbalance: false
  clonefrom: false
  nosync: false
```

#### Step 4: HAProxy Load Balancer
```haproxy
# /etc/haproxy/haproxy.cfg
global
    log stdout local0
    chroot /var/lib/haproxy
    stats socket /run/haproxy/admin.sock mode 660 level admin
    stats timeout 30s
    user haproxy
    group haproxy
    daemon

defaults
    mode tcp
    log global
    retries 2
    timeout connect 5s
    timeout client 1m
    timeout server 1m

# PostgreSQL Primary (Write)
frontend postgres_write
    bind *:5000
    default_backend postgres_primary

backend postgres_primary
    option httpchk GET /primary
    http-check expect status 200
    default-server inter 10s fall 3 rise 2
    server postgres-01 10.0.1.10:5432 check port 8008
    server postgres-02 10.0.1.11:5432 check port 8008 backup
    server postgres-03 10.0.1.12:5432 check port 8008 backup

# PostgreSQL Read Replicas (Read)
frontend postgres_read
    bind *:5001
    default_backend postgres_replicas

backend postgres_replicas
    balance roundrobin
    option httpchk GET /replica
    http-check expect status 200
    default-server inter 10s fall 3 rise 2
    server postgres-01 10.0.1.10:5432 check port 8008 backup
    server postgres-02 10.0.1.11:5432 check port 8008
    server postgres-03 10.0.1.12:5432 check port 8008

# HAProxy Stats
frontend stats
    bind *:8404
    stats enable
    stats uri /stats
    stats refresh 30s
    stats admin if TRUE
```

#### Step 5: Start Services
```bash
# Start Patroni on all nodes
sudo systemctl enable patroni
sudo systemctl start patroni

# Check cluster status
patronictl -c /etc/patroni/patroni.yml list

# Start HAProxy
sudo systemctl enable haproxy
sudo systemctl start haproxy
```

### Option 2: pgEdge Cloud (Managed)

#### Quick Deployment
```bash
# Sign up at pgedge.com and create cluster
# Configure through web console or CLI

# Example 3-node cluster deployment
pgedge cluster create techpro-prod \
  --nodes=3 \
  --regions=us-east-1,us-west-2,eu-west-1 \
  --instance-type=db.t3.large \
  --storage=200GB \
  --backup-retention=7

# Get connection strings
pgedge cluster info techpro-prod
```

### Option 3: CloudNativePG (Kubernetes)

#### Kubernetes Deployment
```yaml
# postgres-cluster.yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: techpro-cluster
  namespace: production
spec:
  instances: 3
  
  postgresql:
    parameters:
      max_connections: "200"
      shared_buffers: "2GB"
      effective_cache_size: "6GB"
      maintenance_work_mem: "512MB"
      checkpoint_completion_target: "0.9"
      wal_buffers: "16MB"
      default_statistics_target: "100"
      random_page_cost: "1.1"
      effective_io_concurrency: "200"
      work_mem: "16MB"
      min_wal_size: "1GB"
      max_wal_size: "4GB"
      
  bootstrap:
    initdb:
      database: techpro
      owner: admin
      secret:
        name: postgres-credentials
        
  storage:
    size: 200Gi
    storageClass: fast-ssd
    
  monitoring:
    enabled: true
    prometheusRule:
      enabled: true
      
  backup:
    retentionPolicy: "7d"
    barmanObjectStore:
      destinationPath: "s3://techpro-backups/postgresql"
      s3Credentials:
        accessKeyId:
          name: backup-credentials
          key: ACCESS_KEY_ID
        secretAccessKey:
          name: backup-credentials
          key: SECRET_ACCESS_KEY
      wal:
        retention: "7d"
      data:
        retention: "7d"
        
  affinity:
    enablePodAntiAffinity: true
    podAntiAffinityType: "required"
    
  resources:
    requests:
      memory: "8Gi"
      cpu: "4"
    limits:
      memory: "8Gi"
      cpu: "4"
---
apiVersion: v1
kind: Secret
metadata:
  name: postgres-credentials
  namespace: production
type: Opaque
data:
  username: YWRtaW4=  # admin (base64)
  password: <base64-encoded-password>
---
apiVersion: v1
kind: Secret
metadata:
  name: backup-credentials
  namespace: production
type: Opaque
data:
  ACCESS_KEY_ID: <base64-encoded-access-key>
  SECRET_ACCESS_KEY: <base64-encoded-secret-key>
```

```bash
# Deploy CloudNativePG operator
kubectl apply -f https://raw.githubusercontent.com/cloudnative-pg/cloudnative-pg/release-1.22/releases/cnpg-1.22.0.yaml

# Deploy cluster
kubectl apply -f postgres-cluster.yaml

# Check cluster status
kubectl get clusters -n production
kubectl get pods -n production
```

## Application Deployment

### Environment Configuration

#### Production Environment Variables
```bash
# .env.production
# Database cluster connections
DATABASE_URL_PRIMARY=postgresql://admin:secure_password@haproxy-server:5000/techpro
DATABASE_URL_REPLICA=postgresql://admin:secure_password@haproxy-server:5001/techpro
DATABASE_URL=postgresql://admin:secure_password@haproxy-server:5000/techpro

# Session security
SESSION_SECRET=extremely_secure_session_secret_32_chars_minimum

# Replit configuration
REPL_ID=your-production-repl-id
REPLIT_DOMAINS=techpro.replit.app,www.techpro.com
ISSUER_URL=https://replit.com/oidc

# Application settings
NODE_ENV=production
PORT=5000

# Monitoring
CLUSTER_HEALTH_INTERVAL=30000
ENABLE_HEALTH_ENDPOINTS=true
LOG_LEVEL=info

# Backup configuration
BACKUP_ENABLED=true
BACKUP_S3_BUCKET=techpro-backups
BACKUP_SCHEDULE="0 2 * * *"  # Daily at 2 AM

# Performance tuning
DB_POOL_MAX_CONNECTIONS=20
DB_POOL_IDLE_TIMEOUT=30000
DB_POOL_CONNECTION_TIMEOUT=5000

# Security
CORS_ORIGIN=https://techpro.replit.app,https://www.techpro.com
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100
```

### Build and Deployment Process

#### Automated Deployment Script
```bash
#!/bin/bash
# deploy.sh

set -e  # Exit on any error

echo "🚀 Starting TechPro Solutions deployment..."

# Step 1: Environment validation
echo "📋 Validating environment..."
if [ -z "$DATABASE_URL_PRIMARY" ]; then
    echo "❌ DATABASE_URL_PRIMARY not set"
    exit 1
fi

if [ -z "$SESSION_SECRET" ]; then
    echo "❌ SESSION_SECRET not set"
    exit 1
fi

if [ ${#SESSION_SECRET} -lt 32 ]; then
    echo "❌ SESSION_SECRET must be at least 32 characters"
    exit 1
fi

# Step 2: Install dependencies
echo "📦 Installing dependencies..."
npm ci --only=production

# Step 3: Build application
echo "🔨 Building application..."
npm run build

# Step 4: Database migrations
echo "🗄️ Running database migrations..."
npm run db:push

# Step 5: Database seeding (if needed)
echo "🌱 Seeding database..."
npm run db:seed 2>/dev/null || echo "No seeding required"

# Step 6: Health check
echo "🏥 Running health checks..."
timeout 30 bash -c 'until curl -f http://localhost:5000/api/health/database; do sleep 2; done'

# Step 7: Application restart
echo "🔄 Restarting application..."
pm2 restart techpro-app || pm2 start npm --name "techpro-app" -- start

echo "✅ Deployment completed successfully!"
echo "🌐 Application available at: https://techpro.replit.app"
```

#### Process Management with PM2
```bash
# Install PM2
npm install -g pm2

# PM2 ecosystem configuration
# ecosystem.config.js
module.exports = {
  apps: [{
    name: 'techpro-app',
    script: 'npm',
    args: 'start',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    instances: 'max',
    exec_mode: 'cluster',
    watch: false,
    max_memory_restart: '1G',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s'
  }],

  deploy: {
    production: {
      user: 'deploy',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:yourusername/techpro-solutions.git',
      path: '/var/www/techpro',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};

# Start with PM2
pm2 start ecosystem.config.js --env production

# Monitor
pm2 monit

# Save PM2 configuration
pm2 save
pm2 startup
```

## Monitoring and Logging

### Application Monitoring

#### Prometheus Configuration
```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'techpro-app'
    static_configs:
      - targets: ['localhost:5000']
    metrics_path: '/metrics'
    scrape_interval: 30s

  - job_name: 'postgresql'
    static_configs:
      - targets: ['postgres-exporter:9187']

  - job_name: 'haproxy'
    static_configs:
      - targets: ['haproxy:8404']
```

#### Grafana Dashboard
```json
{
  "dashboard": {
    "title": "TechPro Solutions Monitoring",
    "panels": [
      {
        "title": "Database Connections",
        "type": "graph",
        "targets": [
          {
            "expr": "postgresql_connections_active",
            "legendFormat": "Active Connections"
          }
        ]
      },
      {
        "title": "API Response Times",
        "type": "graph",
        "targets": [
          {
            "expr": "http_request_duration_seconds",
            "legendFormat": "Response Time"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "singlestat",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~\"5..\"}[5m])",
            "legendFormat": "5xx Errors"
          }
        ]
      }
    ]
  }
}
```

### Log Management

#### Structured Logging
```typescript
// server/logger.ts
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'techpro-api' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

export default logger;
```

#### Log Aggregation (ELK Stack)
```yaml
# docker-compose.logging.yml
version: '3.8'
services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
      - ES_JAVA_OPTS=-Xms1g -Xmx1g
    ports:
      - "9200:9200"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data

  logstash:
    image: docker.elastic.co/logstash/logstash:8.11.0
    ports:
      - "5044:5044"
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf
    depends_on:
      - elasticsearch

  kibana:
    image: docker.elastic.co/kibana/kibana:8.11.0
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200
    depends_on:
      - elasticsearch

volumes:
  elasticsearch_data:
```

## Security Hardening

### SSL/TLS Configuration

#### Nginx Reverse Proxy
```nginx
# /etc/nginx/sites-available/techpro
server {
    listen 80;
    server_name techpro.replit.app www.techpro.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name techpro.replit.app www.techpro.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/techpro.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/techpro.com/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:MozTLS:10m;
    ssl_session_tickets off;

    # Modern configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Firewall Configuration
```bash
# UFW (Uncomplicated Firewall)
sudo ufw default deny incoming
sudo ufw default allow outgoing

# SSH access
sudo ufw allow ssh

# HTTP/HTTPS
sudo ufw allow 80
sudo ufw allow 443

# Database cluster (internal network only)
sudo ufw allow from 10.0.1.0/24 to any port 5432
sudo ufw allow from 10.0.1.0/24 to any port 2379,2380
sudo ufw allow from 10.0.1.0/24 to any port 8008

# Monitoring
sudo ufw allow from monitoring_server_ip to any port 9100,9187

sudo ufw enable
```

### Database Security
```sql
-- Create application-specific database user
CREATE USER techpro_app WITH ENCRYPTED PASSWORD 'secure_app_password';

-- Grant minimal required permissions
GRANT CONNECT ON DATABASE techpro TO techpro_app;
GRANT USAGE ON SCHEMA public TO techpro_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO techpro_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO techpro_app;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO techpro_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO techpro_app;

-- Audit logging
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_min_duration_statement = 1000;
SELECT pg_reload_conf();
```

## Backup and Recovery

### Automated Backup Strategy

#### Database Backups
```bash
#!/bin/bash
# backup-database.sh

BACKUP_DIR="/var/backups/postgresql"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

mkdir -p $BACKUP_DIR

# Full database backup
pg_dump -h haproxy-server -p 5000 -U admin -d techpro \
    --format=custom \
    --compress=9 \
    --verbose \
    --file="$BACKUP_DIR/techpro_full_$DATE.dump"

# Schema-only backup
pg_dump -h haproxy-server -p 5000 -U admin -d techpro \
    --schema-only \
    --format=plain \
    --file="$BACKUP_DIR/techpro_schema_$DATE.sql"

# Upload to S3
aws s3 cp "$BACKUP_DIR/techpro_full_$DATE.dump" \
    s3://techpro-backups/postgresql/full/

aws s3 cp "$BACKUP_DIR/techpro_schema_$DATE.sql" \
    s3://techpro-backups/postgresql/schema/

# Clean up old local backups
find $BACKUP_DIR -name "techpro_*" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: techpro_full_$DATE.dump"
```

#### Application Backups
```bash
#!/bin/bash
# backup-application.sh

APP_DIR="/var/www/techpro"
BACKUP_DIR="/var/backups/application"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Create application backup
tar -czf "$BACKUP_DIR/techpro_app_$DATE.tar.gz" \
    --exclude=node_modules \
    --exclude=.git \
    --exclude=logs \
    --exclude=*.log \
    -C $APP_DIR .

# Upload to S3
aws s3 cp "$BACKUP_DIR/techpro_app_$DATE.tar.gz" \
    s3://techpro-backups/application/

# Clean up old backups
find $BACKUP_DIR -name "techpro_app_*" -mtime +7 -delete

echo "Application backup completed: techpro_app_$DATE.tar.gz"
```

#### Cron Configuration
```bash
# crontab -e
# Database backup daily at 2 AM
0 2 * * * /opt/scripts/backup-database.sh >> /var/log/backup-db.log 2>&1

# Application backup daily at 3 AM
0 3 * * * /opt/scripts/backup-application.sh >> /var/log/backup-app.log 2>&1

# WAL archive backup every 6 hours
0 */6 * * * /opt/scripts/backup-wal.sh >> /var/log/backup-wal.log 2>&1
```

### Disaster Recovery Procedures

#### Database Recovery
```bash
#!/bin/bash
# restore-database.sh

BACKUP_FILE=$1
TARGET_DB="techpro_restored"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file>"
    exit 1
fi

# Create new database
createdb -h haproxy-server -p 5000 -U admin $TARGET_DB

# Restore from backup
pg_restore -h haproxy-server -p 5000 -U admin \
    --dbname=$TARGET_DB \
    --verbose \
    --clean \
    --if-exists \
    $BACKUP_FILE

echo "Database restored to: $TARGET_DB"
```

#### Point-in-Time Recovery
```bash
#!/bin/bash
# point-in-time-recovery.sh

RECOVERY_TARGET_TIME="2024-01-15 14:30:00"
BASE_BACKUP="/var/backups/postgresql/base"
WAL_ARCHIVE="/var/backups/postgresql/wal"

# Stop PostgreSQL
sudo systemctl stop postgresql

# Restore base backup
rm -rf /var/lib/postgresql/15/main/*
tar -xzf $BASE_BACKUP/base_backup.tar.gz -C /var/lib/postgresql/15/main/

# Create recovery configuration
cat > /var/lib/postgresql/15/main/recovery.conf << EOF
restore_command = 'cp $WAL_ARCHIVE/%f %p'
recovery_target_time = '$RECOVERY_TARGET_TIME'
recovery_target_action = 'promote'
EOF

# Start PostgreSQL
sudo systemctl start postgresql

echo "Point-in-time recovery to $RECOVERY_TARGET_TIME initiated"
```

## Performance Optimization

### Database Optimization

#### PostgreSQL Tuning
```sql
-- postgresql.conf optimizations for production
-- Memory configuration
shared_buffers = '25% of RAM'              -- e.g., 2GB for 8GB RAM
effective_cache_size = '75% of RAM'         -- e.g., 6GB for 8GB RAM
work_mem = '16MB'                          -- Per operation
maintenance_work_mem = '512MB'             -- For maintenance operations

-- Connection settings
max_connections = 200
superuser_reserved_connections = 3

-- Write-ahead logging
wal_buffers = '16MB'
wal_level = 'replica'
max_wal_size = '4GB'
min_wal_size = '1GB'
checkpoint_completion_target = 0.9

-- Query planner
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200

-- Parallel processing
max_worker_processes = 8
max_parallel_workers_per_gather = 4
max_parallel_workers = 8
max_parallel_maintenance_workers = 4

-- Autovacuum tuning
autovacuum_max_workers = 3
autovacuum_naptime = '15s'
autovacuum_vacuum_scale_factor = 0.1
autovacuum_analyze_scale_factor = 0.05
```

#### Index Optimization
```sql
-- Create indexes for common query patterns
CREATE INDEX CONCURRENTLY idx_appointments_user_id_scheduled 
ON appointments(user_id, scheduled_at DESC);

CREATE INDEX CONCURRENTLY idx_service_requests_status_created 
ON service_requests(status, created_at DESC);

CREATE INDEX CONCURRENTLY idx_invoices_user_status 
ON invoices(user_id, status);

CREATE INDEX CONCURRENTLY idx_contact_submissions_read_created 
ON contact_submissions(is_read, created_at DESC);

-- Partial indexes for better performance
CREATE INDEX CONCURRENTLY idx_users_active_email 
ON users(email) WHERE is_active = true;

CREATE INDEX CONCURRENTLY idx_appointments_pending 
ON appointments(user_id, scheduled_at) WHERE status = 'pending';

-- Text search index
CREATE INDEX CONCURRENTLY idx_appointments_search 
ON appointments USING gin(to_tsvector('english', title || ' ' || description));
```

### Application Performance

#### Connection Pooling
```typescript
// server/db-optimized.ts
import { Pool } from '@neondatabase/serverless';

const createOptimizedPool = (connectionString: string) => {
  return new Pool({
    connectionString,
    max: 20,                    // Maximum connections
    min: 5,                     // Minimum connections
    idleTimeoutMillis: 30000,   // Close idle connections
    connectionTimeoutMillis: 5000, // Connection timeout
    acquireTimeoutMillis: 60000,   // Wait time for connection
    createTimeoutMillis: 30000,    // Creation timeout
    destroyTimeoutMillis: 5000,    // Destroy timeout
    reapIntervalMillis: 1000,      // Check for idle connections
    createRetryIntervalMillis: 200, // Retry interval
  });
};
```

#### Caching Strategy
```typescript
// server/cache.ts
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
});

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
  },

  async set(key: string, value: any, ttlSeconds = 3600): Promise<void> {
    await redis.setex(key, ttlSeconds, JSON.stringify(value));
  },

  async del(key: string): Promise<void> {
    await redis.del(key);
  },

  async invalidatePattern(pattern: string): Promise<void> {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
};

// Usage in routes
app.get("/api/appointments", isAuthenticated, async (req: any, res) => {
  const userId = req.user.claims.sub;
  const cacheKey = `appointments:${userId}`;
  
  let appointments = await cache.get(cacheKey);
  if (!appointments) {
    appointments = await storage.getAppointments(userId);
    await cache.set(cacheKey, appointments, 300); // 5 minutes
  }
  
  res.json(appointments);
});
```

### Frontend Optimization

#### Bundle Analysis and Code Splitting
```typescript
// vite.config.ts optimizations
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
          utils: ['date-fns', 'clsx', 'tailwind-merge']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
  }
});
```

## Maintenance Procedures

### Regular Maintenance Tasks

#### Weekly Tasks
```bash
#!/bin/bash
# weekly-maintenance.sh

echo "Starting weekly maintenance..."

# Update system packages
sudo apt update && sudo apt upgrade -y

# Analyze database statistics
psql -h haproxy-server -p 5000 -U admin -d techpro -c "ANALYZE;"

# Vacuum and reindex
psql -h haproxy-server -p 5000 -U admin -d techpro -c "VACUUM ANALYZE;"

# Clear old logs
find /var/log -name "*.log" -mtime +30 -delete
find /var/www/techpro/logs -name "*.log" -mtime +7 -delete

# PM2 maintenance
pm2 flush
pm2 logs --lines 1000 > /var/log/pm2-archive-$(date +%Y%m%d).log

echo "Weekly maintenance completed"
```

#### Monthly Tasks
```bash
#!/bin/bash
# monthly-maintenance.sh

echo "Starting monthly maintenance..."

# Full database vacuum
psql -h haproxy-server -p 5000 -U admin -d techpro -c "VACUUM FULL;"

# Reindex all tables
psql -h haproxy-server -p 5000 -U admin -d techpro -c "REINDEX DATABASE techpro;"

# Check for unused indexes
psql -h haproxy-server -p 5000 -U admin -d techpro -c "
SELECT schemaname, tablename, indexname, idx_tup_read, idx_tup_fetch 
FROM pg_stat_user_indexes 
WHERE idx_tup_read = 0 AND idx_tup_fetch = 0;
"

# Security updates
sudo unattended-upgrades

# SSL certificate renewal
sudo certbot renew

echo "Monthly maintenance completed"
```

### Monitoring and Alerting

#### Health Check Script
```bash
#!/bin/bash
# health-check.sh

ALERT_EMAIL="admin@techpro.com"
WEBHOOK_URL="https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"

# Check application health
APP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/health/database)

if [ "$APP_STATUS" != "200" ]; then
    echo "Application health check failed: $APP_STATUS" | mail -s "TechPro Alert: Application Down" $ALERT_EMAIL
    curl -X POST -H 'Content-type: application/json' \
        --data '{"text":"🚨 TechPro Application health check failed"}' \
        $WEBHOOK_URL
fi

# Check database cluster health
PATRONI_STATUS=$(curl -s http://10.0.1.10:8008/health)
if [[ "$PATRONI_STATUS" != *"running"* ]]; then
    echo "Database cluster health check failed" | mail -s "TechPro Alert: Database Issue" $ALERT_EMAIL
fi

# Check disk space
DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 85 ]; then
    echo "Disk usage critical: $DISK_USAGE%" | mail -s "TechPro Alert: Disk Space" $ALERT_EMAIL
fi

# Check memory usage
MEMORY_USAGE=$(free | grep Mem | awk '{print ($3/$2) * 100.0}')
if (( $(echo "$MEMORY_USAGE > 85" | bc -l) )); then
    echo "Memory usage critical: $MEMORY_USAGE%" | mail -s "TechPro Alert: Memory" $ALERT_EMAIL
fi
```

This comprehensive deployment guide covers all aspects of taking the TechPro Solutions application to production with high availability PostgreSQL clustering, robust monitoring, security hardening, and automated maintenance procedures.