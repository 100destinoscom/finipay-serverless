# FinPay API - Guia de Integração Completo

Bem-vindo ao guia oficial de integração da API FinPay. Este documento cobre tudo o que você precisa saber para integrar validação de recibos em sua aplicação.

---

## 📚 Índice

1. [Autenticação](#autenticação)
2. [Endpoint `/api/v1/validate`](#endpoint-apiv1validate)
3. [Webhooks](#webhooks)
4. [Exemplos de Integração](#exemplos-de-integração)
5. [Tratamento de Erros](#tratamento-de-erros)
6. [Boas Práticas](#boas-práticas)
7. [FAQ](#faq)

---

## 🔐 Autenticação

Todas as requisições para a API FinPay requerem uma chave de API válida.

### Como obter sua chave de API

1. Faça login em [console.finpay.io](https://console.finpay.io)
2. Vá para "Configurações > API Keys"
3. Clique em "Criar Nova Chave"
4. Copie a chave gerada

### Formatos de autenticação

#### Bearer Token (Recomendado)
```
Authorization: Bearer fp_live_xxxxxxxxxxxxxxxxxxxxx
```

#### Header Customizado (Alternativo)
```
X-API-Key: fp_live_xxxxxxxxxxxxxxxxxxxxx
```

### Segurança
- **Nunca compartilhe sua chave de API**
- Use variáveis de ambiente para armazenar chaves
- Rotacione chaves regularmente
- Use diferentes chaves para dev/prod

---

## 📤 Endpoint `/api/v1/validate`

### Descrição
Valida um recibo em PDF contra templates salvos e extrai dados automaticamente.

### URL Base
```
POST https://api.finpay.io/api/v1/validate
```

### Autenticação
Requerida via header `Authorization: Bearer <sua-chave>`

### Headers
```http
Content-Type: application/json
Authorization: Bearer fp_live_xxxxxxxxxxxxxxxxxxxxx
```

### Request Body

```json
{
  "encrypted_pdf": "string (base64 do PDF plano)",
  "bank_id": "string (UUID do banco)",
  "expected": {
    "amount": "number (opcional)",
    "date": "string YYYY-MM-DD (opcional)",
    "reference": "string (opcional)",
    "description": "string (opcional)"
  },
  "idempotency_key": "string (obrigatório, único por empresa)",
  "webhook_url": "string (opcional, URL válida para notificação)"
}
```

### Campos Detalhados

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `encrypted_pdf` | string | ✅ Sim | Base64 do PDF do recibo (PDF puro, não criptografado) |
| `bank_id` | string (UUID) | ✅ Sim | UUID do banco (obtenha via `/api/v1/banks`) |
| `expected` | object | ⚠️ Parcial | Valores esperados para validação (todos opcionais dentro) |
| `expected.amount` | number | ❌ Não | Valor esperado (ex: 5000.00) |
| `expected.date` | string | ❌ Não | Data esperada (formato: YYYY-MM-DD) |
| `expected.reference` | string | ❌ Não | Referência/ID esperado |
| `expected.description` | string | ❌ Não | Descrição esperada |
| `idempotency_key` | string | ✅ Sim | Chave única para idempotência (max 255 chars) |
| `webhook_url` | string | ❌ Não | URL para receber notificação de resultado |

### Response - Sucesso (200)

#### Validação bem-sucedida
```json
{
  "duplicate": false,
  "proof_id": "550e8400-e29b-41d4-a716-446655440000",
  "valid": true,
  "confidence": 0.96,
  "matched_template_id": "template-uuid",
  "bank": {
    "id": "bank-uuid",
    "name": "Banco BAI",
    "code": "BAI"
  },
  "templates_checked": 3,
  "extracted": {
    "amount": 5000.00,
    "date": "2024-01-15",
    "reference": "TXN123456",
    "beneficiary": "João Silva",
    "payer": "Empresa ABC Lda"
  }
}
```

#### Validação falhada
```json
{
  "duplicate": false,
  "proof_id": "550e8400-e29b-41d4-a716-446655440000",
  "valid": false,
  "confidence": 0.32,
  "bank": {
    "id": "bank-uuid",
    "name": "Banco BAI",
    "code": "BAI"
  },
  "templates_checked": 3
}
```

#### Recibo duplicado
```json
{
  "valid": false,
  "duplicate": true,
  "reason": "proof_already_submitted",
  "original_proof_id": "550e8400-e29b-41d4-a716-446655440000",
  "original_submitted_at": "2024-01-15T10:30:00Z"
}
```

### Response - Erros

#### 400 - Bad Request
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

#### 401 - Unauthorized
```json
{
  "error": "unauthorized",
  "message": "Missing or invalid API key"
}
```

#### 404 - Not Found
```json
{
  "error": "not_found",
  "message": "Bank not found",
  "bankId": "invalid-uuid"
}
```

#### 409 - Conflict (Duplicata)
```json
{
  "valid": false,
  "duplicate": true,
  "reason": "proof_already_submitted",
  "original_proof_id": "550e8400-e29b-41d4-a716-446655440000",
  "original_submitted_at": "2024-01-15T10:30:00Z"
}
```

#### 500 - Internal Server Error
```json
{
  "error": "internal_error",
  "message": "Failed to process receipt. Please try again later."
}
```

### Status Codes

| Status | Significado |
|--------|------------|
| `200` | Validação concluída (sucesso, falha ou duplicata) |
| `400` | Requisição inválida (campos obrigatórios faltando, formato errado) |
| `401` | Não autenticado (chave de API faltando ou inválida) |
| `403` | Não autorizado (banco inativo, recurso protegido) |
| `404` | Recurso não encontrado (banco, template) |
| `409` | Conflito (recibo já foi validado - duplicata) |
| `422` | Unprocessable Entity (dados válidos mas não processáveis) |
| `429` | Too Many Requests (rate limit excedido) |
| `500` | Erro interno do servidor |

---

## 🔔 Webhooks

### O que são Webhooks?

Webhooks são notificações em tempo real enviadas para sua aplicação quando uma validação é concluída.

### Como funciona

1. Você fornece uma `webhook_url` na requisição
2. A API processa o recibo
3. Quando pronto, envia um POST para sua `webhook_url`
4. Você recebe o resultado e pode processar

### Formato do Webhook

```http
POST https://seu-dominio.com/webhooks/finpay
Content-Type: application/json
User-Agent: FinPay-Webhook/1.0
```

```json
{
  "event": "validation.completed",
  "idempotency_key": "unique-request-id-12345",
  "duplicate": false,
  "proof_id": "550e8400-e29b-41d4-a716-446655440000",
  "valid": true,
  "confidence": 0.96,
  "matched_template_id": "template-uuid",
  "bank": {
    "id": "bank-uuid",
    "name": "Banco BAI",
    "code": "BAI"
  },
  "templates_checked": 3,
  "extracted": {
    "amount": 5000.00,
    "date": "2024-01-15",
    "reference": "TXN123456"
  }
}
```

### Implementando um Webhook

#### Node.js/Express
```javascript
app.post('/webhooks/finpay', express.json(), (req, res) => {
  const { event, idempotency_key, valid, proof_id } = req.body;

  console.log(`Webhook recebido: ${event}`);
  console.log(`Idempotency Key: ${idempotency_key}`);
  console.log(`Validação: ${valid ? 'Sucesso' : 'Falhou'}`);
  console.log(`Proof ID: ${proof_id}`);

  // Processar resultado
  if (valid) {
    // Atualizar status de pagamento
    updatePaymentStatus(proof_id, 'validated');
    
    // Notificar usuário
    notifyUser(proof_id, 'Recibo validado com sucesso!');
  } else {
    // Marca para revisão manual
    markForReview(proof_id);
  }

  // Responder imediatamente
  res.status(200).json({ received: true });
});
```

#### Python/Flask
```python
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/webhooks/finpay', methods=['POST'])
def finpay_webhook():
    data = request.json
    
    event = data.get('event')
    proof_id = data.get('proof_id')
    valid = data.get('valid')
    idempotency_key = data.get('idempotency_key')
    
    print(f"Webhook recebido: {event}")
    print(f"Proof ID: {proof_id}")
    print(f"Validação: {'Sucesso' if valid else 'Falhou'}")
    
    # Processar resultado
    if valid:
        update_payment_status(proof_id, 'validated')
        notify_user(proof_id, 'Recibo validado!')
    else:
        mark_for_review(proof_id)
    
    return jsonify({'received': True}), 200

if __name__ == '__main__':
    app.run(port=5000)
```

#### PHP
```php
<?php
$data = json_decode(file_get_contents('php://input'), true);

$event = $data['event'] ?? null;
$proof_id = $data['proof_id'] ?? null;
$valid = $data['valid'] ?? false;
$idempotency_key = $data['idempotency_key'] ?? null;

error_log("Webhook recebido: $event");
error_log("Proof ID: $proof_id");
error_log("Validação: " . ($valid ? 'Sucesso' : 'Falhou'));

// Processar resultado
if ($valid) {
    updatePaymentStatus($proof_id, 'validated');
    notifyUser($proof_id, 'Recibo validado!');
} else {
    markForReview($proof_id);
}

http_response_code(200);
echo json_encode(['received' => true]);
?>
```

### Boas Práticas para Webhooks

1. **Responda rapidamente** (em menos de 10 segundos)
2. **Use `idempotency_key`** para evitar duplicação
3. **Implemente retry logic** no seu lado
4. **Log everything** para debugging
5. **Valide a origem** do webhook (se implementado HMAC)
6. **Não confie só em webhooks** - implemente polling como fallback

---

## 💻 Exemplos de Integração

### JavaScript/TypeScript (Fetch API)

```javascript
import fs from 'fs';

async function validateReceipt(pdfPath, bankId) {
  // 1. Ler arquivo PDF
  const pdfBuffer = fs.readFileSync(pdfPath);
  const pdfBase64 = pdfBuffer.toString('base64');

  // 2. Gerar ID único para idempotência
  const idempotencyKey = `receipt-${Date.now()}-${Math.random()}`;

  // 3. Preparar payload
  const payload = {
    encrypted_pdf: pdfBase64,
    bank_id: bankId,
    idempotency_key: idempotencyKey,
    expected: {
      amount: 5000.00,
      date: '2024-01-15',
      reference: 'REF123456'
    },
    webhook_url: 'https://seu-dominio.com/webhooks/finpay'
  };

  try {
    // 4. Fazer requisição
    const response = await fetch('https://api.finpay.io/api/v1/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.FINPAY_API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    // 5. Processar resposta
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`API Error: ${error.message}`);
    }

    const result = await response.json();
    console.log('Validação completa:', result);
    return result;

  } catch (error) {
    console.error('Erro na validação:', error);
    throw error;
  }
}

// Usar
validateReceipt('./receipt.pdf', 'bank-uuid-here')
  .then(result => {
    if (result.valid) {
      console.log('✅ Recibo válido!');
      console.log(`Confiança: ${result.confidence * 100}%`);
      console.log('Dados extraídos:', result.extracted);
    } else {
      console.log('❌ Recibo inválido');
    }
  })
  .catch(err => console.error('Erro:', err));
```

### React

```typescript
import { useState } from 'react';

function ReceiptValidator() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      // Ler arquivo
      const buffer = await file.arrayBuffer();
      const pdfBase64 = Buffer.from(buffer).toString('base64');

      // Preparar payload
      const payload = {
        encrypted_pdf: pdfBase64,
        bank_id: 'bank-uuid',
        idempotency_key: `receipt-${Date.now()}`,
        expected: {
          amount: 5000.00
        },
        webhook_url: 'https://seu-dominio.com/webhooks/finpay'
      };

      // Fazer requisição
      const response = await fetch('https://api.finpay.io/api/v1/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_FINPAY_API_KEY}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      setResult(data);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao validar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="receipt-validator">
      <h2>Validador de Recibos</h2>
      
      <input
        type="file"
        accept=".pdf"
        onChange={handleFileUpload}
        disabled={loading}
      />

      {loading && <p>Processando...</p>}

      {error && <p className="error">{error}</p>}

      {result && (
        <div className="result">
          <h3>{result.valid ? '✅ Válido' : '❌ Inválido'}</h3>
          <p>Confiança: {(result.confidence * 100).toFixed(1)}%</p>
          
          {result.valid && result.extracted && (
            <div className="extracted">
              <h4>Dados Extraídos:</h4>
              <ul>
                <li>Valor: {result.extracted.amount}</li>
                <li>Data: {result.extracted.date}</li>
                <li>Referência: {result.extracted.reference}</li>
              </ul>
            </div>
          )}

          {result.duplicate && (
            <p className="warning">
              ⚠️ Este recibo já foi validado anteriormente
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default ReceiptValidator;
```

### Python

```python
import requests
import base64
import json
from datetime import datetime
import uuid

class FinPayClient:
    def __init__(self, api_key: str, base_url: str = 'https://api.finpay.io'):
        self.api_key = api_key
        self.base_url = base_url
        self.headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {api_key}'
        }

    def validate_receipt(
        self,
        pdf_path: str,
        bank_id: str,
        expected: dict = None,
        webhook_url: str = None
    ) -> dict:
        """
        Valida um recibo em PDF
        
        Args:
            pdf_path: Caminho para o arquivo PDF
            bank_id: UUID do banco
            expected: Dicionário com valores esperados
            webhook_url: URL para notificação de resultado
        
        Returns:
            dict com resultado da validação
        """
        # Ler arquivo PDF
        with open(pdf_path, 'rb') as f:
            pdf_buffer = f.read()
        
        pdf_base64 = base64.b64encode(pdf_buffer).decode('utf-8')

        # Preparar payload
        payload = {
            'encrypted_pdf': pdf_base64,
            'bank_id': bank_id,
            'idempotency_key': str(uuid.uuid4()),
            'expected': expected or {},
        }

        if webhook_url:
            payload['webhook_url'] = webhook_url

        # Fazer requisição
        response = requests.post(
            f'{self.base_url}/api/v1/validate',
            headers=self.headers,
            json=payload,
            timeout=30
        )

        # Processar resposta
        if response.status_code == 200:
            return response.json()
        else:
            response.raise_for_status()

    def get_banks(self) -> list:
        """Lista todos os bancos disponíveis"""
        response = requests.get(
            f'{self.base_url}/api/v1/banks',
            headers=self.headers
        )
        return response.json()


# Usar
if __name__ == '__main__':
    client = FinPayClient(api_key='seu-api-key-aqui')

    try:
        result = client.validate_receipt(
            pdf_path='./receipt.pdf',
            bank_id='bank-uuid-aqui',
            expected={
                'amount': 5000.00,
                'date': '2024-01-15'
            },
            webhook_url='https://seu-dominio.com/webhooks/finpay'
        )

        if result['valid']:
            print('✅ Recibo válido!')
            print(f"Confiança: {result['confidence'] * 100:.1f}%")
            print(f"Dados extraídos: {result.get('extracted', {})}")
        else:
            print('❌ Recibo inválido')

    except requests.exceptions.RequestException as e:
        print(f'Erro na requisição: {e}')
```

### cURL

```bash
#!/bin/bash

# Variáveis
API_KEY="seu-api-key-aqui"
BANK_ID="bank-uuid-aqui"
PDF_FILE="./receipt.pdf"
WEBHOOK_URL="https://seu-dominio.com/webhooks/finpay"

# Converter PDF para base64
PDF_BASE64=$(base64 -w 0 < "$PDF_FILE")

# Preparar payload
PAYLOAD=$(cat <<EOF
{
  "encrypted_pdf": "$PDF_BASE64",
  "bank_id": "$BANK_ID",
  "idempotency_key": "receipt-$(date +%s)-$(openssl rand -hex 4)",
  "expected": {
    "amount": 5000.00,
    "date": "2024-01-15"
  },
  "webhook_url": "$WEBHOOK_URL"
}
EOF
)

# Fazer requisição
curl -X POST https://api.finpay.io/api/v1/validate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d "$PAYLOAD"
```

### C# / .NET

```csharp
using System;
using System.Net.Http;
using System.Net.Http.Json;
using System.IO;
using System.Threading.Tasks;

public class FinPayClient
{
    private readonly HttpClient _httpClient;
    private readonly string _apiKey;

    public FinPayClient(string apiKey)
    {
        _apiKey = apiKey;
        _httpClient = new HttpClient
        {
            BaseAddress = new Uri("https://api.finpay.io")
        };
        _httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {apiKey}");
    }

    public async Task<ValidationResult> ValidateReceiptAsync(
        string pdfPath,
        string bankId,
        Dictionary<string, object>? expected = null,
        string? webhookUrl = null)
    {
        // Ler arquivo PDF
        var pdfBytes = await File.ReadAllBytesAsync(pdfPath);
        var pdfBase64 = Convert.ToBase64String(pdfBytes);

        // Preparar payload
        var payload = new
        {
            encrypted_pdf = pdfBase64,
            bank_id = bankId,
            idempotency_key = $"receipt-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}-{Guid.NewGuid().ToString().Substring(0, 8)}",
            expected = expected ?? new Dictionary<string, object>(),
            webhook_url = webhookUrl
        };

        // Fazer requisição
        var response = await _httpClient.PostAsJsonAsync(
            "/api/v1/validate",
            payload
        );

        if (!response.IsSuccessStatusCode)
        {
            var errorContent = await response.Content.ReadAsStringAsync();
            throw new HttpRequestException($"API Error: {response.StatusCode} - {errorContent}");
        }

        return await response.Content.ReadAsAsync<ValidationResult>();
    }
}

public class ValidationResult
{
    public bool Valid { get; set; }
    public bool Duplicate { get; set; }
    public string ProofId { get; set; }
    public double Confidence { get; set; }
    public string MatchedTemplateId { get; set; }
    public BankInfo Bank { get; set; }
    public int TemplatesChecked { get; set; }
    public Dictionary<string, object>? Extracted { get; set; }
}

public class BankInfo
{
    public string Id { get; set; }
    public string Name { get; set; }
    public string Code { get; set; }
}

// Usar
var client = new FinPayClient("seu-api-key-aqui");
var result = await client.ValidateReceiptAsync(
    "receipt.pdf",
    "bank-uuid-aqui",
    new Dictionary<string, object>
    {
        { "amount", 5000.00 },
        { "date", "2024-01-15" }
    },
    "https://seu-dominio.com/webhooks/finpay"
);

if (result.Valid)
{
    Console.WriteLine($"✅ Válido! Confiança: {result.Confidence * 100:F1}%");
}
```

---

## ⚠️ Tratamento de Erros

### Estratégia Geral

```javascript
async function validateWithRetry(pdfPath, bankId, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await validateReceipt(pdfPath, bankId);
    } catch (error) {
      if (error.statusCode === 429) {
        // Rate limit - esperar e tentar novamente
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Rate limit atingido. Aguardando ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
      } else if (error.statusCode >= 500) {
        // Erro do servidor - tentar novamente
        console.log(`Erro do servidor. Tentativa ${attempt}/${maxRetries}`);
        if (attempt === maxRetries) throw error;
        await new Promise(r => setTimeout(r, 1000 * attempt));
      } else {
        // Erro do cliente - não tentar novamente
        throw error;
      }
    }
  }
}
```

### Códigos de Erro Comuns

| Código | Causa | Solução |
|--------|-------|---------|
| `400` | PDF inválido | Certifique-se que está enviando um PDF válido em base64 |
| `401` | API Key inválida | Verifique sua chave de API e permissões |
| `404` | Bank ID não existe | Use `/api/v1/banks` para obter IDs válidos |
| `409` | Recibo já validado | Use um novo `idempotency_key` ou verifique duplicatas |
| `422` | PDF não processável | Tente um PDF de qualidade melhor |
| `429` | Rate limit | Implemente retry com backoff exponencial |
| `500` | Erro servidor | Tente novamente após alguns segundos |

---

## ✨ Boas Práticas

### 1. Gerenciamento de Chaves de API
```javascript
// ❌ Não faça
const apiKey = 'fp_live_xxxxx'; // Nunca hardcode!

// ✅ Faça
const apiKey = process.env.FINPAY_API_KEY;
```

### 2. Idempotência
```javascript
// Usar mesmo idempotency_key para requisições repetidas
const idempotencyKey = generateUniqueId(); // UUID ou similar
// Se enviar novamente com mesma chave, obtém mesmo resultado (cacheado)
```

### 3. Timeouts
```javascript
// Sempre defina timeouts apropriados
const response = await fetch(url, {
  signal: AbortSignal.timeout(30000) // 30 segundos
});
```

### 4. Logging
```javascript
console.log({
  timestamp: new Date().toISOString(),
  endpoint: '/api/v1/validate',
  idempotencyKey: payload.idempotency_key,
  bankId: payload.bank_id,
  status: response.status,
  responseTime: endTime - startTime
});
```

### 5. Validação de Entrada
```javascript
// Validar antes de enviar para a API
if (!fs.existsSync(pdfPath)) {
  throw new Error('Arquivo PDF não encontrado');
}

if (!isValidUUID(bankId)) {
  throw new Error('Bank ID inválido');
}

if (expected.amount && expected.amount <= 0) {
  throw new Error('Valor deve ser maior que zero');
}
```

### 6. Tratamento de Webhook
```javascript
// Sempre validar payload do webhook
app.post('/webhook', (req, res) => {
  // 1. Validar estrutura
  if (!req.body.idempotency_key || !req.body.proof_id) {
    return res.status(400).json({ error: 'Invalid webhook' });
  }

  // 2. Processar de forma idempotente
  const processed = checkIfAlreadyProcessed(req.body.idempotency_key);
  if (processed) {
    return res.status(200).json({ received: true }); // Sem re-processar
  }

  // 3. Processar resultado
  handleValidationResult(req.body);

  // 4. Responder imediatamente
  res.status(200).json({ received: true });
});
```

---

## ❓ FAQ

### P: Como obtenho os IDs dos bancos?
**R:** Use o endpoint `GET /api/v1/banks`
```javascript
const response = await fetch('https://api.finpay.io/api/v1/banks', {
  headers: { 'Authorization': `Bearer ${apiKey}` }
});
const banks = await response.json();
```

### P: Posso validar múltiplos recibos em paralelo?
**R:** Sim, mas respeite rate limits (padrão: 100 req/15min)
```javascript
const results = await Promise.all([
  validateReceipt(pdf1, bankId),
  validateReceipt(pdf2, bankId),
  validateReceipt(pdf3, bankId)
]);
```

### P: E se o webhook falhar?
**R:** A API fará uma tentativa. Implemente polling como fallback:
```javascript
const checkResult = await fetch(
  `https://api.finpay.io/api/v1/validate/${proofId}`,
  { headers: { 'Authorization': `Bearer ${apiKey}` } }
);
```

### P: Quanto tempo leva a validação?
**R:** Geralmente 1-5 segundos. Use webhooks para não bloquear o cliente.

### P: Posso validar imagens (não PDF)?
**R:** Não, apenas PDFs. Converta imagens para PDF primeiro.

### P: Como testo localmente?
**R:** Use variáveis de ambiente e conta de desenvolvimento
```bash
export FINPAY_API_KEY="fp_test_xxxxx"
export FINPAY_BASE_URL="https://api-dev.finpay.io"
```

### P: Há limite de tamanho para PDFs?
**R:** Sim, máximo 10MB. PDFs maiores serão rejeitados com erro `422`.

---

## 📞 Suporte

- **Email:** support@finpay.io
- **Documentação:** https://docs.finpay.io
- **Status:** https://status.finpay.io
- **Comunidade:** https://community.finpay.io

---

## 📜 Changelog

### v1.0.0 (2024-01-17)
- ✨ API unificada com endpoints `/hash` e `/verify`
- ✨ Suporte a webhooks
- ✨ Idempotência automática
- ✨ Documentação completa

---

**Última atualização:** 17 de janeiro de 2024
