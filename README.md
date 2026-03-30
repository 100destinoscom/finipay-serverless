# FinPay Serverless API

A production-ready serverless Fastify + TypeScript API for receipt validation using Prisma ORM and Cloudinary.

## 🚀 Features

- **Authentication** - JWT-based auth with registration, login, and logout
- **Template Management** - Upload and manage receipt templates (PDF/images) to Cloudinary
- **API Key Management** - Generate and manage API keys for external integrations
- **Receipt Validation** - Validate customer payment proofs against templates via Python microservice
- **Multi-tenant** - Complete company isolation
- **Rate Limiting** - Protect validation endpoint from abuse
- **Serverless Ready** - Deploy to AWS Lambda, Vercel, Netlify, etc.

## 📦 Tech Stack

- **Framework**: Fastify
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **File Storage**: Cloudinary
- **Authentication**: JWT
- **Validation**: Zod

## 🏗️ Project Structure

```
finpayServeless/
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── seed.ts             # Database seeding script
├── src/
│   ├── config/
│   │   ├── cloudinary.ts   # Cloudinary configuration
│   │   ├── database.ts     # Prisma client singleton
│   │   └── env.ts          # Environment validation
│   ├── middleware/
│   │   ├── apiKey.ts       # API key authentication
│   │   └── auth.ts         # JWT authentication
│   ├── routes/
│   │   └── v1/
│   │       ├── apiKeys.ts  # API key routes
│   │       ├── auth.ts     # Authentication routes
│   │       ├── templates.ts # Template routes
│   │       └── validate.ts # Validation route
│   ├── schemas/
│   │   └── index.ts        # Zod validation schemas
│   ├── utils/
│   │   ├── apiKey.ts       # API key generation
│   │   ├── errors.ts       # Error classes & handler
│   │   ├── jwt.ts          # JWT utilities
│   │   └── password.ts     # Password hashing
│   ├── app.ts              # Fastify app setup
│   ├── index.ts            # Serverless handler
│   └── server.ts           # Local development server
├── .env.example            # Environment template
├── package.json
└── tsconfig.json
```

## 🛠️ Setup

### Prerequisites

- Node.js >= 18
- PostgreSQL database
- Cloudinary account
- Python verification service (separate)

### Installation

1. **Clone and install dependencies:**

```bash
cd finpayServeless
npm install
```

2. **Configure environment variables:**

```bash
cp .env.example .env
```

Edit `.env` with your actual values:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/finpay"
JWT_SECRET="your-secret-key"
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
PYTHON_SERVICE_URL="http://localhost:8000/verify"
```

3. **Setup database:**

```bash
# Generate Prisma Client
npm run generate

# Run migrations
npm run migrate:dev

# Seed database (optional)
npm run db:seed
```

4. **Start development server:**

```bash
npm run dev
```

Server runs on `http://localhost:3000`

## 📡 API Endpoints

### Base URL: `/api/v1`

### Authentication (`/api/v1/auth`)

#### Register
```http
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "company@example.com",
  "password": "securepass123",
  "company_name": "TechCorp"
}
```

#### Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "company@example.com",
  "password": "securepass123"
}
```

Response:
```json
{
  "message": "Logged in",
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### Logout
```http
POST /api/v1/auth/logout
Authorization: Bearer <token>
```

### Templates (`/api/v1/templates`)

All template routes require JWT authentication via `Authorization: Bearer <token>` header.

#### Create Template
```http
POST /api/v1/templates
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: [PDF or image file]
bank: "BFA"
type: "express"
metadata: {"phone_number_format": "### ### ###"}
```

#### List Templates
```http
GET /api/v1/templates?bank=BFA
Authorization: Bearer <token>
```

#### Get Template
```http
GET /api/v1/templates/:id
Authorization: Bearer <token>
```

#### Delete Template
```http
DELETE /api/v1/templates/:id
Authorization: Bearer <token>
```

### API Keys (`/api/v1/apikeys`)

All API key routes require JWT authentication.

#### Create API Key
```http
POST /api/v1/apikeys
Authorization: Bearer <token>
```

#### List API Keys
```http
GET /api/v1/apikeys
Authorization: Bearer <token>
```

#### Delete API Key
```http
DELETE /api/v1/apikeys/:id
Authorization: Bearer <token>
```

### Validation (`/api/v1/validate`)

Requires API key authentication via `X-API-Key` header. Rate limited.

#### Validate Receipt
```http
POST /api/v1/validate
X-API-Key: fp_live_xxxxx
Content-Type: application/json

{
  "encrypted_pdf": "base64_encrypted_data",
  "template_id": "uuid",
  "expected": {
    "price": 12345.50,
    "ref": "945 924 964",
    "currency": "AOA"
  }
}
```

Response:
```json
{
  "result": {
    "valid": true,
    "confidence": 0.92,
    "messages": ["Price matched", "Reference matched"]
  }
}
```

## 🐍 Python Service Contract

The TypeScript API expects a Python verification service at the URL specified in `PYTHON_SERVICE_URL`.

### Expected HTTP Endpoint

**POST** `/verify`

**Request:**
```json
{
  "encrypted_pdf": "base64_string",
  "template": {
    "bank": "BFA",
    "type": "express",
    "cloudinary_file_url": "https://res.cloudinary.com/.../template.pdf",
    "metadata": {}
  },
  "expected": {
    "price": 12345.50,
    "ref": "945 924 964",
    "currency": "AOA"
  }
}
```

**Response:**
```json
{
  "valid": true,
  "confidence": 0.92,
  "messages": ["Price matched", "Reference matched"]
}
```

## 🚀 Deployment

### Deploy to Vercel

1. **Install Vercel CLI:**
```bash
npm i -g vercel
```

2. **Create `vercel.json`:**
```json
{
  "version": 2,
  "builds": [
    {
      "src": "src/index.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "src/index.ts"
    }
  ],
  "env": {
    "DATABASE_URL": "@database-url",
    "JWT_SECRET": "@jwt-secret",
    "CLOUDINARY_CLOUD_NAME": "@cloudinary-cloud-name",
    "CLOUDINARY_API_KEY": "@cloudinary-api-key",
    "CLOUDINARY_API_SECRET": "@cloudinary-api-secret",
    "PYTHON_SERVICE_URL": "@python-service-url"
  }
}
```

3. **Deploy:**
```bash
npm run build
vercel --prod
```

4. **Set environment variables:**
```bash
vercel env add DATABASE_URL
vercel env add JWT_SECRET
# ... add all required env vars
```

### Deploy to AWS Lambda

1. **Install Serverless Framework:**
```bash
npm i -g serverless
```

2. **Create `serverless.yml`:**
```yaml
service: finpay-api

provider:
  name: aws
  runtime: nodejs18.x
  stage: ${opt:stage, 'dev'}
  region: us-east-1
  environment:
    DATABASE_URL: ${env:DATABASE_URL}
    JWT_SECRET: ${env:JWT_SECRET}
    CLOUDINARY_CLOUD_NAME: ${env:CLOUDINARY_CLOUD_NAME}
    CLOUDINARY_API_KEY: ${env:CLOUDINARY_API_KEY}
    CLOUDINARY_API_SECRET: ${env:CLOUDINARY_API_SECRET}
    PYTHON_SERVICE_URL: ${env:PYTHON_SERVICE_URL}

functions:
  api:
    handler: dist/index.handler
    events:
      - http:
          path: /{proxy+}
          method: ANY
          cors: true

plugins:
  - serverless-offline
```

3. **Deploy:**
```bash
npm run build
serverless deploy --stage production
```

### Deploy to Netlify

1. **Create `netlify.toml`:**
```toml
[build]
  command = "npm run build"
  functions = "dist"
  publish = "dist"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/index/:splat"
  status = 200
```

2. **Deploy:**
```bash
npm run build
netlify deploy --prod
```

## 🧪 Development Scripts

```bash
# Development with hot reload
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Database commands
npm run generate      # Generate Prisma Client
npm run migrate:dev   # Run migrations (dev)
npm run migrate       # Deploy migrations (prod)
npm run db:push       # Push schema without migrations
npm run db:seed       # Seed database
npm run db:studio     # Open Prisma Studio

# Code quality
npm run lint          # Run ESLint
npm run format        # Format with Prettier
npm run type-check    # TypeScript type checking
```

## 🔐 Security

- Passwords are hashed with bcrypt (10 rounds)
- JWT tokens with configurable expiration
- Token blacklist for logout
- Rate limiting on validation endpoint
- API key authentication for external integrations
- Multi-tenant data isolation
- Helmet.js security headers
- CORS configuration

## 📝 Environment Variables

See `.env.example` for all required variables.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

MIT
