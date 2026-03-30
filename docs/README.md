# 📄 Índice da Documentação FinPay

Bem-vindo à documentação completa da API FinPay!

---

## 🚀 Comece Aqui

### Para Iniciantes
1. **[Quick Start](./QUICKSTART.md)** - Comece em 5 minutos
2. **[Integração Completa](./INTEGRATION_GUIDE.md)** - Guia detalhado com exemplos

### Para Desenvolvedores
1. **[Referência de API](./API_REFERENCE.md)** - Todos os endpoints
2. **[Exemplos Avançados](./EXAMPLES.md)** - Casos de uso complexos
3. **[Webhooks](./WEBHOOKS.md)** - Notificações em tempo real



---

## 📚 Documentos Disponíveis

| Documento | Descrição |
|-----------|----------|
| [QUICKSTART.md](./QUICKSTART.md) | Início rápido em 5 minutos |
| [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) | Guia completo de integração |
| [API_REFERENCE.md](./API_REFERENCE.md) | Referência de endpoints |
| [WEBHOOKS.md](./WEBHOOKS.md) | Documentação de webhooks |

---

## 🎯 Por Caso de Uso

### "Quero validar recibos em minha aplicação"
→ Leia: [QUICKSTART.md](./QUICKSTART.md) + [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)

### "Preciso de notificações em tempo real"
→ Leia: [WEBHOOKS.md](./WEBHOOKS.md)

### "Preciso de referência de endpoints"
→ Leia: [API_REFERENCE.md](./API_REFERENCE.md)

---

## 🔧 Referência Rápida

### URLs Importantes
- **API Base:** https://api.finpay.io
- **Docs:** https://docs.finpay.io
- **Console:** https://console.finpay.io
- **Status:** https://status.finpay.io
- **Community:** https://community.finpay.io

### Endpoint Principal
```
POST /api/v1/validate          # Validar recibo
```

### Autenticação
```
Authorization: Bearer fp_live_xxxxxxxxxxxxxxxxxxxxx
```

---

## 📖 Tópicos Principais

### Validação de Recibos
- Como enviar um recibo para validação
- Interpretando respostas
- Tratamento de duplicatas

**Leia:** [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md#endpoint-apiv1validate)

### Webhooks
- Configurando seu endpoint de webhook
- Recebendo notificações em tempo real

**Leia:** [WEBHOOKS.md](./WEBHOOKS.md)

### Autenticação
- Obtendo uma chave de API
- Usando Bearer token

**Leia:** [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md#autenticação)

### Tratamento de Erros
- Códigos de status HTTP
- Tipos de erro
- Retry strategies

**Leia:** [API_REFERENCE.md](./API_REFERENCE.md#tipos-de-erro)

---

## 💡 Exemplos por Linguagem

### JavaScript/TypeScript
- [QUICKSTART.md](./QUICKSTART.md#javascript-nodejs)
- [INTEGRATION_GUIDE.md - JavaScript](./INTEGRATION_GUIDE.md#javascripttypescript-fetch-api)

### Python
- [QUICKSTART.md](./QUICKSTART.md#python)
- [INTEGRATION_GUIDE.md - Python](./INTEGRATION_GUIDE.md#python)

### C# / .NET
- [INTEGRATION_GUIDE.md - C#](./INTEGRATION_GUIDE.md#c--net)

### PHP
- [INTEGRATION_GUIDE.md - PHP](./INTEGRATION_GUIDE.md#php)

### cURL
- [QUICKSTART.md](./QUICKSTART.md#curl)
- [INTEGRATION_GUIDE.md - cURL](./INTEGRATION_GUIDE.md#curl)

---

## 🆘 Suporte

Não encontrou o que procura?

- 📧 **Email:** support@finpay.io
- 💬 **Chat:** https://chat.finpay.io
- 🐛 **Reportar Bug:** https://github.com/finpay/issues
- 💭 **Sugestões:** feedback@finpay.io
- 📞 **Telefone:** +55 11 3000-0000 (segunda a sexta, 9h-18h)

---

## 📋 Checklist de Integração

- [ ] Criar conta em https://console.finpay.io
- [ ] Obter API Key
- [ ] Ler [QUICKSTART.md](./QUICKSTART.md)
- [ ] Implementar validação básica
- [ ] Testar com recibos de exemplo
- [ ] Configurar webhooks (opcional)
- [ ] Implementar tratamento de erros
- [ ] Testar em staging
- [ ] Deploy em produção
- [ ] Monitorar e otimizar

---

## 🗺️ Mapa da Documentação

```
docs/
├── README.md (este arquivo)
├── QUICKSTART.md
├── INTEGRATION_GUIDE.md
├── API_REFERENCE.md
└── WEBHOOKS.md
```

---



## 📈 Changelog

### v1.0.0 (17 Jan 2024)
- ✨ Endpoint de validação `/api/v1/validate`
- ✨ Suporte a webhooks
- ✨ Idempotência automática

---

## 📝 Licença

Esta documentação está licenciada sob [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/).

---

**Última atualização:** 17 de janeiro de 2024

Tem sugestões para melhorar a documentação? [Envie feedback](mailto:feedback@finpay.io)
