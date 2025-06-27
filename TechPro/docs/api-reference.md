# TechPro Solutions - API Reference

## Overview
Complete API documentation for all endpoints, authentication requirements, request/response formats, and error handling.

## Base URL
- **Development**: `http://localhost:5000`
- **Production**: `https://your-app.replit.app`

## Authentication
All protected endpoints require authentication via Replit Auth session cookies.

### Authentication Flow
1. **Login**: `GET /api/login` - Redirects to Replit OAuth
2. **Callback**: `GET /api/callback` - Handles OAuth callback
3. **Logout**: `GET /api/logout` - Ends user session
4. **User Info**: `GET /api/auth/user` - Returns current user data

## API Endpoints

### Authentication Endpoints

#### Get Current User
```http
GET /api/auth/user
```

**Authentication**: Required  
**Response**: User object with profile information

**Success Response (200)**:
```json
{
  "id": "927070657",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "profileImageUrl": "https://replit.com/public/images/mark.png",
  "role": "client",
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Error Response (401)**:
```json
{
  "message": "Unauthorized"
}
```

### Health Monitoring Endpoints

#### Database Health Check
```http
GET /api/health/database
```

**Authentication**: Not required  
**Response**: Database connectivity status

**Success Response (200)**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "message": "Database connection successful"
}
```

**Error Response (500)**:
```json
{
  "status": "error",
  "message": "Database connection failed",
  "error": "Connection timeout"
}
```

#### Connection Statistics
```http
GET /api/health/connections
```

**Authentication**: Required (Admin only)  
**Response**: Database connection pool statistics

**Success Response (200)**:
```json
{
  "status": "success",
  "message": "Connection monitoring available with cluster setup",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "note": "Upgrade to multi-node cluster for detailed connection statistics"
}
```

### Appointment Management

#### Get User Appointments
```http
GET /api/appointments
```

**Authentication**: Required  
**Response**: Array of user's appointments

**Success Response (200)**:
```json
[
  {
    "id": 1,
    "userId": "927070657",
    "title": "Cloud Migration Consultation",
    "serviceType": "cloud-computing",
    "description": "Discuss AWS migration strategy",
    "scheduledAt": "2024-01-15T10:00:00.000Z",
    "status": "confirmed",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
]
```

#### Create Appointment
```http
POST /api/appointments
```

**Authentication**: Required  
**Request Body**:
```json
{
  "title": "Network Security Assessment",
  "serviceType": "cybersecurity",
  "description": "Comprehensive security audit of existing infrastructure",
  "scheduledAt": "2024-01-20T14:00:00.000Z"
}
```

**Success Response (201)**:
```json
{
  "id": 2,
  "userId": "927070657",
  "title": "Network Security Assessment",
  "serviceType": "cybersecurity",
  "description": "Comprehensive security audit of existing infrastructure",
  "scheduledAt": "2024-01-20T14:00:00.000Z",
  "status": "pending",
  "createdAt": "2024-01-01T12:00:00.000Z",
  "updatedAt": "2024-01-01T12:00:00.000Z"
}
```

**Validation Error (400)**:
```json
{
  "message": "Invalid appointment data",
  "errors": [
    {
      "code": "invalid_type",
      "expected": "string",
      "received": "undefined",
      "path": ["title"],
      "message": "Required"
    }
  ]
}
```

#### Update Appointment
```http
PUT /api/appointments/:id
```

**Authentication**: Required  
**Parameters**: 
- `id` (number) - Appointment ID

**Request Body** (partial update):
```json
{
  "status": "confirmed",
  "scheduledAt": "2024-01-20T15:00:00.000Z"
}
```

**Success Response (200)**:
```json
{
  "id": 2,
  "userId": "927070657",
  "title": "Network Security Assessment",
  "serviceType": "cybersecurity",
  "description": "Comprehensive security audit of existing infrastructure",
  "scheduledAt": "2024-01-20T15:00:00.000Z",
  "status": "confirmed",
  "createdAt": "2024-01-01T12:00:00.000Z",
  "updatedAt": "2024-01-01T13:00:00.000Z"
}
```

**Not Found (404)**:
```json
{
  "message": "Appointment not found"
}
```

#### Delete Appointment
```http
DELETE /api/appointments/:id
```

**Authentication**: Required  
**Parameters**: 
- `id` (number) - Appointment ID

**Success Response (200)**:
```json
{
  "message": "Appointment deleted successfully"
}
```

### Service Request Management

#### Get User Service Requests
```http
GET /api/service-requests
```

**Authentication**: Required  
**Response**: Array of user's service requests

**Success Response (200)**:
```json
[
  {
    "id": 1,
    "userId": "927070657",
    "title": "Email Server Migration",
    "serviceType": "cloud-computing",
    "priority": "high",
    "description": "Migrate on-premise Exchange to Office 365",
    "status": "in-progress",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-05T00:00:00.000Z"
  }
]
```

#### Create Service Request
```http
POST /api/service-requests
```

**Authentication**: Required  
**Request Body**:
```json
{
  "title": "VPN Setup for Remote Workers",
  "serviceType": "network-setup",
  "priority": "medium",
  "description": "Configure secure VPN access for 20 remote employees"
}
```

**Success Response (201)**:
```json
{
  "id": 2,
  "userId": "927070657",
  "title": "VPN Setup for Remote Workers",
  "serviceType": "network-setup",
  "priority": "medium",
  "description": "Configure secure VPN access for 20 remote employees",
  "status": "open",
  "createdAt": "2024-01-01T12:00:00.000Z",
  "updatedAt": "2024-01-01T12:00:00.000Z"
}
```

#### Update Service Request
```http
PUT /api/service-requests/:id
```

**Authentication**: Required  
**Parameters**: 
- `id` (number) - Service request ID

**Request Body**:
```json
{
  "status": "resolved",
  "priority": "low"
}
```

### Invoice Management

#### Get User Invoices
```http
GET /api/invoices
```

**Authentication**: Required  
**Response**: Array of user's invoices

**Success Response (200)**:
```json
[
  {
    "id": 1,
    "userId": "927070657",
    "amount": "2500.00",
    "description": "Cloud migration consulting - 10 hours",
    "status": "paid",
    "dueDate": "2024-01-30T00:00:00.000Z",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-15T00:00:00.000Z"
  }
]
```

#### Create Invoice
```http
POST /api/invoices
```

**Authentication**: Required  
**Request Body**:
```json
{
  "amount": "1800.00",
  "description": "Network security assessment",
  "dueDate": "2024-02-15T00:00:00.000Z"
}
```

**Success Response (201)**:
```json
{
  "id": 2,
  "userId": "927070657",
  "amount": "1800.00",
  "description": "Network security assessment",
  "status": "pending",
  "dueDate": "2024-02-15T00:00:00.000Z",
  "createdAt": "2024-01-01T12:00:00.000Z",
  "updatedAt": "2024-01-01T12:00:00.000Z"
}
```

### Contact Form

#### Submit Contact Form
```http
POST /api/contact
```

**Authentication**: Not required  
**Request Body**:
```json
{
  "name": "Jane Smith",
  "email": "jane@company.com",
  "subject": "IT Infrastructure Consultation",
  "message": "We need help modernizing our IT infrastructure for a 50-person company."
}
```

**Success Response (200)**:
```json
{
  "message": "Contact form submitted successfully"
}
```

### Admin Endpoints

All admin endpoints require authentication and admin role.

#### Get All Users
```http
GET /api/admin/users
```

**Authentication**: Required (Admin)  
**Response**: Array of all users

**Success Response (200)**:
```json
[
  {
    "id": "927070657",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "client",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

#### Update User Role
```http
PUT /api/admin/users/:id/role
```

**Authentication**: Required (Admin)  
**Parameters**: 
- `id` (string) - User ID

**Request Body**:
```json
{
  "role": "admin"
}
```

**Success Response (200)**:
```json
{
  "id": "927070657",
  "email": "user@example.com",
  "role": "admin",
  "updatedAt": "2024-01-01T13:00:00.000Z"
}
```

#### Update User Status
```http
PUT /api/admin/users/:id/status
```

**Authentication**: Required (Admin)  
**Parameters**: 
- `id` (string) - User ID

**Request Body**:
```json
{
  "isActive": false
}
```

**Success Response (200)**:
```json
{
  "id": "927070657",
  "isActive": false,
  "updatedAt": "2024-01-01T13:00:00.000Z"
}
```

#### Get All Appointments
```http
GET /api/admin/appointments
```

**Authentication**: Required (Admin)  
**Response**: Array of all appointments across all users

#### Get All Service Requests
```http
GET /api/admin/service-requests
```

**Authentication**: Required (Admin)  
**Response**: Array of all service requests across all users

#### Get Contact Submissions
```http
GET /api/admin/contact-submissions
```

**Authentication**: Required (Admin)  
**Response**: Array of all contact form submissions

**Success Response (200)**:
```json
[
  {
    "id": 1,
    "name": "Jane Smith",
    "email": "jane@company.com",
    "subject": "IT Infrastructure Consultation",
    "message": "We need help modernizing our IT infrastructure for a 50-person company.",
    "isRead": false,
    "createdAt": "2024-01-01T10:00:00.000Z"
  }
]
```

#### Mark Contact Submission as Read
```http
PUT /api/admin/contact-submissions/:id/read
```

**Authentication**: Required (Admin)  
**Parameters**: 
- `id` (number) - Contact submission ID

**Success Response (200)**:
```json
{
  "message": "Contact submission marked as read"
}
```

## Error Handling

### HTTP Status Codes
- **200**: Success
- **201**: Created
- **400**: Bad Request (validation errors)
- **401**: Unauthorized (not logged in)
- **403**: Forbidden (insufficient permissions)
- **404**: Not Found
- **500**: Internal Server Error

### Common Error Responses

#### Validation Error (400)
```json
{
  "message": "Invalid appointment data",
  "errors": [
    {
      "code": "invalid_type",
      "expected": "string",
      "received": "undefined",
      "path": ["title"],
      "message": "Required"
    }
  ]
}
```

#### Authentication Error (401)
```json
{
  "message": "Unauthorized"
}
```

#### Authorization Error (403)
```json
{
  "message": "Admin access required"
}
```

#### Not Found Error (404)
```json
{
  "message": "Appointment not found"
}
```

#### Server Error (500)
```json
{
  "message": "Failed to create appointment"
}
```

## Service Types

Valid values for `serviceType` field in appointments and service requests:

- `cloud-computing`: Cloud Computing & Migration
- `network-setup`: Network & Server Setup
- `cybersecurity`: Cybersecurity & Compliance
- `devops`: DevOps & Automation
- `it-support`: IT Support & Maintenance
- `data-analytics`: Data Analytics & BI

## Status Values

### Appointment Status
- `pending`: Awaiting confirmation
- `confirmed`: Confirmed by admin
- `cancelled`: Cancelled by user or admin

### Service Request Status
- `open`: New request
- `in-progress`: Being worked on
- `resolved`: Solution provided
- `closed`: Request completed

### Service Request Priority
- `low`: Non-urgent
- `medium`: Standard priority
- `high`: Important
- `urgent`: Critical issue

### Invoice Status
- `pending`: Payment due
- `paid`: Payment received
- `overdue`: Past due date

## Rate Limiting

Currently no rate limiting is implemented. In production, consider implementing:
- 100 requests per minute per IP for public endpoints
- 1000 requests per minute per user for authenticated endpoints
- 10 requests per minute for contact form submissions

## Webhook Support

Currently not implemented. Future webhook events could include:
- `appointment.created`
- `appointment.updated`
- `service_request.created`
- `invoice.paid`
- `contact.submitted`

## SDK and Client Libraries

Currently not available. Frontend integration uses the built-in query client:

```typescript
import { apiRequest } from "@/lib/queryClient";

// GET request
const appointments = await apiRequest("GET", "/api/appointments");

// POST request
const newAppointment = await apiRequest("POST", "/api/appointments", {
  title: "Network Setup",
  serviceType: "network-setup",
  scheduledAt: "2024-01-20T10:00:00.000Z"
});
```

This API reference covers all available endpoints with complete request/response examples for integration with external systems or mobile applications.