# PostgreSQL Multi-Node Clustering for TechPro Solutions

## Overview
This guide covers implementing PostgreSQL clustering for high availability and redundancy in production environments.

## Architecture Options

### 1. Patroni + HAProxy (Recommended)
**Primary-Standby clustering with automatic failover**

- **Primary Node**: Handles all write operations
- **Standby Nodes**: Handle read operations, promote to primary on failure
- **etcd/Consul**: Distributed consensus for leader election
- **HAProxy**: Load balancer with health checks
- **Failover Time**: 3-15 seconds automatic recovery

### 2. pgEdge Multi-Master
**Active-active clustering for global applications**

- **All Nodes**: Accept read and write operations
- **Conflict Resolution**: Built-in logical replication
- **Global Distribution**: Nodes in different regions
- **Lower Latency**: Users connect to nearest node

### 3. CloudNativePG
**Kubernetes-native PostgreSQL clustering**

- **Container Orchestration**: Kubernetes operators
- **Automated Backups**: Object storage integration
- **Rolling Updates**: Zero-downtime upgrades
- **Resource Management**: CPU/memory limits

## Implementation Steps

### Option 1: Patroni Setup (Traditional Servers)

**Server Requirements (per node):**
- CPU: 2-4 cores
- RAM: 4-8GB
- Storage: 100GB+ SSD
- Network: 1Gbps connectivity

**Installation Process:**

1. **Install Dependencies**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql-15 python3-pip etcd -y
pip3 install patroni[etcd] psycopg2-binary
```

2. **Configure etcd Cluster**
```bash
# Node 1 (IP: 10.0.1.10)
etcd --name node1 --data-dir /var/lib/etcd \
     --listen-client-urls http://0.0.0.0:2379 \
     --advertise-client-urls http://10.0.1.10:2379 \
     --initial-cluster node1=http://10.0.1.10:2380,node2=http://10.0.1.11:2380,node3=http://10.0.1.12:2380
```

3. **Patroni Configuration Example**
```yaml
# /etc/patroni/patroni.yml
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

4. **HAProxy Load Balancer**
```haproxy
# Primary writes (port 5000)
backend postgres_primary
  option httpchk GET /primary
  server node1 10.0.1.10:5432 check port 8008
  server node2 10.0.1.11:5432 check port 8008 backup
  server node3 10.0.1.12:5432 check port 8008 backup

# Read replicas (port 5001)
backend postgres_replicas
  balance roundrobin
  option httpchk GET /replica
  server node1 10.0.1.10:5432 check port 8008 backup
  server node2 10.0.1.11:5432 check port 8008
  server node3 10.0.1.12:5432 check port 8008
```

### Option 2: pgEdge Cloud (Managed Service)

**Quick Setup:**
1. Sign up at pgedge.com
2. Deploy 3-node cluster across regions
3. Configure database connection strings
4. Enable automatic conflict resolution

**Benefits:**
- Fully managed service
- Global distribution
- Built-in monitoring
- Automated backups

## Application Integration

### Database Connection Updates

For read/write separation:
```typescript
// server/db-cluster.ts
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from "@shared/schema";

// Primary connection for writes
const primaryPool = new Pool({ 
  connectionString: process.env.DATABASE_URL_PRIMARY 
});

// Replica connection for reads
const replicaPool = new Pool({ 
  connectionString: process.env.DATABASE_URL_REPLICA 
});

export const primaryDb = drizzle({ client: primaryPool, schema });
export const replicaDb = drizzle({ client: replicaPool, schema });
```

### Environment Configuration
```bash
# Cluster connection strings
DATABASE_URL_PRIMARY=postgresql://user:pass@haproxy:5000/techpro
DATABASE_URL_REPLICA=postgresql://user:pass@haproxy:5001/techpro
DATABASE_URL=postgresql://user:pass@haproxy:5000/techpro  # fallback
```

## Monitoring and Maintenance

### Health Checks
```bash
# Patroni cluster status
curl http://node1:8008/cluster

# HAProxy statistics
curl http://haproxy:8404/stats
```

### Backup Strategy
```bash
# Automated daily backups
pg_dump -h primary-node -p 5432 techpro | gzip > backup_$(date +%Y%m%d).sql.gz
```

### Performance Monitoring
- **Prometheus + Grafana** for metrics
- **pg_stat_statements** for query analysis
- **Connection pooling** with pgBouncer
- **Slow query logging** for optimization

## Cost Considerations

### Self-Managed (AWS/Azure/GCP)
- **3 x medium instances**: $75-150/month
- **Load balancer**: $20-30/month
- **Storage**: $30-50/month
- **Total**: $125-230/month

### Managed Services
- **pgEdge Cloud**: $150-400/month
- **AWS RDS Multi-AZ**: $200-500/month
- **Google Cloud SQL HA**: $180-450/month

## Disaster Recovery

### Backup Procedures
1. **Daily automated backups** to cloud storage
2. **Point-in-time recovery** using WAL archiving
3. **Cross-region replication** for geographic redundancy
4. **Recovery testing** monthly validation

### Failover Testing
1. **Simulated primary failure**
2. **Network partition scenarios**
3. **Full cluster restart procedures**
4. **Data consistency verification**

## Best Practices

### Security
- **TLS encryption** for all connections
- **Certificate-based authentication**
- **Network segmentation** and firewalls
- **Regular security updates**

### Performance
- **Connection pooling** (pgBouncer/pgCat)
- **Read/write splitting** in application
- **Query optimization** and indexing
- **Resource monitoring** and alerting

### Operations
- **Automated deployments** with testing
- **Configuration management** (Ansible/Terraform)
- **Log aggregation** and analysis
- **Incident response procedures**

This clustering setup provides enterprise-grade reliability for your IT services platform with minimal downtime and automatic recovery capabilities.