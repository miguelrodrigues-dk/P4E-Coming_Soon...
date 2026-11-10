const express = require('express');
const router = express.Router();

// Middlewares de Proteção de Acesso
function verificarAutenticacao(req, res, next) {
  if (!req.session.usuario) return res.redirect('/eventos/cadastro');
  next();
}

function verificarAdmin(req, res, next) {
  if (!req.session.usuario || req.session.usuario.role !== 'admin') {
    return res.status(403).send('Acesso Negado: Apenas administradores podem acessar esta página.');
  }
  next();
}

// Banco de dados em memória para os Eventos do projeto (Com os links originais restaurados)
const eventos = [
  {
    id: 1,
    nome: 'Festival de Música',
    categoria: 'Música',
    data: '15/11/2026',
    local: 'Parque Central',
    descricao: 'Uma noite com música ao vivo, artistas locais e muita energia.',
    imagem: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=1400&q=85',
    destaque: true,
    comentarios: []
  },
  {
    id: 2,
    nome: 'Noite de Gala',
    categoria: 'Social',
    data: '22/11/2026',
    local: 'Espaço Imperial',
    descricao: 'Uma celebração elegante para reunir pessoas e criar boas memórias.',
    imagem: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1400&q=85',
    destaque: true,
    comentarios: []
  },
  {
    id: 3,
    nome: 'Feira Criativa',
    categoria: 'Cultura',
    data: '29/11/2026',
    local: 'Centro Cultural',
    descricao: 'Artesanato, gastronomia e projetos criativos em um só lugar.',
    imagem: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1400&q=85',
    destaque: true,
    comentarios: []
  }
];

let proximoEventoId = 4;
let proximoComentarioId = 1;


function buscarEvento(id) {
  return eventos.find(evento => evento.id === Number(id));
}

function buscarComentario(evento, id) {
  return evento.comentarios.find(comentario => comentario.id === Number(id));
}

// ROTA: Exibir Formulário de Cadastro de Usuário
router.get('/cadastro', (req, res) => {
  if (req.session.usuario) return res.redirect('/eventos');
  res.render('Usuarios/cadastro'); 
});

// ROTA: Processar o Cadastro de Usuário Comum (100% Seguro)
router.post('/cadastro', (req, res) => {
  const { nome, email, senha } = req.body;

  // Qualquer pessoa cadastrada pelo formulário público do site sempre será cadastrada como 'comum'
  global.db.run(
    "INSERT INTO usuarios (nome, email, senha, role) VALUES (?, ?, ?, 'comum')",
    [nome, email, senha],
    function(err) {
      if (err) {
        return res.send("Erro ao cadastrar: Esse e-mail já está sendo utilizado.");
      }

      // Cria a sessão com privilégios comuns e entra direto na plataforma
      req.session.usuario = {
        id: this.lastID,
        nome: nome,
        email: email,
        role: 'comum'
      };

      res.redirect('/eventos');
    }
  );
});

// ROTA: Exibir Formulário de Login (Para quem já possui conta)
router.get('/login', (req, res) => {
  res.render('Usuarios/login', { erro: null });
});

// ROTA: Autenticar Usuário no SQLite
router.post('/login', (req, res) => {
  const { email, senha } = req.body;

  global.db.get(
    "SELECT * FROM usuarios WHERE email = ? AND senha = ?",
    [email, senha],
    (err, user) => {
      if (err || !user) {
        return res.render('Usuarios/login', { erro: 'E-mail ou senha inválidos.' });
      }
      
      // Guarda os dados do usuário logado na Sessão
      req.session.usuario = {
        id: user.id,
        nome: user.nome,
        email: user.email,
        role: user.role
      };
      res.redirect('/eventos');
    }
  );
});

// ROTA: Destruir a sessão (Logout)
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/eventos/login');
});

// ROTA: Listar Usuários cadastrados (Exclusivo do Admin)
router.get('/admin/usuarios', verificarAutenticacao, verificarAdmin, (req, res) => {
  global.db.all("SELECT id, nome, email, role FROM usuarios", [], (err, rows) => {
    res.render('Usuarios/index', { listaUsuarios: rows });
  });
});

// --- ROTAS DO PROJETO PROTEGIDAS POR LOGIN ---

router.get('/', verificarAutenticacao, (req, res) => {
  const destaques = eventos.filter(evento => evento.destaque && evento.imagem);
  res.render('Eventos/index', { eventos, destaques });
});

router.get('/novo', verificarAutenticacao, (req, res) => {
  res.render('Eventos/form-cadastro', { titulo: 'Novo evento | E-VENTUS' });
});

router.post('/', verificarAutenticacao, (req, res) => {
  const { nome, categoria, data, local, descricao, destaque } = req.body;
  const isDestaque = destaque === 'on';
  const imagem = isDestaque ? (req.body.imagem || '').trim() : '';

  eventos.push({
    id: proximoEventoId++,
    nome, categoria, data, local, descricao, imagem, destaque: isDestaque,
    comentarios: []
  });
  res.redirect('/eventos');
});

router.get('/:id', verificarAutenticacao, (req, res) => {
  const evento = buscarEvento(req.params.id);
  if (!evento) return res.status(404).send('Evento não encontrado.');
  res.render('Eventos/detalhes', { evento });
});

// 🛠️ ROTAS DE EDIÇÃO E EXCLUSÃO DO EVENTO INTEIRO
router.get('/:id/editar', verificarAutenticacao, (req, res) => {
  const evento = buscarEvento(req.params.id);
  if (!evento) return res.status(404).send('Evento não encontrado.');
  res.render('Eventos/editar-evento', { evento });
});

router.post('/:id/editar', verificarAutenticacao, (req, res) => {
  const evento = buscarEvento(req.params.id);
  if (!evento) return res.status(404).send('Evento não encontrado.');

  const { nome, categoria, data, local, descricao, destaque } = req.body;
  const isDestaque = destaque === 'on';
  const imagem = isDestaque ? (req.body.imagem || '').trim() : '';

  Object.assign(evento, {
    nome: nome.trim(),
    categoria,
    data: data.trim(),
    local: local.trim(),
    descricao: descricao.trim(),
    destaque: isDestaque,
    imagem
  });
  res.redirect(`/eventos/${evento.id}`);
});

// ROTA: Excluir um evento completo
router.post('/:id/excluir', verificarAutenticacao, (req, res) => {
  const evento = buscarEvento(req.params.id);
  if (!evento) return res.status(404).send('Evento não encontrado.');

  const indice = eventos.findIndex(item => item.id === evento.id);
  eventos.splice(indice, 1);
  res.redirect('/eventos');
});

// --- SEÇÃO DE COMENTÁRIOS E PERMISSÕES POR E-MAIL E SUPERPODERES DO ADMIN ---

router.post('/:id/comentarios', verificarAutenticacao, (req, res) => {
  const evento = buscarEvento(req.params.id);
  if (!evento) return res.status(404).send('Evento não encontrado.');

  const autorDigitado = (req.body.autor || '').trim();
  const nomeAutor = autorDigitado || req.session.usuario.nome;

  evento.comentarios.push({
    id: proximoComentarioId++,
    autor: nomeAutor,
    autor_email: req.session.usuario.email, // Salva o e-mail do autor do comentário
    texto: req.body.texto.trim(),
    respostas: []
  });
  res.redirect(`/eventos/${evento.id}#comentarios`);
});

router.post('/:eventoId/comentarios/:comentarioId/editar', verificarAutenticacao, (req, res) => {
  const evento = buscarEvento(req.params.eventoId);
  const comentario = buscarComentario(evento, req.params.comentarioId);

  // SUPERPODERES DO ADMIN: Se NÃO for o autor do comentário E NÃO for admin, bloqueia e manda o balão
  if (comentario.autor_email !== req.session.usuario.email && req.session.usuario.role !== 'admin') {
    return res.redirect(`/eventos/${evento.id}?erro=Acesso Proibido: Apenas o autor ou o Admin podem editar este comentario!`);
  }

  comentario.texto = req.body.texto.trim();
  res.redirect(`/eventos/${evento.id}#comentario-${comentario.id}`);
});

router.post('/:eventoId/comentarios/:comentarioId/excluir', verificarAutenticacao, (req, res) => {
  const evento = buscarEvento(req.params.eventoId);
  const comentario = buscarComentario(evento, req.params.comentarioId);

  // SUPERPODERES DO ADMIN: Se NÃO for o autor do comentário E NÃO for admin, bloqueia e manda o balão
  if (comentario.autor_email !== req.session.usuario.email && req.session.usuario.role !== 'admin') {
    return res.redirect(`/eventos/${evento.id}?erro=Acesso Proibido: Voce nao tem permissao para excluir este comentario!`);
  }

  evento.comentarios = evento.comentarios.filter(item => item.id !== comentario.id);
  res.redirect(`/eventos/${evento.id}#comentarios`);
});

// POST: Responder a um comentário específico (Dono ou Admin podem responder)
router.post('/:eventoId/comentarios/:comentarioId/respostas', verificarAutenticacao, (req, res) => {
  const evento = buscarEvento(req.params.eventoId);
  if (!evento) return res.status(404).send('Evento não encontrado.');

  const comentario = buscarComentario(evento, req.params.comentarioId);
  if (!comentario) return res.status(404).send('Comentário não encontrado.');

  const autorDigitado = (req.body.autor || '').trim();
  const nomeAutor = autorDigitado || req.session.usuario.nome;

  const texto = (req.body.texto || '').trim();
  if (!texto) {
    return res.redirect(`/eventos/${evento.id}?erro=A resposta não pode ficar vazia!`);
  }

  // Insere a resposta vinculando as informações da conta logada
  comentario.respostas.push({
    id: proximoComentarioId++,
    autor: nomeAutor,
    autor_email: req.session.usuario.email,
    texto: texto
  });

  res.redirect(`/eventos/${evento.id}#comentario-${comentario.id}`);
});

module.exports = router;










/*const eventos = [
  {
    id: 1,
    nome: 'Festival de Música',
    categoria: 'Música',
    data: '15/11/2026',
    local: 'Parque Central',
    descricao: 'Uma noite com música ao vivo, artistas locais e muita energia.',
    imagem: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=1400&q=85',
    destaque: true,
    comentarios: []
  },
  {
    id: 2,
    nome: 'Noite de Gala',
    categoria: 'Social',
    data: '22/11/2026',
    local: 'Espaço Imperial',
    descricao: 'Uma celebração elegante para reunir pessoas e criar boas memórias.',
    imagem: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1400&q=85',
    destaque: true,
    comentarios: []
  },
  {
    id: 3,
    nome: 'Feira Criativa',
    categoria: 'Cultura',
    data: '29/11/2026',
    local: 'Centro Cultural',
    descricao: 'Artesanato, gastronomia e projetos criativos em um só lugar.',
    imagem: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1400&q=85',
    destaque: true,
    comentarios: []
  }
];

let proximoEventoId = 4;
let proximoComentarioId = 1;*/