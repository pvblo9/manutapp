const bcrypt = require('bcryptjs');

// Configuração
const SENHA = process.argv[2] || 'admin123'; // Senha padrão ou passada como argumento
const NOME = process.argv[3] || 'Administrador';
const USERNAME = process.argv[4] || 'admin';
const EMAIL = process.argv[5] || 'admin@empresa.com';
const ROLE = process.argv[6] || 'ADMIN'; // ADMIN ou OPERATOR

async function gerarHash() {
  try {
    console.log('🔐 Gerador de Hash de Senha (bcrypt)\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Senha: ${SENHA}`);
    console.log(`Nome: ${NOME}`);
    console.log(`Username: ${USERNAME}`);
    console.log(`Email: ${EMAIL}`);
    console.log(`Role: ${ROLE}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Gerar hash com 10 rounds
    const hash = await bcrypt.hash(SENHA, 10);
    
    console.log('✅ Hash gerado com sucesso!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Hash bcrypt:');
    console.log(hash);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('📋 INSERT SQL:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`
INSERT INTO "User" (id, name, username, email, password, role, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  '${NOME}',
  '${USERNAME}',
  '${EMAIL}',
  '${hash}',
  '${ROLE}',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE 
SET 
  name = EXCLUDED.name,
  username = EXCLUDED.username,
  password = EXCLUDED.password,
  role = EXCLUDED.role,
  "updatedAt" = NOW();
    `);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('💡 Uso:');
    console.log('  node scripts/gerar-senha-simples.js [senha] [nome] [username] [email] [role]');
    console.log('  Exemplo: node scripts/gerar-senha-simples.js minhaSenha123 "João Silva" joao joao@empresa.com ADMIN');
    
  } catch (error) {
    console.error('❌ Erro ao gerar hash:', error.message);
    process.exit(1);
  }
}

gerarHash();
