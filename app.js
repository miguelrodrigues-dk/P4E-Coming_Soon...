// app.js
const express = require('express');
const path = require('path');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const app = express();

// Configurações do EJS e pastas públicas do projeto
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 1. PRIMEIRO: Inicializa a conexão com o arquivo database.db
const db = new sqlite3.Database(path.join(__dirname, 'database.db'), (err) => {
  if (err) console.error('Erro ao conectar ao SQLite:', err.message);
  else console.log('Banco de dados SQLite pronto e conectado (database.db)!');
});

// 2. SEGUNDO: Roda as configurações de tabelas e o administrador automático
db.serialize(() => {
  // Cria a tabela de usuários se ela não existir
  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      senha TEXT NOT NULL,
      role TEXT DEFAULT 'comum'
    )
  `);

  // CONTA MASTER DO ADMIN: Insere o administrador automaticamente se ele não existir
  const adminFixo = {
    nome: 'Administrador P4E',
    email: 'admin@p4e.com',      // Seu e-mail fixo de Admin
    senha: 'admin123_seguro'     // Sua senha fixa de Admin
  };

  db.get("SELECT * FROM usuarios WHERE email = ?", [adminFixo.email], (err, row) => {
    if (!row) {
      db.run(
        "INSERT INTO usuarios (nome, email, senha, role) VALUES (?, ?, ?, 'admin')",
        [adminFixo.nome, adminFixo.email, adminFixo.senha],
        (err) => {
          if (err) console.error("Erro ao criar admin fixo:", err.message);
          else console.log(`[Segurança] Conta master de Admin gerada com sucesso: ${adminFixo.email}`);
        }
      );
    }
  });
});

// Tornar o banco global para usarmos nos arquivos de rotas
global.db = db;

// Configuração da Sessão (Expira após 20 minutos de inatividade)
app.use(session({
  secret: 'chave-secreta-p4e-eventos',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 20 * 60 * 1000 } // 20 minutos
}));

// Middleware global para injetar o usuário logado no Navbar
app.use((req, res, next) => {
  res.locals.usuario = req.session.usuario || null;
  next();
});

// Regra inicial da página: Redireciona diretamente para o Cadastro se não estiver logado
app.get('/', (req, res) => {
  if (req.session.usuario) {
    res.redirect('/eventos');
  } else {
    res.redirect('/eventos/cadastro');
  }
});

// Conectar as rotas do projeto
app.use('/eventos', require('./routes/eventoRoutes'));

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`P4E rodando com sucesso em http://localhost:${PORT}`);
});
