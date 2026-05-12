/**
 * ============================================================================
 * 🛡️ VIVERE INFRA MANAGEMENT - BOOTSTRAP SCRIPT
 * ============================================================================
 * Script independente para criação do primeiro usuário ADMIN do sistema.
 * * Execução padrão:
 * node create-admin.js
 * * Execução com parâmetros customizados:
 * node create-admin.js "meuemail@vivere.com" "MinhaSenha123" "Meu Nome"
 * ============================================================================
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function bootstrapAdmin() {
  console.log('\n🚀 [BOOTSTRAP] Iniciando rotina de criação de Administrador...\n');

  // Captura os argumentos da linha de comando ou usa os valores padrão seguros
  const email = process.argv[2] || 'admin@vivere.com';
  const plainPassword = process.argv[3] || 'Vivere@Admin2026';
  const name = process.argv[4] || 'Administrador de Infraestrutura';

  try {
    // 1. Verifica se o e-mail já está em uso para evitar crash no banco
    const existingUser = await prisma.user.findUnique({ where: { email } });
    
    if (existingUser) {
      console.warn(`⚠️  Atenção: Já existe um usuário registado com o e-mail [${email}].`);
      console.warn('Operação abortada para preservar a integridade do banco.\n');
      return;
    }

    // 2. Hash da senha (Padrão de segurança: 10 rounds de salt, espelhando o AuthService)
    console.log('🔐 Gerando hash de segurança para a senha...');
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    // 3. Inserção atômica no banco de dados
    console.log('💾 Persistindo usuário na base de dados...');
    const adminUser = await prisma.user.create({
      data: {
        email: email,
        name: name,
        password: hashedPassword,
        role: 'ADMIN',
        status: 'ACTIVE',
        isVerified: true, // Já nasce verificado para bypassar a etapa de OTP no primeiro acesso
      },
    });

    console.log('\n✅ [SUCESSO] Usuário Master criado e validado!\n');
    console.log('====================================================');
    console.log(` 👤 Nome:   ${adminUser.name}`);
    console.log(` 📧 E-mail: ${adminUser.email}`);
    console.log(` 🔑 Senha:  ${plainPassword}`);
    console.log(` 🛡️ Cargo:  ${adminUser.role}`);
    console.log('====================================================\n');
    console.log('🚨 RECOMENDAÇÃO DE SEGURANÇA SÊNIOR:');
    console.log('Após o primeiro login, altere esta senha no painel ou exclua este script do servidor.\n');

  } catch (error) {
    console.error('\n❌ [ERRO CRÍTICO] Falha ao tentar criar o usuário:');
    console.error(error);
    process.exit(1);
  } finally {
    // É mandatório desconectar do banco para não gerar Connection Leaks no terminal
    await prisma.$disconnect();
    console.log('🔌 Conexão com o banco de dados encerrada.\n');
  }
}

// Invoca a função principal
bootstrapAdmin();