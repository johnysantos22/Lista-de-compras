// js/mode2.js

import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-analytics.js';
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  getDocsFromServer,
  query,
  where,
  deleteDoc,
  doc,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';

// Importa a configuração do arquivo separado
import { firebaseConfig } from './firebase-config.js';

const appFirebase = initializeApp(firebaseConfig);
const analytics = getAnalytics(appFirebase);
const db = getFirestore(appFirebase);

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

const dataAtual = new Date();
const mesAnoAtual = dataAtual.toLocaleDateString('pt-BR', {
  month: '2-digit',
  year: 'numeric'
});

const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
let listaCompras = [];
let historico = {};
let firestoreDisponivel = true;

function marcarFirebaseIndisponivel() {
  firestoreDisponivel = false;
  if (erroLista) {
    erroLista.innerText = 'Conexão com Firebase indisponível. Verifique a configuração do Firestore e atualize a página.';
  }
  btnAdicionar.disabled = true;
  btnMostrarHistoricoPorMes.disabled = true;
  btnLimparTudo.disabled = true;
}

function tratarErroFirebase(error, mensagemUsuario) {
  console.error('Firebase error:', error);
  const detalhes = error?.code ? ` (${error.code})` : '';
  alert(`${mensagemUsuario}\n\nDetalhe: ${error?.message || 'erro desconhecido.'}${detalhes}`);
  marcarFirebaseIndisponivel();
}

btnAdicionar.addEventListener('click', adicionarItem);
entradaItem.addEventListener('keydown', event => {
  if (event.key === 'Enter') adicionarItem();
});
btnMostrarHistoricoPorMes.addEventListener('click', mostrarHistoricoPorMes);
btnLimparTudo.addEventListener('click', async () => {
  if (confirm('Deseja limpar todo o histórico?')) {
    await limparHistoricoFirebaseTudo();
    historico = {};
    await carregarHistoricoMes(mesAnoAtual);
    janelaHistorico.style.display = 'none';
  }
});
btnFecharModal.addEventListener('click', () => {
  janelaHistorico.style.display = 'none';
});
janelaHistorico.addEventListener('click', event => {
  if (event.target === janelaHistorico) janelaHistorico.style.display = 'none';
});

iniciarApp();

async function iniciarApp() {
  await verificarConexaoFirebase();
  if (!firestoreDisponivel) return;

  await carregarHistoricoMes(mesAnoAtual);
  await carregarListaCompras();
}

async function verificarConexaoFirebase() {
  try {
    const comprasQuery = query(collection(db, 'compras'), where('mesAno', '==', mesAnoAtual));
    await getDocsFromServer(comprasQuery);
    firestoreDisponivel = true;
  } catch (error) {
    tratarErroFirebase(error, 'Não foi possível conectar ao Firestore. Verifique o projeto e ative a API do Cloud Firestore.');
  }
}

async function carregarHistoricoMes(mesAno) {
  historico = {};
  limparTabelaDaTela();

  try {
    const comprasQuery = query(collection(db, 'compras'), where('mesAno', '==', mesAno));
    const querySnapshot = await getDocs(comprasQuery);

    querySnapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (!historico[mesAno]) historico[mesAno] = [];
      historico[mesAno].push({ id: docSnap.id, ...data });
      inserirNaTabela(data.item, data.quantidade, data.preco, data.total, mesAno, docSnap.id);
    });
  } catch (error) {
    tratarErroFirebase(error, 'Não foi possível carregar o histórico do Firebase. Verifique o Firestore e tente novamente.');
  }

  atualizarTotalMes(mesAno);
  adicionarBotaoReutilizarTodos(mesAno);
}

async function carregarListaCompras() {
  try {
    const snapshot = await getDocs(collection(db, 'listaPendentes'));
    listaCompras = snapshot.docs.map(docSnap => ({ id: docSnap.id, item: docSnap.data().item }));
  } catch (error) {
    tratarErroFirebase(error, 'Não foi possível carregar a lista de compras do Firebase. Verifique o Firestore e tente novamente.');
    listaCompras = [];
  }

  listaPendentesUL.innerHTML = '';
  listaCompras.forEach(itemObj => renderizarItem(itemObj));
}

async function adicionarItem() {
  const valor = entradaItem.value.trim();
  erroLista.innerText = '';

  if (!firestoreDisponivel) {
    const mensagem = 'Firebase indisponível. Os dados não podem ser salvos agora.';
    erroLista.innerText = mensagem;
    alert(mensagem);
    return;
  }

  if (!valor) {
    erroLista.innerText = 'O nome do item é obrigatório.';
    return;
  }

  if (listaCompras.some(itemObj => itemObj.item === valor)) {
    erroLista.innerText = 'Este item já está na lista.';
    return;
  }

  const docRef = await salvarListaPendenteFirebase(valor);
  if (!docRef) return;

  const itemObj = { id: docRef.id, item: valor };
  listaCompras.push(itemObj);
  renderizarItem(itemObj);
  entradaItem.value = '';
}

function renderizarItem({ id, item }) {
  const li = document.createElement('li');

  const nomeSpan = document.createElement('span');
  nomeSpan.className = 'nome-item';
  nomeSpan.innerText = item;

  const inputQuantidade = document.createElement('input');
  inputQuantidade.type = 'number';
  inputQuantidade.placeholder = 'Qtd';
  inputQuantidade.min = '1';
  inputQuantidade.className = 'entrada-item';

  const inputPreco = document.createElement('input');
  inputPreco.type = 'number';
  inputPreco.placeholder = 'Preço';
  inputPreco.min = '0.01';
  inputPreco.step = '0.01';
  inputPreco.className = 'entrada-item';

  const botaoSalvar = document.createElement('button');
  botaoSalvar.className = 'botao botao-pequeno botao-primario';
  botaoSalvar.innerText = 'Salvar';

  const botaoRemover = document.createElement('button');
  botaoRemover.className = 'botao botao-pequeno botao-perigo';
  botaoRemover.innerText = 'Remover';

  const actions = document.createElement('div');
  actions.className = 'controles-item';
  actions.append(botaoSalvar, botaoRemover);

  const erroListaLocal = document.createElement('div');
  erroListaLocal.className = 'erro-input';

  botaoRemover.addEventListener('click', async () => {
    if (confirm(`Deseja remover "${item}" da lista?`)) {
      await removerListaPendenteFirebase(id);
      listaCompras = listaCompras.filter(itemObj => itemObj.id !== id);
      li.remove();
    }
  });

  botaoSalvar.addEventListener('click', async () => {
    if (!firestoreDisponivel) {
      erroListaLocal.innerText = 'Firebase indisponível. Os dados não podem ser salvos agora.';
      if (!li.contains(erroListaLocal)) li.appendChild(erroListaLocal);
      return;
    }

    erroListaLocal.innerText = '';
    const quantidade = parseInt(inputQuantidade.value, 10);
    const preco = parseFloat(inputPreco.value.replace(',', '.'));

    if (!quantidade || quantidade <= 0 || !preco || preco <= 0) {
      erroListaLocal.className = 'erro-input';
      erroListaLocal.innerText = 'Informe quantidade e preço válidos.';
      if (!li.contains(erroListaLocal)) li.appendChild(erroListaLocal);
      return;
    }

    const total = quantidade * preco;
    const docId = await salvarHistoricoFirebase(item, quantidade, preco, total, mesAnoAtual);
    if (!docId) return;

    await removerListaPendenteFirebase(id);
    listaCompras = listaCompras.filter(itemObj => itemObj.id !== id);
    li.remove();
    await carregarHistoricoMes(mesAnoAtual);
  });

  li.append(nomeSpan, inputQuantidade, inputPreco, actions);
  listaPendentesUL.appendChild(li);
}

function inserirNaTabela(item, quantidade, preco, total, mesAno, docId = null) {
  const linha = tabelaHistoricoBody.insertRow();
  const itemCell = linha.insertCell();
  itemCell.dataset.label = 'Item';
  itemCell.innerText = item;

  const quantidadeCell = linha.insertCell();
  quantidadeCell.dataset.label = 'Quantidade';
  quantidadeCell.innerText = quantidade;

  const precoCell = linha.insertCell();
  precoCell.dataset.label = 'Preço';
  precoCell.innerText = formatter.format(preco);

  const totalCell = linha.insertCell();
  totalCell.dataset.label = 'Total';
  totalCell.innerText = formatter.format(total);

  const mesAnoCell = linha.insertCell();
  mesAnoCell.dataset.label = 'Mês/Ano';
  mesAnoCell.innerText = mesAno;

  const cellAcoes = linha.insertCell();
  cellAcoes.dataset.label = 'Ações';
  cellAcoes.className = 'celula-acoes';

  const btnReutilizar = document.createElement('button');
  btnReutilizar.className = 'botao botao-pequeno botao-secundario';
  btnReutilizar.innerText = 'Reutilizar';
  btnReutilizar.addEventListener('click', () => {
    if (!listaCompras.includes(item)) {
      listaCompras.push(item);
      salvarListaTemporaria();
      carregarListaCompras();
      alert(`"${item}" adicionado novamente à lista de compras.`);
    } else {
      alert(`"${item}" já está na lista de compras.`);
    }
  });

  const btnRemover = document.createElement('button');
  btnRemover.className = 'botao botao-pequeno botao-perigo';
  btnRemover.innerText = 'Remover';
  btnRemover.addEventListener('click', async () => {
    if (confirm(`Deseja remover "${item}" do histórico?`)) {
      await removerDoHistorico(item, quantidade, preco, total, mesAno, docId);
      linha.remove();
      atualizarTotalMes(mesAno);
    }
  });

  cellAcoes.append(btnReutilizar, btnRemover);
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
      item,
      quantidade,
      preco,
      total,
      mesAno,
      criadoEm: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    tratarErroFirebase(error, 'Não foi possível salvar o histórico no Firebase. Verifique o Firestore e tente novamente.');
    return null;
  }
}

async function removerHistoricoFirebase(docId) {
  try {
    await deleteDoc(doc(db, 'compras', docId));
  } catch (error) {
    tratarErroFirebase(error, 'Não foi possível remover o histórico do Firebase.');
  }
}

async function limparHistoricoFirebaseMes(mesAno) {
  try {
    const comprasQuery = query(collection(db, 'compras'), where('mesAno', '==', mesAno));
    const snapshot = await getDocs(comprasQuery);
    for (const docSnap of snapshot.docs) {
      await deleteDoc(doc(db, 'compras', docSnap.id));
    }
  } catch (error) {
    tratarErroFirebase(error, 'Não foi possível limpar o histórico deste mês no Firebase.');
  }
}

async function limparHistoricoFirebaseTudo() {
  try {
    const snapshot = await getDocs(collection(db, 'compras'));
    for (const docSnap of snapshot.docs) {
      await deleteDoc(doc(db, 'compras', docSnap.id));
    }
  } catch (error) {
    tratarErroFirebase(error, 'Não foi possível limpar todo o histórico no Firebase.');
  }
}

function limparTabelaDaTela() {
  tabelaHistoricoBody.innerHTML = '';
}

async function reutilizarTodosDoMes(mesAno) {
  if (historico[mesAno] && historico[mesAno].length > 0) {
    for (const { item } of historico[mesAno]) {
      if (!listaCompras.some(itemObj => itemObj.item === item)) {
        const docRef = await salvarListaPendenteFirebase(item);
        if (docRef) {
          listaCompras.push({ id: docRef.id, item });
        }
      }
    }
    await carregarListaCompras();
    alert('Todos os itens do mês foram adicionados de volta à lista de compras!');
  } else {
    alert('Nenhum item encontrado para este mês.');
  }
}

function adicionarBotaoReutilizarTodos(mesAno) {
  if (!containerBotoesReutilizar) return;
  containerBotoesReutilizar.innerHTML = '';

  if (!historico[mesAno] || historico[mesAno].length === 0) return;

  const btnReutilizarTodos = document.createElement('button');
  btnReutilizarTodos.className = 'botao botao-secundario';
  btnReutilizarTodos.innerText = 'Reutilizar Todos';
  btnReutilizarTodos.addEventListener('click', () => reutilizarTodosDoMes(mesAno));

  containerBotoesReutilizar.appendChild(btnReutilizarTodos);
}

async function mostrarHistoricoPorMes() {
  try {
    const snapshot = await getDocs(collection(db, 'compras'));
    if (snapshot.empty) {
      conteudoHistorico.innerText = 'Nenhum histórico de gastos encontrado.';
      containerBotoes.innerHTML = '';
    } else {
      const totaisPorMes = {};
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        totaisPorMes[data.mesAno] = (totaisPorMes[data.mesAno] || 0) + data.total;
      });

      let texto = 'Gastos por mês:\n\n';
      for (const mes in totaisPorMes) {
        texto += `${mes}: ${formatter.format(totaisPorMes[mes])}\n`;
      }
      conteudoHistorico.innerText = texto;
      criarBotoesLimpar(totaisPorMes);
    }
  } catch (error) {
    tratarErroFirebase(error, 'Não foi possível buscar o histórico do Firebase. Verifique o Firestore e tente novamente.');
    conteudoHistorico.innerText = 'Não foi possível carregar o histórico.';
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
      if (confirm(`Deseja limpar o mês ${mes}?`)) {
        await limparHistoricoFirebaseMes(mes);
        await carregarHistoricoMes(mesAnoAtual);
        janelaHistorico.style.display = 'none';
      }
    });
    containerBotoes.appendChild(btn);
  }

  const btnLimparTudoModal = document.createElement('button');
  btnLimparTudoModal.className = 'botao botao-secundario botao-pequeno';
  btnLimparTudoModal.innerText = 'Limpar Tudo';
  btnLimparTudoModal.addEventListener('click', async () => {
    if (confirm('Deseja limpar todo o histórico?')) {
      await limparHistoricoFirebaseTudo();
      historico = {};
      await carregarHistoricoMes(mesAnoAtual);
      janelaHistorico.style.display = 'none';
    }
  });
  containerBotoes.appendChild(btnLimparTudoModal);
}

async function salvarListaPendenteFirebase(item) {
  try {
    const docRef = await addDoc(collection(db, 'listaPendentes'), {
      item,
      criadoEm: serverTimestamp()
    });
    return docRef;
  } catch (error) {
    tratarErroFirebase(error, 'Não foi possível salvar o item pendente no Firebase. Verifique o Firestore e tente novamente.');
    return null;
  }
}

async function removerListaPendenteFirebase(docId) {
  try {
    await deleteDoc(doc(db, 'listaPendentes', docId));
  } catch (error) {
    tratarErroFirebase(error, 'Não foi possível remover o item pendente no Firebase.');
  }
}
