# Configuração do Cloudinary - ManutApp

Este documento explica como configurar o Cloudinary para armazenar as fotos das Ordens de Serviço (OS) no ManutApp.

## Por que Cloudinary?

- **Railway**: O filesystem do Railway é efêmero, arquivos locais são perdidos a cada deploy
- **Escalabilidade**: Suporta até 25GB+ de fotos sem problemas
- **Otimização**: Transformações automáticas de imagens (resize, compressão, formatos)
- **CDN Global**: Imagens servidas rapidamente de qualquer lugar do mundo
- **Backup Automático**: Fotos armazenadas de forma segura na nuvem

## Passo 1: Criar Conta no Cloudinary

1. Acesse [https://cloudinary.com](https://cloudinary.com)
2. Clique em **"Sign Up for Free"**
3. Preencha o formulário de cadastro
4. Confirme seu email

## Passo 2: Obter Credenciais

Após criar a conta e fazer login:

1. Acesse o **Dashboard**: [https://cloudinary.com/console](https://cloudinary.com/console)
2. No painel principal, você verá suas credenciais:
   - **Cloud Name** (ex: `dq8hfnfoo`)
   - **API Key** (ex: `123456789012345`)
   - **API Secret** (ex: `abcdefghijklmnopqrstuvwxyz123456`)

⚠️ **IMPORTANTE**: Mantenha o **API Secret** em segredo! Nunca compartilhe ou commite no Git.

## Passo 3: Configurar Variáveis de Ambiente

### Desenvolvimento Local

1. Copie o arquivo `env.example.txt` para `.env.local`:
   ```bash
   cp env.example.txt .env.local
   ```

2. Edite o arquivo `.env.local` e adicione suas credenciais:
   ```env
   CLOUDINARY_CLOUD_NAME=seu_cloud_name_aqui
   CLOUDINARY_API_KEY=sua_api_key_aqui
   CLOUDINARY_API_SECRET=sua_api_secret_aqui
   ```

### Produção (Railway)

1. Acesse o painel do Railway: [https://railway.app](https://railway.app)
2. Selecione seu projeto
3. Vá em **Variables**
4. Adicione as três variáveis:
   - `CLOUDINARY_CLOUD_NAME` = seu cloud name
   - `CLOUDINARY_API_KEY` = sua API key
   - `CLOUDINARY_API_SECRET` = sua API secret
5. Clique em **Deploy** para aplicar as mudanças

## Passo 4: Estrutura de Pastas no Cloudinary

As fotos serão organizadas automaticamente na seguinte estrutura:

```
manutapp/
  └── os-photos/
      └── {os_id}/
          ├── {timestamp}-{filename}.webp
          └── {timestamp}-{filename}-thumb.webp
```

**Exemplo:**
```
manutapp/os-photos/abc123-def456-ghi789/
  ├── 1705123456789-maquina-01.webp
  └── 1705123456789-maquina-01-thumb.webp
```

## Passo 5: Testar o Upload

1. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

2. Acesse a aplicação e crie uma nova OS
3. Faça upload de uma foto
4. Verifique no console do Cloudinary se a imagem foi enviada:
   - Acesse: [https://cloudinary.com/console/media_library](https://cloudinary.com/console/media_library)
   - Procure pela pasta `manutapp/os-photos`

## Funcionalidades Implementadas

### ✅ Upload Otimizado
- Imagens são processadas com **Sharp** antes do upload
- Compressão automática para WebP
- Redimensionamento: máximo 1200px de largura
- Thumbnails: 200x200px para listagens

### ✅ Exibição Otimizada
- Componente `CloudinaryImage` detecta automaticamente URLs do Cloudinary
- Usa `CldImage` do `next-cloudinary` para otimização automática
- Transformações on-demand (resize, format, quality)
- Compatibilidade com fotos antigas (URLs locais)

### ✅ Validações
- Tipos permitidos: JPG, PNG, WEBP
- Tamanho máximo: 5MB por arquivo
- Máximo de 5 fotos por OS
- Rate limiting: 10 uploads por hora por IP

## Limites do Plano Gratuito

O plano gratuito do Cloudinary oferece:
- **25GB de armazenamento**
- **25GB de bandwidth por mês**
- Transformações ilimitadas
- CDN global

Para mais informações: [https://cloudinary.com/pricing](https://cloudinary.com/pricing)

## Troubleshooting

### Erro: "Configuração do Cloudinary não encontrada"
- Verifique se as variáveis de ambiente estão configuradas
- Reinicie o servidor após adicionar as variáveis
- No Railway, certifique-se de fazer deploy após adicionar as variáveis

### Erro: "Upload falhou"
- Verifique se as credenciais estão corretas
- Confirme que o Cloudinary está acessível (sem bloqueio de firewall)
- Verifique os logs do servidor para mais detalhes

### Fotos não aparecem
- Verifique se a URL retornada pelo Cloudinary está correta
- Confirme que o componente `CloudinaryImage` está sendo usado
- Verifique o console do navegador para erros

## Migração de Fotos Antigas

Se você já tem fotos armazenadas localmente:

1. As fotos antigas continuarão funcionando (compatibilidade mantida)
2. Novas fotos serão automaticamente enviadas para o Cloudinary
3. Para migrar fotos antigas, você precisaria criar um script de migração (não incluído)

## Suporte

- Documentação Cloudinary: [https://cloudinary.com/documentation](https://cloudinary.com/documentation)
- Next.js Cloudinary: [https://next-cloudinary.spacejelly.dev/](https://next-cloudinary.spacejelly.dev/)
- Issues do projeto: [GitHub Issues](https://github.com/pvblo9/manutapp/issues)
