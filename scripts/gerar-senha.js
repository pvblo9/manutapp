const bcrypt = require('bcryptjs');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🔐 Gerador de Hash de Senha (bcrypt)\n');

rl.question('Digite a senha que deseja gerar o hash: ', async (senha) => {
  if (!senha || senha.trim() === '') {
    console.log('❌ Senha não pode estar vazia!');
    rl.close();
    return;
  }

  try {
    // Gerar hash com 10 rounds (padrão do sistema)
    const hash = await bcrypt.hash(senha, 10);
    
    console.log('\n✅ Hash gerado com sucesso!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Hash bcrypt:');
    console.log(hash);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    console.log('📋 INSERT SQL para criar usuário admin:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`
INSERT INTO "User" (id, name, username, email, password, role, "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'Administrador',
  'admin',
  'admin@empresa.com',
  '${hash}',
  'ADMIN',
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
    
    console.log('💡 Dica: Você pode usar este hash diretamente no INSERT SQL acima.');
    
  } catch (error) {
    console.error('❌ Erro ao gerar hash:', error.message);
  }
  
  rl.close();
});
