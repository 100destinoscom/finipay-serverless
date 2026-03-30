# FinPay API - Referência Completa de Endpoints

---

## Base URL

```
https://api.finpay.io
```

## Autenticação

Todos os endpoints requerem:
```
Authorization: Bearer <sua-chave-de-api>
```

---

## Endpoints

### 🏦 Banks

#### Listar Bancos
```http
GET /api/v1/banks
```

**Headers:**
```
Authorization: Bearer fp_live_xxxxx
```

**Response (200):**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Banco BAI",
    "code": "BAI",
    "country": "AO",
    "logoUrl": "https://...",
    "isActive": true
  },
  {
    "id": "660e8400-e29b-41d4-a716-446655440111",
    "name": "BFA",
    "code": "BFA",
    "country": "AO",
    "logoUrl": "https://...",
    "isActive": true
  }
]
```

---

### ✅ Validação

#### Validar Recibo
```http
POST /api/v1/validate
```

**Headers:**
```
Content-Type: application/json
Authorization: Bearer fp_live_xxxxx
```

**Request Body:**
```json
{
  "encrypted_pdf": "base64_string",
  "bank_id": "uuid",
  "expected": {
    "amount": "number",
    "date": "YYYY-MM-DD",
    "reference": "string",
    "description": "string"
  },
  "idempotency_key": "string",
  "webhook_url": "https://url-valida"
}
```

**Responses:**

✅ Sucesso (200):
```json
{
  "duplicate": false,
  "proof_id": "uuid",
  "valid": true,
  "confidence": 0.96,
  "matched_template_id": "uuid",
  "bank": {
    "id": "uuid",
    "name": "Banco BAI",
    "code": "BAI"
  },
  "templates_checked": 3,
  "extracted": {
    "amount": 5000.00,
    "date": "2024-01-15",
    "reference": "TXN123",
    "beneficiary": "João",
    "payer": "Empresa ABC"
  }
}
```

❌ Falha na Validação (200):
```json
{
  "duplicate": false,
  "proof_id": "uuid",
  "valid": false,
  "confidence": 0.32,
  "bank": {
    "id": "uuid",
    "name": "Banco BAI",
    "code": "BAI"
  },
  "templates_checked": 3
}
```

⚠️ Duplicado (200):
```json
{
  "valid": false,
  "duplicate": true,
  "reason": "proof_already_submitted",
  "original_proof_id": "uuid",
  "original_submitted_at": "2024-01-15T10:30:00Z"
}
```

❌ Erro (400+):
```json
{
  "error": "validation_error",
  "message": "Invalid bank_id format",
  "details": {}
}
```

**Status Codes:**
- `200` - Validação processada
- `400` - Requisição inválida
- `401` - Não autenticado
- `403` - Não autorizado
- `404` - Recurso não encontrado
- `409` - Conflito (duplicata)
- `422` - Não processável
- `429` - Rate limit
- `500` - Erro servidor

---

#### Obter Detalhes de Validação
```http
GET /api/v1/validate/{proof_id}
```

**Headers:**
```
Authorization: Bearer fp_live_xxxxx
```

**Response (200):**
```json
{
  "id": "uuid",
  "sha256": "abc123...",
  "phash": "def456...",
  "valid": true,
  "confidence": 0.96,
  "isDuplicate": false,
  "extractedData": { ... },
  "bank": { ... },
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:35:00Z"
}
```

---

#### Histórico de Validações
```http
GET /api/v1/validate/history?limit=10&offset=0
```

**Query Parameters:**
- `limit` (optional, default: 10, max: 100)
- `offset` (optional, default: 0)
- `status` (optional: "valid", "invalid", "duplicate")
- `start_date` (optional: ISO 8601)
- `end_date` (optional: ISO 8601)

**Response (200):**
```json
{
  "data": [
    {
      "id": "uuid",
      "proofId": "uuid",
      "valid": true,
      "confidence": 0.96,
      "bank": { ... },
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 150,
  "limit": 10,
  "offset": 0
}
```

---

### 📋 Templates

#### Listar Templates
```http
GET /api/v1/templates?bank_id=uuid&type=express
```

**Query Parameters:**
- `bank_id` (optional)
- `type` (optional: "express", "iban", "transferencia")
- `is_active` (optional: "true", "false")

**Response (200):**
```json
[
  {
    "id": "uuid",
    "name": "Template Express",
    "type": "express",
    "bank": { ... },
    "cloudinaryFileUrl": "https://...",
    "metadata": {},
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00Z"
  }
]
```

---

#### Criar Template
```http
POST /api/v1/templates
```

**Headers:**
```
Content-Type: multipart/form-data
Authorization: Bearer fp_live_xxxxx
```

**Body (Form Data):**
- `name` (string, optional)
- `bank_id` (string, required)
- `type` (string, required: "express", "iban", "transferencia")
- `file` (file, required - PDF do template)
- `metadata` (JSON, optional)

**Response (201):**
```json
{
  "id": "uuid",
  "name": "Template Express",
  "type": "express",
  "cloudinaryFileUrl": "https://...",
  "bank": { ... },
  "createdAt": "2024-01-15T10:30:00Z"
}
```

---

#### Atualizar Template
```http
PUT /api/v1/templates/{template_id}
```

**Headers:**
```
Content-Type: application/json
Authorization: Bearer fp_live_xxxxx
```

**Body:**
```json
{
  "name": "Novo Nome",
  "type": "iban",
  "is_active": true,
  "metadata": {}
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "name": "Novo Nome",
  "type": "iban",
  "cloudinaryFileUrl": "https://...",
  "bank": { ... },
  "isActive": true,
  "updatedAt": "2024-01-15T10:35:00Z"
}
```

---

#### Deletar Template
```http
DELETE /api/v1/templates/{template_id}
```

**Headers:**
```
Authorization: Bearer fp_live_xxxxx
```

**Response (204):**
```
No Content
```

---

### 🔑 API Keys

#### Criar API Key
```http
POST /api/v1/api-keys
```

**Headers:**
```
Content-Type: application/json
Authorization: Bearer fp_live_xxxxx
```

**Body:**
```json
{
  "name": "Chave de Desenvolvimento"
}
```

**Response (201):**
```json
{
  "id": "uuid",
  "name": "Chave de Desenvolvimento",
  "key": "fp_live_xxxxxxxxxxxxxxxxxxxxx",
  "prefix": "fp_live_",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

⚠️ **Nota:** A chave é exibida apenas uma vez. Guarde-a em local seguro.

---

#### Listar API Keys
```http
GET /api/v1/api-keys
```

**Response (200):**
```json
[
  {
    "id": "uuid",
    "name": "Chave de Desenvolvimento",
    "prefix": "fp_live_",
    "lastUsedAt": "2024-01-17T10:30:00Z",
    "createdAt": "2024-01-15T10:30:00Z"
  }
]
```

---

#### Revogar API Key
```http
DELETE /api/v1/api-keys/{key_id}
```

**Response (204):**
```
No Content
```

---

### 📊 Estatísticas

#### Obter Estatísticas
```http
GET /api/v1/stats?period=month&start_date=2024-01-01&end_date=2024-01-31
```

**Query Parameters:**
- `period` (optional: "day", "week", "month", "year", default: "month")
- `start_date` (optional: ISO 8601)
- `end_date` (optional: ISO 8601)

**Response (200):**
```json
{
  "total_validations": 1250,
  "successful_validations": 1100,
  "failed_validations": 100,
  "duplicated_validations": 50,
  "success_rate": 0.88,
  "average_confidence": 0.92,
  "by_bank": {
    "BAI": {
      "total": 500,
      "successful": 450,
      "success_rate": 0.90
    },
    "BFA": {
      "total": 400,
      "successful": 340,
      "success_rate": 0.85
    }
  },
  "by_day": [
    {
      "date": "2024-01-01",
      "total": 50,
      "successful": 45,
      "failed": 5
    }
  ]
}
```

---

### 👤 Perfil

#### Obter Perfil
```http
GET /api/v1/profile
```

**Response (200):**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "João Silva",
  "company_name": "Empresa ABC Lda",
  "role": "admin",
  "created_at": "2024-01-15T10:30:00Z"
}
```

---

#### Atualizar Perfil
```http
PUT /api/v1/profile
```

**Headers:**
```
Content-Type: application/json
Authorization: Bearer fp_live_xxxxx
```

**Body:**
```json
{
  "name": "Novo Nome",
  "company_name": "Nova Empresa"
}
```

**Response (200):**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "Novo Nome",
  "company_name": "Nova Empresa",
  "updated_at": "2024-01-17T10:35:00Z"
}
```

---

### 🔐 Segurança

#### Alterar Senha
```http
POST /api/v1/profile/change-password
```

**Headers:**
```
Content-Type: application/json
Authorization: Bearer fp_live_xxxxx
```

**Body:**
```json
{
  "current_password": "senhaAtual",
  "new_password": "novaSenha"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password updated successfully"
}
```

---

## Rate Limiting

Todas as requisições estão sujeitas a rate limiting:

- **Limite:** 100 requisições por 15 minutos
- **Header de resposta:** `X-RateLimit-Remaining`
- **Erro:** Status `429` quando limite é excedido

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642857600
```

---

## Webhooks

### Estrutura do Webhook
```http
POST https://seu-dominio.com/webhook
Content-Type: application/json
User-Agent: FinPay-Webhook/1.0
```

```json
{
  "event": "validation.completed",
  "idempotency_key": "unique-key",
  "duplicate": false,
  "proof_id": "uuid",
  "valid": true,
  "confidence": 0.96,
  "matched_template_id": "uuid",
  "bank": {
    "id": "uuid",
    "name": "Banco BAI",
    "code": "BAI"
  },
  "templates_checked": 3,
  "extracted": {
    "amount": 5000.00,
    "date": "2024-01-15",
    "reference": "TXN123"
  }
}
```

### Resposta Esperada
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "received": true
}
```

---

## Tipos de Erro

### ValidationError (400)
```json
{
  "error": "validation_error",
  "message": "Invalid request format",
  "details": {
    "field": "bank_id",
    "issue": "Invalid UUID format"
  }
}
```

### UnauthorizedError (401)
```json
{
  "error": "unauthorized",
  "message": "Missing or invalid API key"
}
```

### ForbiddenError (403)
```json
{
  "error": "forbidden",
  "message": "You don't have permission to access this resource"
}
```

### NotFoundError (404)
```json
{
  "error": "not_found",
  "message": "Bank not found",
  "resourceType": "Bank"
}
```

### ConflictError (409)
```json
{
  "valid": false,
  "duplicate": true,
  "reason": "proof_already_submitted",
  "original_proof_id": "uuid",
  "original_submitted_at": "2024-01-15T10:30:00Z"
}
```

### UnprocessableEntityError (422)
```json
{
  "error": "unprocessable_entity",
  "message": "PDF could not be processed",
  "reason": "invalid_pdf_structure"
}
```

### RateLimitError (429)
```json
{
  "error": "rate_limit",
  "message": "Too many requests",
  "retryAfter": 300
}
```

### ServerError (500)
```json
{
  "error": "internal_error",
  "message": "An unexpected error occurred"
}
```

---

## Versionamento

A API usa versionamento via URL: `/api/v1/`

Versões futuras estarão disponíveis em `/api/v2/`, `/api/v3/`, etc.

---

**Última atualização:** 17 de janeiro de 2024
