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
const tabelaHistoricoBody = document.querySelector('#tabelaHistorico tbody');
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
let firestoreDisponivel = true;

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

    // Oculta o aviso e mostra o aplicativo
    telaLoginAviso.style.display = 'none';
    conteudoApp.style.display = '';
    iniciarApp();
  } else {
    // DESLOGADO
    currentUser = null;
    nomeUsuario.innerText = '';
    btnLogin.style.display = 'inline-block';
    btnLogout.style.display = 'none';

    // Oculta o app e mostra o aviso para logar
    telaLoginAviso.style.display = 'block';
    conteudoApp.style.display = 'none';

    listaPendentesUL.innerHTML = '';
    tabelaHistoricoBody.innerHTML = '';
    historico = {};
  }
});

btnLogin.addEventListener('click', () => signInWithPopup(auth, provider));
btnLogout.addEventListener('click', () => signOut(auth));

// ==========================================
// LÓGICA DO APLICATIVO E BANCO DE DADOS
// ==========================================

function marcarFirebaseIndisponivel() {
  firestoreDisponivel = false;
  if (erroLista) erroLista.innerText = 'Conexão com Firebase indisponível.';
  btnAdicionar.disabled = true;
  btnMostrarHistoricoPorMes.disabled = true;
  btnLimparTudo.disabled = true;
}

function tratarErroFirebase(error, mensagemUsuario) {
  console.error('Firebase error:', error);
  mostrarToast(`${mensagemUsuario} Detalhe: ${error?.message || 'erro desconhecido.'}`, 'erro');
  marcarFirebaseIndisponivel();
}

btnAdicionar.addEventListener('click', adicionarItem);
entradaItem.addEventListener('keydown', event => { if (event.key === 'Enter') adicionarItem(); });
btnMostrarHistoricoPorMes.addEventListener('click', mostrarHistoricoPorMes);
btnLimparTudo.addEventListener('click', async () => {
  if (await confirmarAcao('Limpar histórico', 'Tem certeza que deseja apagar todo o histórico de compras? Esta ação não pode ser desfeita.', 'perigo')) {
    await limparHistoricoFirebaseTudo();
    historico = {};
    await carregarHistoricoMes(mesAnoAtual);
    janelaHistorico.style.display = 'none';
    mostrarToast('Histórico limpo com sucesso.', 'sucesso');
  }
});
btnFecharModal.addEventListener('click', () => { janelaHistorico.style.display = 'none'; });
janelaHistorico.addEventListener('click', event => { if (event.target === janelaHistorico) janelaHistorico.style.display = 'none'; });

async function iniciarApp() {
  await verificarConexaoFirebase();
  if (!firestoreDisponivel) return;
  await carregarHistoricoMes(mesAnoAtual);
  await carregarListaCompras();
}

async function verificarConexaoFirebase() {
  try {
    const comprasQuery = query(collection(db, 'compras'), where('mesAno', '==', mesAnoAtual), where('userId', '==', currentUser.uid));
    await getDocsFromServer(comprasQuery);
    firestoreDisponivel = true;
  } catch (error) {
    tratarErroFirebase(error, 'Não foi possível conectar ao Firestore.');
  }
}

async function carregarHistoricoMes(mesAno) {
  historico = {};
  limparTabelaDaTela();
  try {
    const comprasQuery = query(collection(db, 'compras'), where('mesAno', '==', mesAno), where('userId', '==', currentUser.uid));
    const querySnapshot = await getDocs(comprasQuery);
    querySnapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (!historico[mesAno]) historico[mesAno] = [];
      historico[mesAno].push({ id: docSnap.id, ...data });
      inserirNaTabela(data.item, data.quantidade, data.preco, data.total, mesAno, docSnap.id);
    });
  } catch (error) { tratarErroFirebase(error, 'Não foi carregar o histórico.'); }
  atualizarTotalMes(mesAno);
  adicionarBotaoReutilizarTodos(mesAno);
}

async function carregarListaCompras() {
  try {
    const pendentesQuery = query(collection(db, 'listaPendentes'), where('userId', '==', currentUser.uid));
    const snapshot = await getDocs(pendentesQuery);
    listaCompras = snapshot.docs.map(docSnap => ({ id: docSnap.id, item: docSnap.data().item }));
  } catch (error) {
    tratarErroFirebase(error, 'Não foi possível carregar a lista.');
    listaCompras = [];
  }
  listaPendentesUL.innerHTML = '';
  listaCompras.forEach(itemObj => renderizarItem(itemObj));
}

async function adicionarItem() {
  const valor = entradaItem.value.trim();
  erroLista.innerText = '';
  if (!firestoreDisponivel) { mostrarToast('Firebase indisponível.', 'erro'); return; }
  if (!valor) { erroLista.innerText = 'O nome do item é obrigatório.'; return; }
  if (listaCompras.some(itemObj => itemObj.item === valor)) { erroLista.innerText = 'Este item já está na lista.'; return; }

  const docRef = await salvarListaPendenteFirebase(valor);
  if (!docRef) return;

  const itemObj = { id: docRef.id, item: valor };
  listaCompras.push(itemObj);
  renderizarItem(itemObj);
  entradaItem.value = '';
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
      await removerListaPendenteFirebase(id);
      listaCompras = listaCompras.filter(itemObj => itemObj.id !== id);
      li.remove();
      mostrarToast(`"${nomeAtual}" removido da lista.`, 'sucesso');
    }
  });

  botaoSalvar.addEventListener('click', async () => {
    if (!firestoreDisponivel) return;
    erroListaLocal.innerText = '';
    const quantidade = parseInt(inputQuantidade.value, 10);
    const preco = parseFloat(inputPreco.value.replace(',', '.'));

    if (!quantidade || quantidade <= 0 || !preco || preco <= 0) {
      erroListaLocal.innerText = 'Informe quantidade e preço válidos.';
      return;
    }

    const total = quantidade * preco;
    const docId = await salvarHistoricoFirebase(nomeAtual, quantidade, preco, total, mesAnoAtual);
    if (!docId) return;

    await removerListaPendenteFirebase(id);
    listaCompras = listaCompras.filter(itemObj => itemObj.id !== id);
    li.remove();
    await carregarHistoricoMes(mesAnoAtual);
    mostrarToast(`"${nomeAtual}" salvo no histórico!`, 'sucesso');
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

      const ok = await atualizarListaPendenteFirebase(id, novoNome);
      if (!ok) return;

      nomeAtual = novoNome;
      nomeSpan.innerText = nomeAtual;
      inputNome.replaceWith(nomeSpan);

      const idx = listaCompras.findIndex(obj => obj.id === id);
      if (idx !== -1) listaCompras[idx].item = novoNome;

      actions.innerHTML = '';
      actions.append(botaoSalvar, botaoEditar, botaoRemover);
      mostrarToast('Item atualizado com sucesso.', 'sucesso');
    });
  });

  li.append(topo, detalhes);
  listaPendentesUL.appendChild(li);
}

function inserirNaTabela(item, quantidade, preco, total, mesAno, docId = null) {
  const linha = tabelaHistoricoBody.insertRow();

  const itemCell = linha.insertCell(); itemCell.dataset.label = 'Item'; itemCell.innerText = item;
  const quantidadeCell = linha.insertCell(); quantidadeCell.dataset.label = 'Quantidade'; quantidadeCell.innerText = quantidade;
  const precoCell = linha.insertCell(); precoCell.dataset.label = 'Preço'; precoCell.innerText = formatter.format(preco);
  const totalCell = linha.insertCell(); totalCell.dataset.label = 'Total'; totalCell.innerText = formatter.format(total);
  const mesAnoCell = linha.insertCell(); mesAnoCell.dataset.label = 'Mês/Ano'; mesAnoCell.innerText = mesAno;

  const cellAcoes = linha.insertCell(); cellAcoes.dataset.label = 'Ações'; cellAcoes.className = 'celula-acoes';

  const btnEditar = document.createElement('button');
  btnEditar.className = 'botao botao-pequeno botao-contorno';
  btnEditar.innerText = 'Editar';
  const btnReutilizar = document.createElement('button');
  btnReutilizar.className = 'botao botao-pequeno botao-secundario';
  btnReutilizar.innerText = 'Reutilizar';
  btnReutilizar.addEventListener('click', async () => {
    if (!listaCompras.some(obj => obj.item === item)) {
      const docRef = await salvarListaPendenteFirebase(item);
      if (docRef) {
        listaCompras.push({ id: docRef.id, item: item });
        carregarListaCompras();
        mostrarToast(`"${item}" adicionado à lista.`, 'sucesso');
      }
    } else {
      mostrarToast(`"${item}" já está na lista.`, 'aviso');
    }
  });

  const btnRemover = document.createElement('button');
  btnRemover.className = 'botao botao-pequeno botao-perigo';
  btnRemover.innerText = 'Remover';
  btnRemover.addEventListener('click', async () => {
    if (await confirmarAcao('Remover do histórico', `Deseja remover "${item}" do seu histórico de compras?`, 'perigo')) {
      await removerDoHistorico(item, quantidade, preco, total, mesAno, docId);
      linha.remove();
      atualizarTotalMes(mesAno);
      mostrarToast(`"${item}" removido do histórico.`, 'sucesso');
    }
  });

  btnEditar.addEventListener('click', () => {
    itemCell.innerHTML = `<input type="text" class="entrada-item-tabela" value="${item}">`;
    quantidadeCell.innerHTML = `<input type="number" class="entrada-item-tabela" value="${quantidade}" min="1">`;
    precoCell.innerHTML = `<input type="number" class="entrada-item-tabela" value="${preco}" min="0.01" step="0.01">`;

    // Cria botões de Salvar e Cancelar
    const btnSalvarEdicao = document.createElement('button');
    btnSalvarEdicao.className = 'botao botao-pequeno botao-primario botao-acao-edicao';
    btnSalvarEdicao.innerText = 'Salvar';

    const btnCancelarEdicao = document.createElement('button');
    btnCancelarEdicao.className = 'botao botao-pequeno botao-contorno';
    btnCancelarEdicao.innerText = 'Cancelar';

    cellAcoes.innerHTML = '';
    cellAcoes.append(btnSalvarEdicao, btnCancelarEdicao);

    btnCancelarEdicao.addEventListener('click', () => {
      // Recria a linha original para restaurar tudo, incluindo os listeners
      const novaLinha = inserirNaTabela(item, quantidade, preco, total, mesAno, docId);
      tabelaHistoricoBody.replaceChild(novaLinha, linha);
    });

    btnSalvarEdicao.addEventListener('click', async () => {
      const novoItem = itemCell.querySelector('input').value.trim();
      const novaQuantidade = parseInt(quantidadeCell.querySelector('input').value, 10);
      const novoPreco = parseFloat(precoCell.querySelector('input').value.replace(',', '.'));

      if (!novoItem) {
        mostrarToast('O nome do item não pode ficar vazio.', 'aviso');
        return;
      }
      if (!novaQuantidade || novaQuantidade <= 0 || !novoPreco || novoPreco <= 0) {
        mostrarToast('Insira valores válidos para quantidade e preço.', 'aviso');
        return;
      }

      const novoTotal = novaQuantidade * novoPreco;

      try {
        // 1. Atualiza no Firebase
        await updateDoc(doc(db, "compras", docId), {
          item: novoItem,
          quantidade: novaQuantidade,
          preco: novoPreco,
          total: novoTotal
        });

        // 2. Atualiza a linha na tela sem recarregar tudo
        const novaLinha = inserirNaTabela(novoItem, novaQuantidade, novoPreco, novoTotal, mesAno, docId);
        tabelaHistoricoBody.replaceChild(novaLinha, linha);

        // 3. Atualiza o total do mês e o histórico local
        const itemAntigo = historico[mesAno]?.find(i => i.id === docId);
        if (itemAntigo) {
          itemAntigo.item = novoItem;
          itemAntigo.quantidade = novaQuantidade;
          itemAntigo.preco = novoPreco;
          itemAntigo.total = novoTotal;
        }
        atualizarTotalMes(mesAno);

      } catch (error) {
        tratarErroFirebase(error, "Não foi possível salvar a edição.");
        // Em caso de erro, restaura a linha original
        const linhaOriginal = inserirNaTabela(item, quantidade, preco, total, mesAno, docId);
        tabelaHistoricoBody.replaceChild(linhaOriginal, linha);
      }
    });
  });

  cellAcoes.append(btnEditar, btnReutilizar, btnRemover);
  return linha; // Retorna a linha criada
}

async function removerDoHistorico(item, quantidade, preco, total, mesAno, docId = null) {
  if (docId) {
    await removerHistoricoFirebase(docId);
    if (historico[mesAno]) {
      historico[mesAno] = historico[mesAno].filter(i => i.id !== docId);
      if (historico[mesAno].length === 0) delete historico[mesAno];
    }
  }
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
    tratarErroFirebase(error, 'Não foi possível salvar o histórico.');
    return null;
  }
}

async function removerHistoricoFirebase(docId) {
  try { await deleteDoc(doc(db, 'compras', docId)); }
  catch (error) { tratarErroFirebase(error, 'Erro ao remover.'); }
}

async function limparHistoricoFirebaseMes(mesAno) {
  try {
    const comprasQuery = query(collection(db, 'compras'), where('mesAno', '==', mesAno), where('userId', '==', currentUser.uid));
    const snapshot = await getDocs(comprasQuery);
    for (const docSnap of snapshot.docs) await deleteDoc(doc(db, 'compras', docSnap.id));
  } catch (error) { tratarErroFirebase(error, 'Erro ao limpar.'); }
}

async function limparHistoricoFirebaseTudo() {
  try {
    const snapshot = await getDocs(query(collection(db, 'compras'), where('userId', '==', currentUser.uid)));
    for (const docSnap of snapshot.docs) await deleteDoc(doc(db, 'compras', docSnap.id));
  } catch (error) { tratarErroFirebase(error, 'Erro ao limpar tudo.'); }
}

function limparTabelaDaTela() { tabelaHistoricoBody.innerHTML = ''; }

async function reutilizarTodosDoMes(mesAno) {
  if (historico[mesAno] && historico[mesAno].length > 0) {
    for (const { item } of historico[mesAno]) {
      if (!listaCompras.some(itemObj => itemObj.item === item)) {
        const docRef = await salvarListaPendenteFirebase(item);
        if (docRef) listaCompras.push({ id: docRef.id, item });
      }
    }
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
  try {
    const snapshot = await getDocs(query(collection(db, 'compras'), where('userId', '==', currentUser.uid)));
    if (snapshot.empty) {
      conteudoHistorico.innerText = 'Nenhum histórico encontrado.';
      containerBotoes.innerHTML = '';
    } else {
      const totaisPorMes = {};
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        totaisPorMes[data.mesAno] = (totaisPorMes[data.mesAno] || 0) + data.total;
      });
      let texto = 'Gastos por mês:\n\n';
      for (const mes in totaisPorMes) texto += `${mes}: ${formatter.format(totaisPorMes[mes])}\n`;
      conteudoHistorico.innerText = texto;
      criarBotoesLimpar(totaisPorMes);
    }
  } catch (error) {
    tratarErroFirebase(error, 'Erro ao buscar o histórico.');
    conteudoHistorico.innerText = 'Erro ao carregar.';
    containerBotoes.innerHTML = '';
  }
  janelaHistorico.style.display = 'flex';
}

function criarBotoesLimpar(totaisPorMes = {}) {
  containerBotoes.innerHTML = '';
  for (const mes in totaisPorMes) {
    const btn = document.createElement('button');
    btn.className = 'botao botao-perigo botao-pequeno';
    btn.innerText = `Limpar ${mes}`;
    btn.addEventListener('click', async () => {
      if (await confirmarAcao('Limpar mês', `Deseja apagar todo o histórico de ${mes}? Esta ação não pode ser desfeita.`, 'perigo')) {
        await limparHistoricoFirebaseMes(mes);
        await carregarHistoricoMes(mesAnoAtual);
        janelaHistorico.style.display = 'none';
        mostrarToast(`Histórico de ${mes} limpo.`, 'sucesso');
      }
    });
    containerBotoes.appendChild(btn);
  }
}

async function salvarListaPendenteFirebase(item) {
  try {
    return await addDoc(collection(db, 'listaPendentes'), {
      item,
      userId: currentUser.uid,
      criadoEm: serverTimestamp()
    });
  } catch (error) {
    tratarErroFirebase(error, 'Erro ao salvar o item.');
    return null;
  }
}

async function atualizarListaPendenteFirebase(docId, novoNome) {
  try {
    await updateDoc(doc(db, 'listaPendentes', docId), { item: novoNome });
    return true;
  } catch (error) {
    tratarErroFirebase(error, 'Erro ao atualizar o item.');
    return false;
  }
}

async function removerListaPendenteFirebase(docId) {
  try { await deleteDoc(doc(db, 'listaPendentes', docId)); }
  catch (error) { tratarErroFirebase(error, 'Erro ao remover.'); }
}