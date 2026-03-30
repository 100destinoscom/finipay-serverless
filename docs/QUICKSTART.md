# 🚀 FinPay API - Quick Start

Comece em 5 minutos!

---

## 1️⃣ Obtenha uma Chave de API

1. Registre-se em [console.finpay.io](https://console.finpay.io)
2. Vá para **Configurações → API Keys**
3. Clique **Criar Nova Chave**
4. Copie: `fp_live_xxxxxxxxxxxxxxxxxxxxx`

---

## 2️⃣ Escolha sua Plataforma

### JavaScript (Node.js)
```bash
npm install axios dotenv
```

```javascript
import axios from 'axios';
import fs from 'fs';

// 1. Configurar
const apiKey = process.env.FINPAY_API_KEY;
const client = axios.create({
  baseURL: 'https://api.finpay.io',
  headers: { Authorization: `Bearer ${apiKey}` }
});

// 2. Ler arquivo
const pdf = fs.readFileSync('./receipt.pdf', 'base64');

// 3. Validar
const result = await client.post('/api/v1/validate', {
  encrypted_pdf: pdf,
  bank_id: 'bank-uuid-aqui',
  idempotency_key: `receipt-${Date.now()}`
});

// 4. Ver resultado
console.log(result.data);
```

### Python
```bash
pip install requests python-dotenv
```

```python
import requests
import base64
import os

# 1. Configurar
api_key = os.getenv('FINPAY_API_KEY')
client = requests.Session()
client.headers.update({'Authorization': f'Bearer {api_key}'})

# 2. Ler arquivo
with open('receipt.pdf', 'rb') as f:
    pdf_base64 = base64.b64encode(f.read()).decode()

# 3. Validar
response = client.post('https://api.finpay.io/api/v1/validate', json={
    'encrypted_pdf': pdf_base64,
    'bank_id': 'bank-uuid-aqui',
    'idempotency_key': f'receipt-{int(time.time())}'
})

# 4. Ver resultado
print(response.json())
```

### React
```bash
npm install axios
```

```jsx
import { useState } from 'react';
import axios from 'axios';

function App() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    try {
      const buffer = await file.arrayBuffer();
      const pdf64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));

      const res = await axios.post(
        'https://api.finpay.io/api/v1/validate',
        {
          encrypted_pdf: pdf64,
          bank_id: 'bank-uuid',
          idempotency_key: `receipt-${Date.now()}`
        },
        {
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_FINPAY_API_KEY}`
          }
        }
      );

      setResult(res.data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input type="file" accept=".pdf" onChange={handleUpload} />
      {loading && <p>Processando...</p>}
      {result && (
        <div>
          <h3>{result.valid ? '✅ Válido' : '❌ Inválido'}</h3>
          <p>Confiança: {(result.confidence * 100).toFixed(1)}%</p>
        </div>
      )}
    </div>
  );
}
```

### cURL
```bash
API_KEY="seu-api-key"
BANK_ID="bank-uuid"

# Converter PDF para base64
PDF64=$(base64 -w 0 < receipt.pdf)

# Enviar
curl -X POST https://api.finpay.io/api/v1/validate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d "{
    \"encrypted_pdf\": \"$PDF64\",
    \"bank_id\": \"$BANK_ID\",
    \"idempotency_key\": \"receipt-$(date +%s)\"
  }"
```

---

## 3️⃣ Adicione Webhooks (Opcional)

```javascript
// Seu servidor
app.post('/webhook', (req, res) => {
  const { valid, proof_id, extracted } = req.body;

  if (valid) {
    console.log('✅ Recibo validado!', extracted);
  }

  res.json({ received: true });
});
```

```javascript
// Ao validar, inclua webhook_url
const result = await client.post('/api/v1/validate', {
  encrypted_pdf: pdf,
  bank_id: 'bank-uuid',
  idempotency_key: `receipt-${Date.now()}`,
  webhook_url: 'https://seu-dominio.com/webhook'  // ← Adicione isto
});
```

---

## 4️⃣ Tratamento de Erros

```javascript
try {
  const result = await validateReceipt(pdf, bankId);
} catch (error) {
  if (error.response?.status === 401) {
    console.error('API Key inválida');
  } else if (error.response?.status === 404) {
    console.error('Banco não encontrado');
  } else if (error.response?.status === 409) {
    console.error('Recibo já foi validado');
  } else {
    console.error('Erro desconhecido:', error.message);
  }
}
```

---

## 5️⃣ Próximos Passos

- ✅ Leia o [Guia Completo de Integração](./INTEGRATION_GUIDE.md)
- ✅ Veja [Exemplos Avançados](./EXAMPLES.md)
- ✅ Configure [Webhooks](./WEBHOOKS.md)
- ✅ Conheça [Boas Práticas](./BEST_PRACTICES.md)

---

## 📚 Recursos

| Recurso | Link |
|---------|------|
| Documentação Completa | [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) |
| Referência de Endpoints | [API_REFERENCE.md](./API_REFERENCE.md) |
| SDKs Oficiais | https://github.com/finpay |
| Status da API | https://status.finpay.io |

---

## ⚡ Dicas Rápidas

```javascript
// ✅ Gerar idempotency_key único
const idempotencyKey = `${Date.now()}-${Math.random().toString(36)}`;

// ✅ Converter PDF para base64
const pdf64 = require('fs').readFileSync('receipt.pdf', 'base64');

// ✅ Obter lista de bancos
const banks = await client.get('/api/v1/banks');
const bankId = banks.data[0].id; // Use primeiro banco como exemplo

// ✅ Verificar status de validação
const status = await client.get(`/api/v1/validate/${proofId}`);

// ✅ Implementar retry
async function retryValidate(pdf, bankId, maxTries = 3) {
  for (let i = 0; i < maxTries; i++) {
    try {
      return await validateReceipt(pdf, bankId);
    } catch (err) {
      if (i === maxTries - 1) throw err;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}
```

---

## 🆘 Precisa de Ajuda?

- 📧 Email: support@finpay.io
- 💬 Chat: https://chat.finpay.io
- 📖 Docs: https://docs.finpay.io
- 🐛 Issues: https://github.com/finpay/issues

---

**Boa integração! 🎉**
