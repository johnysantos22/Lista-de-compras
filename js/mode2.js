import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-analytics.js';
import {
  getFirestore, collection, addDoc, getDocs, getDocsFromServer, query, where, deleteDoc, doc, serverTimestamp, updateDoc
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';
import {
  getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';

import { firebaseConfig } from './firebase-config.js';

const appFirebase = initializeApp(firebaseConfig);
const analytics = getAnalytics(appFirebase);
const db = getFirestore(appFirebase);
const auth = getAuth(appFirebase);
const provider = new GoogleAuthProvider();

let currentUser = null;

const entradaItem = document.getElementById('itemCompra');
const listaPendentesUL = document.getElementById('listaPendentes');
const erroLista = document.getElementById('erroLista');
const listaHistorico = document.getElementById('listaHistorico');
const totalMesSpan = document.getElementById('totalMes');
const containerBotoesReutilizar = document.getElementById('containerBotoesReutilizar');
const janelaHistorico = document.getElementById('janelaHistorico');
const conteudoHistorico = document.getElementById('conteudoHistorico');
const btnFecharModal = document.getElementById('btnFecharModal');
const containerBotoes = document.getElementById('containerBotoes');

const btnAdicionar = document.getElementById('btnAdicionar');
const btnMostrarHistoricoPorMes = document.getElementById('btnMostrarHistoricoPorMes');
const btnLimparTudo = document.getElementById('btnLimparTudo');

const btnLogin = document.getElementById('btnLogin');
const btnLogout = document.getElementById('btnLogout');
const nomeUsuario = document.getElementById('nome-usuario');
const telaLoginAviso = document.getElementById('tela-login-aviso');
const conteudoApp = document.getElementById('conteudo-app');

const dataAtual = new Date();
const mesAnoAtual = dataAtual.toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' });
const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

let listaCompras = [];
let historico = {};
let firestoreDisponivel = false;

// ==========================================
// LOCALSTORAGE HELPERS
// ==========================================

function gerarIdLocal() {
  return 'loc_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

function salvarPendentesLocal() {
  try {
    localStorage.setItem('superlista_pendentes', JSON.stringify(listaCompras));
  } catch (e) { /* ignore quota errors */ }
}

function carregarPendentesLocal() {
  try {
    const data = localStorage.getItem('superlista_pendentes');
    return data ? JSON.parse(data) : [];
  } catch (e) { return []; }
}

function salvarHistoricoLocal() {
  try {
    localStorage.setItem('superlista_historico', JSON.stringify(historico));
  } catch (e) { /* ignore quota errors */ }
}

function carregarHistoricoLocal() {
  try {
    const data = localStorage.getItem('superlista_historico');
    return data ? JSON.parse(data) : {};
  } catch (e) { return {}; }
}

// ==========================================
// MODAL DE CONFIRMAÇÃO
// ==========================================

const janelaConfirmar = document.getElementById('janelaConfirmar');
const confirmarTitulo = document.getElementById('confirmarTitulo');
const confirmarMensagem = document.getElementById('confirmarMensagem');
const confirmarIcone = document.getElementById('confirmarIcone');
const btnConfirmarSim = document.getElementById('btnConfirmarSim');
const btnConfirmarNao = document.getElementById('btnConfirmarNao');

function confirmarAcao(titulo, mensagem, tipo = 'alerta') {
  return new Promise(resolve => {
    confirmarTitulo.textContent = titulo;
    confirmarMensagem.textContent = mensagem;
    confirmarIcone.className = 'confirmar-icone ' + tipo;
    confirmarIcone.textContent = tipo === 'perigo' ? '!' : '?';
    janelaConfirmar.style.display = 'flex';

    const limpar = () => {
      janelaConfirmar.style.display = 'none';
      btnConfirmarSim.onclick = null;
      btnConfirmarNao.onclick = null;
    };

    btnConfirmarSim.onclick = () => { limpar(); resolve(true); };
    btnConfirmarNao.onclick = () => { limpar(); resolve(false); };
    janelaConfirmar.addEventListener('click', e => {
      if (e.target === janelaConfirmar) { limpar(); resolve(false); }
    }, { once: true });
  });
}

// ==========================================
// TOAST NOTIFICATIONS
// ==========================================

function mostrarToast(mensagem, tipo = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast ' + tipo;
  toast.textContent = mensagem;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ==========================================
// SISTEMA DE AUTENTICAÇÃO
// ==========================================

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    nomeUsuario.innerText = `Olá, ${user.displayName.split(' ')[0]}`;
    btnLogin.style.display = 'none';
    btnLogout.style.display = 'inline-block';

    telaLoginAviso.style.display = 'none';
    conteudoApp.style.display = '';
    iniciarApp();
  } else {
    currentUser = null;
    nomeUsuario.innerText = '';
    btnLogin.style.display = 'inline-block';
    btnLogout.style.display = 'none';

    telaLoginAviso.style.display = 'block';
    conteudoApp.style.display = 'none';

    listaPendentesUL.innerHTML = '';
    listaHistorico.innerHTML = '';
    historico = {};
  }
});

btnLogin.addEventListener('click', () => signInWithPopup(auth, provider));
btnLogout.addEventListener('click', () => signOut(auth));

// ==========================================
// LÓGICA DO APLICATIVO
// ==========================================

function tratarErroFirebase(error, mensagemUsuario) {
  console.error('Firebase error:', error);
  mostrarToast(`${mensagemUsuario} Detalhe: ${error?.message || 'erro desconhecido.'}`, 'erro');
}

btnAdicionar.addEventListener('click', adicionarItem);
entradaItem.addEventListener('keydown', event => { if (event.key === 'Enter') adicionarItem(); });
btnMostrarHistoricoPorMes.addEventListener('click', mostrarHistoricoPorMes);
btnLimparTudo.addEventListener('click', async () => {
  if (await confirmarAcao('Limpar histórico', 'Tem certeza que deseja apagar todo o histórico de compras? Esta ação não pode ser desfeita.', 'perigo')) {
    historico = {};
    salvarHistoricoLocal();
    limparTabelaDaTela();
    if (firestoreDisponivel) {
      try { await limparHistoricoFirebaseTudo(); } catch (e) { /* already handled */ }
    }
    janelaHistorico.style.display = 'none';
    mostrarToast('Histórico limpo com sucesso.', 'sucesso');
  }
});
btnFecharModal.addEventListener('click', () => { janelaHistorico.style.display = 'none'; });
janelaHistorico.addEventListener('click', event => { if (event.target === janelaHistorico) janelaHistorico.style.display = 'none'; });

async function iniciarApp() {
  await verificarConexaoFirebase();
  await carregarHistoricoMes(mesAnoAtual);
  await carregarListaCompras();
}

async function verificarConexaoFirebase() {
  try {
    const comprasQuery = query(collection(db, 'compras'), where('mesAno', '==', mesAnoAtual), where('userId', '==', currentUser.uid));
    await getDocsFromServer(comprasQuery);
    firestoreDisponivel = true;
  } catch (error) {
    console.warn('Firebase indisponível, usando armazenamento local.', error?.message);
    firestoreDisponivel = false;
  }
}

async function carregarHistoricoMes(mesAno) {
  historico = {};
  limparTabelaDaTela();

  if (firestoreDisponivel) {
    try {
      const comprasQuery = query(collection(db, 'compras'), where('mesAno', '==', mesAno), where('userId', '==', currentUser.uid));
      const querySnapshot = await getDocs(comprasQuery);
      querySnapshot.forEach(docSnap => {
        const data = docSnap.data();
        if (!historico[mesAno]) historico[mesAno] = [];
        historico[mesAno].push({ id: docSnap.id, ...data });
      });

      const localData = carregarHistoricoLocal();
      for (const mes in localData) {
        if (mes === mesAno) continue;
        if (!historico[mes]) historico[mes] = [];
        for (const item of localData[mes]) {
          if (!historico[mes].some(i => i.item === item.item && i.mesAno === item.mesAno)) {
            historico[mes].push(item);
          }
        }
      }

      salvarHistoricoLocal();
    } catch (error) {
      tratarErroFirebase(error, 'Não foi possível carregar o histórico do servidor.');
      const localData = carregarHistoricoLocal();
      historico = localData;
    }
  } else {
    const localData = carregarHistoricoLocal();
    historico = localData;
  }

  if (historico[mesAno]) {
    for (const item of historico[mesAno]) {
      inserirNaTabela(item.item, item.quantidade, item.preco, item.total, mesAno, item.id);
    }
  }

  atualizarTotalMes(mesAno);
  adicionarBotaoReutilizarTodos(mesAno);
}

async function carregarListaCompras() {
  if (firestoreDisponivel) {
    try {
      const pendentesQuery = query(collection(db, 'listaPendentes'), where('userId', '==', currentUser.uid));
      const snapshot = await getDocs(pendentesQuery);
      listaCompras = snapshot.docs.map(docSnap => ({ id: docSnap.id, item: docSnap.data().item }));
      salvarPendentesLocal();
    } catch (error) {
      tratarErroFirebase(error, 'Não foi possível carregar a lista do servidor.');
      listaCompras = carregarPendentesLocal();
    }
  } else {
    listaCompras = carregarPendentesLocal();
  }

  listaPendentesUL.innerHTML = '';
  listaCompras.forEach(itemObj => renderizarItem(itemObj));
}

async function adicionarItem() {
  const valor = entradaItem.value.trim();
  erroLista.innerText = '';
  if (!valor) { erroLista.innerText = 'O nome do item é obrigatório.'; return; }
  if (listaCompras.some(itemObj => itemObj.item === valor)) { erroLista.innerText = 'Este item já está na lista.'; return; }

  if (firestoreDisponivel) {
    const docRef = await salvarListaPendenteFirebase(valor);
    if (docRef) {
      const itemObj = { id: docRef.id, item: valor };
      listaCompras.push(itemObj);
      salvarPendentesLocal();
      renderizarItem(itemObj);
      entradaItem.value = '';
    }
  } else {
    const itemObj = { id: gerarIdLocal(), item: valor };
    listaCompras.push(itemObj);
    salvarPendentesLocal();
    renderizarItem(itemObj);
    entradaItem.value = '';
  }
}

function renderizarItem({ id, item }) {
  const li = document.createElement('li');

  let nomeAtual = item;

  const topo = document.createElement('div');
  topo.className = 'item-pendente-topo';

  const nomeSpan = document.createElement('span');
  nomeSpan.className = 'nome-item';
  nomeSpan.innerText = nomeAtual;

  const seta = document.createElement('span');
  seta.className = 'seta-expandir';
  seta.textContent = '▼';

  topo.append(nomeSpan, seta);

  const detalhes = document.createElement('div');
  detalhes.className = 'item-pendente-detalhes';

  const inputQuantidade = document.createElement('input');
  inputQuantidade.type = 'number';
  inputQuantidade.placeholder = 'Quantidade';
  inputQuantidade.min = '1';
  inputQuantidade.className = 'entrada-item';

  const inputPreco = document.createElement('input');
  inputPreco.type = 'number';
  inputPreco.placeholder = 'Preço unitário';
  inputPreco.min = '0.01';
  inputPreco.step = '0.01';
  inputPreco.className = 'entrada-item';

  const inputsRow = document.createElement('div');
  inputsRow.style.display = 'flex';
  inputsRow.style.gap = '12px';
  inputsRow.style.marginBottom = '12px';
  inputsRow.append(inputQuantidade, inputPreco);

  const botaoSalvar = document.createElement('button');
  botaoSalvar.className = 'botao botao-pequeno botao-primario';
  botaoSalvar.innerText = 'Salvar';

  const botaoEditar = document.createElement('button');
  botaoEditar.className = 'botao botao-pequeno botao-contorno';
  botaoEditar.innerText = 'Editar';

  const botaoRemover = document.createElement('button');
  botaoRemover.className = 'botao botao-pequeno botao-perigo';
  botaoRemover.innerText = 'Remover';

  const actions = document.createElement('div');
  actions.className = 'controles-item';
  actions.append(botaoSalvar, botaoEditar, botaoRemover);

  const erroListaLocal = document.createElement('div');
  erroListaLocal.className = 'erro-input';

  detalhes.append(inputsRow, actions, erroListaLocal);

  topo.addEventListener('click', (e) => {
    if (e.target.closest('button')) return;
    li.classList.toggle('expandido');
  });

  botaoRemover.addEventListener('click', async () => {
    if (await confirmarAcao('Remover item', `Deseja remover "${nomeAtual}" da sua lista?`, 'perigo')) {
      if (firestoreDisponivel) {
        try { await removerListaPendenteFirebase(id); } catch (e) { /* proceed anyway */ }
      }
      listaCompras = listaCompras.filter(itemObj => itemObj.id !== id);
      salvarPendentesLocal();
      li.remove();
      mostrarToast(`"${nomeAtual}" removido da lista.`, 'sucesso');
    }
  });

  botaoSalvar.addEventListener('click', async () => {
    erroListaLocal.innerText = '';
    const quantidade = parseInt(inputQuantidade.value, 10);
    const preco = parseFloat(inputPreco.value.replace(',', '.'));

    if (!quantidade || quantidade <= 0 || !preco || preco <= 0) {
      erroListaLocal.innerText = 'Informe quantidade e preço válidos.';
      return;
    }

    const total = quantidade * preco;

    if (firestoreDisponivel) {
      const docId = await salvarHistoricoFirebase(nomeAtual, quantidade, preco, total, mesAnoAtual);
      if (docId) {
        if (!historico[mesAnoAtual]) historico[mesAnoAtual] = [];
        historico[mesAnoAtual].push({ id: docId, item: nomeAtual, quantidade, preco, total, mesAno: mesAnoAtual });
        salvarHistoricoLocal();

        try { await removerListaPendenteFirebase(id); } catch (e) { /* proceed */ }
        listaCompras = listaCompras.filter(itemObj => itemObj.id !== id);
        salvarPendentesLocal();
        li.remove();
        limparTabelaDaTela();
        for (const item of historico[mesAnoAtual]) {
          inserirNaTabela(item.item, item.quantidade, item.preco, item.total, mesAnoAtual, item.id);
        }
        atualizarTotalMes(mesAnoAtual);
        mostrarToast(`"${nomeAtual}" salvo no histórico!`, 'sucesso');
      }
    } else {
      const localId = gerarIdLocal();
      if (!historico[mesAnoAtual]) historico[mesAnoAtual] = [];
      historico[mesAnoAtual].push({ id: localId, item: nomeAtual, quantidade, preco, total, mesAno: mesAnoAtual });
      salvarHistoricoLocal();

      listaCompras = listaCompras.filter(itemObj => itemObj.id !== id);
      salvarPendentesLocal();
      li.remove();
      limparTabelaDaTela();
      for (const item of historico[mesAnoAtual]) {
        inserirNaTabela(item.item, item.quantidade, item.preco, item.total, mesAnoAtual, item.id);
      }
      atualizarTotalMes(mesAnoAtual);
      mostrarToast(`"${nomeAtual}" salvo no histórico!`, 'sucesso');
    }
  });

  botaoEditar.addEventListener('click', () => {
    const inputNome = document.createElement('input');
    inputNome.type = 'text';
    inputNome.value = nomeAtual;
    inputNome.className = 'entrada-item';
    inputNome.style.width = '100%';
    inputNome.style.marginBottom = '12px';

    nomeSpan.replaceWith(inputNome);

    const btnSalvarEdicao = document.createElement('button');
    btnSalvarEdicao.className = 'botao botao-pequeno botao-primario';
    btnSalvarEdicao.innerText = 'Salvar';

    const btnCancelarEdicao = document.createElement('button');
    btnCancelarEdicao.className = 'botao botao-pequeno botao-contorno';
    btnCancelarEdicao.innerText = 'Cancelar';

    actions.innerHTML = '';
    actions.append(btnSalvarEdicao, btnCancelarEdicao);

    btnCancelarEdicao.addEventListener('click', () => {
      inputNome.replaceWith(nomeSpan);
      actions.innerHTML = '';
      actions.append(botaoSalvar, botaoEditar, botaoRemover);
    });

    btnSalvarEdicao.addEventListener('click', async () => {
      const novoNome = inputNome.value.trim();
      if (!novoNome) {
        mostrarToast('O nome do item não pode ficar vazio.', 'aviso');
        return;
      }
      if (novoNome === nomeAtual) {
        inputNome.replaceWith(nomeSpan);
        actions.innerHTML = '';
        actions.append(botaoSalvar, botaoEditar, botaoRemover);
        return;
      }
      if (listaCompras.some(obj => obj.item === novoNome && obj.id !== id)) {
        mostrarToast('Este item já está na lista.', 'aviso');
        return;
      }

      if (firestoreDisponivel && !id.startsWith('loc_')) {
        const ok = await atualizarListaPendenteFirebase(id, novoNome);
        if (!ok) return;
      }

      nomeAtual = novoNome;
      nomeSpan.innerText = nomeAtual;
      inputNome.replaceWith(nomeSpan);

      const idx = listaCompras.findIndex(obj => obj.id === id);
      if (idx !== -1) listaCompras[idx].item = novoNome;
      salvarPendentesLocal();

      actions.innerHTML = '';
      actions.append(botaoSalvar, botaoEditar, botaoRemover);
      mostrarToast('Item atualizado com sucesso.', 'sucesso');
    });
  });

  li.append(topo, detalhes);
  listaPendentesUL.appendChild(li);
}

function inserirNaTabela(item, quantidade, preco, total, mesAno, docId = null) {
  const card = document.createElement('div');
  card.className = 'card-historico';

  let nomeAtual = item;

  const topo = document.createElement('div');
  topo.className = 'card-historico-topo';

  const nomeSpan = document.createElement('span');
  nomeSpan.className = 'nome-item';
  nomeSpan.innerText = nomeAtual;

  const valorSpan = document.createElement('span');
  valorSpan.className = 'card-historico-valor';
  valorSpan.innerText = formatter.format(total);

  const mesSpan = document.createElement('span');
  mesSpan.className = 'card-historico-mes';
  mesSpan.innerText = mesAno;

  const seta = document.createElement('span');
  seta.className = 'seta-expandir';
  seta.textContent = '▼';

  topo.append(nomeSpan, seta);

  const detalhes = document.createElement('div');
  detalhes.className = 'card-historico-detalhes';

  const infoResumo = document.createElement('div');
  infoResumo.className = 'detalhe-linha';

  const wrapValor = document.createElement('div');
  wrapValor.className = 'detalhe-item';
  wrapValor.innerHTML = `<span>Total</span>`;
  wrapValor.appendChild(valorSpan);

  const wrapMes = document.createElement('div');
  wrapMes.className = 'detalhe-item';
  wrapMes.innerHTML = `<span>Mês</span>`;
  wrapMes.appendChild(mesSpan);

  infoResumo.append(wrapValor, wrapMes);

  const infoLinha = document.createElement('div');
  infoLinha.className = 'detalhe-linha';

  const infoQtd = document.createElement('div');
  infoQtd.className = 'detalhe-item';
  infoQtd.innerHTML = `<span>Quantidade</span><span>${quantidade}</span>`;

  const infoPreco = document.createElement('div');
  infoPreco.className = 'detalhe-item';
  infoPreco.innerHTML = `<span>Preço unit.</span><span>${formatter.format(preco)}</span>`;

  infoLinha.append(infoQtd, infoPreco);

  const actions = document.createElement('div');
  actions.className = 'controles-item';

  const btnReutilizar = document.createElement('button');
  btnReutilizar.className = 'botao botao-pequeno botao-secundario';
  btnReutilizar.innerText = 'Reutilizar';
  btnReutilizar.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (!listaCompras.some(obj => obj.item === nomeAtual)) {
      if (firestoreDisponivel) {
        const docRef = await salvarListaPendenteFirebase(nomeAtual);
        if (docRef) {
          listaCompras.push({ id: docRef.id, item: nomeAtual });
        } else {
          return;
        }
      } else {
        listaCompras.push({ id: gerarIdLocal(), item: nomeAtual });
      }
      salvarPendentesLocal();
      await carregarListaCompras();
      mostrarToast(`"${nomeAtual}" adicionado à lista.`, 'sucesso');
    } else {
      mostrarToast(`"${nomeAtual}" já está na lista.`, 'aviso');
    }
  });

  const btnEditar = document.createElement('button');
  btnEditar.className = 'botao botao-pequeno botao-contorno';
  btnEditar.innerText = 'Editar';
  btnEditar.addEventListener('click', (e) => {
    e.stopPropagation();
    detalhes.classList.add('modo-edicao');

    infoLinha.innerHTML = '';

    const inputNome = document.createElement('input');
    inputNome.type = 'text';
    inputNome.value = nomeAtual;
    inputNome.className = 'entrada-item-tabela';
    inputNome.style.marginBottom = '12px';

    const inputQtd = document.createElement('input');
    inputQtd.type = 'number';
    inputQtd.value = quantidade;
    inputQtd.min = '1';
    inputQtd.className = 'entrada-item-tabela';

    const inputPreco = document.createElement('input');
    inputPreco.type = 'number';
    inputPreco.value = preco;
    inputPreco.min = '0.01';
    inputPreco.step = '0.01';
    inputPreco.className = 'entrada-item-tabela';

    const editRow = document.createElement('div');
    editRow.className = 'detalhe-linha';
    const editQtd = document.createElement('div');
    editQtd.className = 'detalhe-item';
    editQtd.style.flex = '1';
    editQtd.innerHTML = '<span>Quantidade</span>';
    editQtd.appendChild(inputQtd);
    const editPreco = document.createElement('div');
    editPreco.className = 'detalhe-item';
    editPreco.style.flex = '1';
    editPreco.innerHTML = '<span>Preço unit.</span>';
    editPreco.appendChild(inputPreco);
    editRow.append(editQtd, editPreco);

    infoLinha.append(inputNome, editRow);

    const editActions = document.createElement('div');
    editActions.className = 'controles-item';
    editActions.style.marginTop = '12px';

    const btnSalvar = document.createElement('button');
    btnSalvar.className = 'botao botao-pequeno botao-primario';
    btnSalvar.innerText = 'Salvar';

    const btnCancelar = document.createElement('button');
    btnCancelar.className = 'botao botao-pequeno botao-contorno';
    btnCancelar.innerText = 'Cancelar';

    editActions.append(btnSalvar, btnCancelar);
    actions.innerHTML = '';
    actions.appendChild(editActions);

    btnCancelar.addEventListener('click', (e) => {
      e.stopPropagation();
      detalhes.classList.remove('modo-edicao');
      card.replaceWith(inserirNaTabela(item, quantidade, preco, total, mesAno, docId));
    });

    btnSalvar.addEventListener('click', async (e) => {
      e.stopPropagation();
      const novoItem = inputNome.value.trim();
      const novaQtd = parseInt(inputQtd.value, 10);
      const novoPreco = parseFloat(inputPreco.value.replace(',', '.'));

      if (!novoItem) {
        mostrarToast('O nome do item não pode ficar vazio.', 'aviso');
        return;
      }
      if (!novaQtd || novaQtd <= 0 || !novoPreco || novoPreco <= 0) {
        mostrarToast('Insira valores válidos para quantidade e preço.', 'aviso');
        return;
      }

      const novoTotal = novaQtd * novoPreco;

      if (firestoreDisponivel && docId && !docId.startsWith('loc_')) {
        try {
          await updateDoc(doc(db, "compras", docId), {
            item: novoItem,
            quantidade: novaQtd,
            preco: novoPreco,
            total: novoTotal
          });
        } catch (error) {
          tratarErroFirebase(error, "Não foi possível salvar a edição no servidor.");
        }
      }

      const itemHistorico = historico[mesAno]?.find(i => i.id === docId);
      if (itemHistorico) {
        itemHistorico.item = novoItem;
        itemHistorico.quantidade = novaQtd;
        itemHistorico.preco = novoPreco;
        itemHistorico.total = novoTotal;
      }
      salvarHistoricoLocal();

      const novoCard = inserirNaTabela(novoItem, novaQtd, novoPreco, novoTotal, mesAno, docId);
      card.replaceWith(novoCard);
      atualizarTotalMes(mesAno);
      mostrarToast('Item atualizado com sucesso.', 'sucesso');
    });
  });

  const btnRemover = document.createElement('button');
  btnRemover.className = 'botao botao-pequeno botao-perigo';
  btnRemover.innerText = 'Remover';
  btnRemover.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (await confirmarAcao('Remover do histórico', `Deseja remover "${nomeAtual}" do seu histórico de compras?`, 'perigo')) {
      if (firestoreDisponivel && docId && !docId.startsWith('loc_')) {
        try { await removerHistoricoFirebase(docId); } catch (e) { /* proceed */ }
      }
      if (historico[mesAno]) {
        historico[mesAno] = historico[mesAno].filter(i => i.id !== docId);
        if (historico[mesAno].length === 0) delete historico[mesAno];
      }
      salvarHistoricoLocal();
      card.remove();
      atualizarTotalMes(mesAno);
      mostrarToast(`"${nomeAtual}" removido do histórico.`, 'sucesso');
    }
  });

  actions.append(btnReutilizar, btnEditar, btnRemover);
  detalhes.append(infoResumo, infoLinha, actions);

  topo.addEventListener('click', (e) => {
    if (e.target.closest('button') || e.target.closest('input')) return;
    card.classList.toggle('expandido');
  });

  card.append(topo, detalhes);
  listaHistorico.appendChild(card);
  return card;
}

function atualizarTotalMes(mesAno) {
  const total = historico[mesAno] ? historico[mesAno].reduce((acc, cur) => acc + cur.total, 0) : 0;
  totalMesSpan.innerText = formatter.format(total);
}

async function salvarHistoricoFirebase(item, quantidade, preco, total, mesAno) {
  try {
    const docRef = await addDoc(collection(db, 'compras'), {
      item, quantidade, preco, total, mesAno,
      userId: currentUser.uid,
      criadoEm: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    tratarErroFirebase(error, 'Não foi possível salvar o histórico no servidor.');
    return null;
  }
}

async function removerHistoricoFirebase(docId) {
  try { await deleteDoc(doc(db, 'compras', docId)); }
  catch (error) { tratarErroFirebase(error, 'Erro ao remover do servidor.'); }
}

async function limparHistoricoFirebaseTudo() {
  try {
    const snapshot = await getDocs(query(collection(db, 'compras'), where('userId', '==', currentUser.uid)));
    for (const docSnap of snapshot.docs) await deleteDoc(doc(db, 'compras', docSnap.id));
  } catch (error) { tratarErroFirebase(error, 'Erro ao limpar no servidor.'); }
}

function limparTabelaDaTela() { listaHistorico.innerHTML = ''; }

async function reutilizarTodosDoMes(mesAno) {
  if (historico[mesAno] && historico[mesAno].length > 0) {
    for (const { item } of historico[mesAno]) {
      if (!listaCompras.some(itemObj => itemObj.item === item)) {
        if (firestoreDisponivel) {
          const docRef = await salvarListaPendenteFirebase(item);
          if (docRef) listaCompras.push({ id: docRef.id, item });
        } else {
          listaCompras.push({ id: gerarIdLocal(), item });
        }
      }
    }
    salvarPendentesLocal();
    await carregarListaCompras();
    mostrarToast('Itens adicionados de volta à lista!', 'sucesso');
  }
}

function adicionarBotaoReutilizarTodos(mesAno) {
  if (!containerBotoesReutilizar) return;
  containerBotoesReutilizar.innerHTML = '';
  if (!historico[mesAno] || historico[mesAno].length === 0) return;

  const btn = document.createElement('button');
  btn.className = 'botao botao-secundario';
  btn.innerText = 'Reutilizar Todos';
  btn.addEventListener('click', () => reutilizarTodosDoMes(mesAno));
  containerBotoesReutilizar.appendChild(btn);
}

async function mostrarHistoricoPorMes() {
  let todosItens = [];

  if (firestoreDisponivel) {
    try {
      const snapshot = await getDocs(query(collection(db, 'compras'), where('userId', '==', currentUser.uid)));
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        todosItens.push(data);
      });
    } catch (error) {
      tratarErroFirebase(error, 'Erro ao buscar o histórico.');
    }
  }

  for (const mes in historico) {
    for (const item of historico[mes]) {
      if (!todosItens.some(t => t.item === item.item && t.mesAno === item.mesAno && t.total === item.total)) {
        todosItens.push(item);
      }
    }
  }

  if (todosItens.length === 0) {
    conteudoHistorico.innerHTML = `
      <div class="mes-vazio">
        <span class="mes-vazio-icone">📋</span>
        <p>Nenhum histórico encontrado.</p>
      </div>`;
    containerBotoes.innerHTML = '';
  } else {
    const totaisPorMes = {};
    const itensPorMes = {};
    todosItens.forEach(data => {
      totaisPorMes[data.mesAno] = (totaisPorMes[data.mesAno] || 0) + data.total;
      if (!itensPorMes[data.mesAno]) itensPorMes[data.mesAno] = [];
      itensPorMes[data.mesAno].push(data);
    });

    const mesesOrdenados = Object.keys(totaisPorMes).sort((a, b) => {
      const [mA, aA] = a.split('/');
      const [mB, aB] = b.split('/');
      return (aA * 12 + mA) - (aB * 12 + mB);
    });

    const gradienteMes = [
      'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
      'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)',
      'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)'
    ];

    let html = '';
    mesesOrdenados.forEach((mes, idx) => {
      const total = totaisPorMes[mes];
      const qtdItens = itensPorMes[mes].length;
      const [numeroMes] = mes.split('/');
      const nomeMes = new Date(2024, parseInt(numeroMes) - 1).toLocaleDateString('pt-BR', { month: 'long' });
      const cor = gradienteMes[idx % gradienteMes.length];

      html += `
        <div class="mes-card">
          <div class="mes-card-cabecalho" style="background: ${cor}">
            <span class="mes-card-nome">${nomeMes}</span>
            <span class="mes-card-ano">${mes.split('/')[1]}</span>
          </div>
          <div class="mes-card-corpo">
            <div class="mes-card-estatisticas">
              <div class="mes-estatistica">
                <span class="mes-estat-valor">${formatter.format(total)}</span>
                <span class="mes-estat-rotulo">Total gasto</span>
              </div>
              <div class="mes-estatistica">
                <span class="mes-estat-valor">${qtdItens}</span>
                <span class="mes-estat-rotulo">${qtdItens === 1 ? 'item' : 'itens'}</span>
              </div>
            </div>
            <div class="mes-card-itens">
              ${itensPorMes[mes].map(item => `
                <div class="mes-item-linha">
                  <span class="mes-item-nome">${item.item}</span>
                  <span class="mes-item-qty">x${item.quantidade}</span>
                  <span class="mes-item-total">${formatter.format(item.total)}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>`;
    });

    conteudoHistorico.innerHTML = html;
    criarBotoesLimpar(totaisPorMes);
  }
  janelaHistorico.style.display = 'flex';
}

function criarBotoesLimpar(totaisPorMes = {}) {
  containerBotoes.innerHTML = '';
  const mesesOrdenados = Object.keys(totaisPorMes).sort((a, b) => {
    const [mA, aA] = a.split('/');
    const [mB, aB] = b.split('/');
    return (aA * 12 + mA) - (aB * 12 + mB);
  });
  for (const mes of mesesOrdenados) {
    const btn = document.createElement('button');
    btn.className = 'botao botao-pequeno botao-contorno botao-limpar-mes';
    btn.innerHTML = `<span class="btn-limpar-icone">✕</span> Limpar ${mes}`;
    btn.addEventListener('click', async () => {
      if (await confirmarAcao('Limpar mês', `Deseja apagar todo o histórico de ${mes}? Esta ação não pode ser desfeita.`, 'perigo')) {
        if (firestoreDisponivel) {
          try { await limparHistoricoFirebaseMes(mes); } catch (e) { /* proceed */ }
        }
        delete historico[mes];
        salvarHistoricoLocal();
        await carregarHistoricoMes(mesAnoAtual);
        janelaHistorico.style.display = 'none';
        mostrarToast(`Histórico de ${mes} limpo.`, 'sucesso');
      }
    });
    containerBotoes.appendChild(btn);
  }
}

async function limparHistoricoFirebaseMes(mesAno) {
  try {
    const comprasQuery = query(collection(db, 'compras'), where('mesAno', '==', mesAno), where('userId', '==', currentUser.uid));
    const snapshot = await getDocs(comprasQuery);
    for (const docSnap of snapshot.docs) await deleteDoc(doc(db, 'compras', docSnap.id));
  } catch (error) { tratarErroFirebase(error, 'Erro ao limpar no servidor.'); }
}

async function salvarListaPendenteFirebase(item) {
  try {
    return await addDoc(collection(db, 'listaPendentes'), {
      item,
      userId: currentUser.uid,
      criadoEm: serverTimestamp()
    });
  } catch (error) {
    tratarErroFirebase(error, 'Erro ao salvar o item no servidor.');
    return null;
  }
}

async function atualizarListaPendenteFirebase(docId, novoNome) {
  try {
    await updateDoc(doc(db, 'listaPendentes', docId), { item: novoNome });
    return true;
  } catch (error) {
    tratarErroFirebase(error, 'Erro ao atualizar o item no servidor.');
    return false;
  }
}

async function removerListaPendenteFirebase(docId) {
  try { await deleteDoc(doc(db, 'listaPendentes', docId)); }
  catch (error) { tratarErroFirebase(error, 'Erro ao remover do servidor.'); }
}
