const STORAGE_TODO = 'todoListTemp';
const STORAGE_HISTORICO = 'historicoGastos';

const todoInput = document.getElementById('todoItem');
const todoListUL = document.getElementById('todoList');
const erroItem = document.getElementById('erroItem');
const tabelaHistoricoBody = document.querySelector('#tabelaHistorico tbody');
const totalMesSpan = document.getElementById('totalMes');
const containerBotoesReutilizar = document.getElementById('containerBotoesReutilizar');
const modal = document.getElementById('modalHistorico');
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
let listaToDo = JSON.parse(localStorage.getItem(STORAGE_TODO)) || [];
let historico = JSON.parse(localStorage.getItem(STORAGE_HISTORICO)) || {};

btnAdicionar.addEventListener('click', adicionarToDo);
todoInput.addEventListener('keydown', event => {
  if (event.key === 'Enter') adicionarToDo();
});
btnMostrarHistoricoPorMes.addEventListener('click', mostrarHistoricoPorMes);
btnLimparTudo.addEventListener('click', () => {
  if (confirm('Deseja limpar todo o histórico?')) {
    localStorage.removeItem(STORAGE_HISTORICO);
    historico = {};
    carregarHistoricoMes(mesAnoAtual);
    modal.style.display = 'none';
  }
});
btnFecharModal.addEventListener('click', () => {
  modal.style.display = 'none';
});
modal.addEventListener('click', event => {
  if (event.target === modal) modal.style.display = 'none';
});

carregarHistoricoMes(mesAnoAtual);
carregarListaToDo();

function carregarHistoricoMes(mesAno) {
  historico = JSON.parse(localStorage.getItem(STORAGE_HISTORICO)) || {};
  limparTabelaDaTela();

  if (historico[mesAno]) {
    historico[mesAno].forEach(({ item, quantidade, preco, total }) => {
      inserirNaTabela(item, quantidade, preco, total, mesAno);
    });
  }

  atualizarTotalMes(mesAno);
  adicionarBotaoReutilizarTodos(mesAno);
}

function carregarListaToDo() {
  listaToDo = JSON.parse(localStorage.getItem(STORAGE_TODO)) || [];
  todoListUL.innerHTML = '';
  listaToDo.forEach(item => renderizarItem(item));
}

function adicionarToDo() {
  const valor = todoInput.value.trim();
  erroItem.innerText = '';

  if (!valor) {
    erroItem.innerText = 'O nome do item é obrigatório.';
    return;
  }

  if (listaToDo.includes(valor)) {
    erroItem.innerText = 'Este item já está na lista.';
    return;
  }

  listaToDo.push(valor);
  salvarListaTemporaria();
  renderizarItem(valor);
  todoInput.value = '';
}

function renderizarItem(valor) {
  const li = document.createElement('li');

  const nomeSpan = document.createElement('span');
  nomeSpan.className = 'todo-name';
  nomeSpan.innerText = valor;

  const inputQuantidade = document.createElement('input');
  inputQuantidade.type = 'number';
  inputQuantidade.placeholder = 'Qtd';
  inputQuantidade.min = '1';
  inputQuantidade.className = 'todo-input';

  const inputPreco = document.createElement('input');
  inputPreco.type = 'number';
  inputPreco.placeholder = 'Preço';
  inputPreco.min = '0.01';
  inputPreco.step = '0.01';
  inputPreco.className = 'todo-input';

  const botaoSalvar = document.createElement('button');
  botaoSalvar.className = 'button button-small button-primary';
  botaoSalvar.innerText = 'Salvar';

  const botaoRemover = document.createElement('button');
  botaoRemover.className = 'button button-small button-danger';
  botaoRemover.innerText = 'Remover';

  const actions = document.createElement('div');
  actions.className = 'todo-controls';
  actions.append(botaoSalvar, botaoRemover);

  const erroItemLocal = document.createElement('div');
  erroItemLocal.className = 'input-error';

  botaoRemover.addEventListener('click', () => {
    if (confirm(`Deseja remover "${valor}" da lista?`)) {
      listaToDo = listaToDo.filter(item => item !== valor);
      salvarListaTemporaria();
      li.remove();
    }
  });

  botaoSalvar.addEventListener('click', () => {
    erroItemLocal.innerText = '';
    const quantidade = parseInt(inputQuantidade.value, 10);
    const preco = parseFloat(inputPreco.value.replace(',', '.'));

    if (!quantidade || quantidade <= 0 || !preco || preco <= 0) {
      erroItemLocal.innerText = 'Informe quantidade e preço válidos.';
      if (!li.contains(erroItemLocal)) li.appendChild(erroItemLocal);
      return;
    }

    const total = quantidade * preco;
    inserirNaTabela(valor, quantidade, preco, total, mesAnoAtual);
    salvarHistorico(valor, quantidade, preco, total, mesAnoAtual);
    atualizarTotalMes(mesAnoAtual);

    listaToDo = listaToDo.filter(item => item !== valor);
    salvarListaTemporaria();
    li.remove();
  });

  li.append(nomeSpan, inputQuantidade, inputPreco, actions);
  todoListUL.appendChild(li);
}

function inserirNaTabela(item, quantidade, preco, total, mesAno) {
  const linha = tabelaHistoricoBody.insertRow();
  linha.insertCell().innerText = item;
  linha.insertCell().innerText = quantidade;
  linha.insertCell().innerText = formatter.format(preco);
  linha.insertCell().innerText = formatter.format(total);
  linha.insertCell().innerText = mesAno;

  const cellAcoes = linha.insertCell();
  cellAcoes.className = 'actions-cell';

  const btnReutilizar = document.createElement('button');
  btnReutilizar.className = 'button button-small button-secondary';
  btnReutilizar.innerText = 'Reutilizar';
  btnReutilizar.addEventListener('click', () => {
    if (!listaToDo.includes(item)) {
      listaToDo.push(item);
      salvarListaTemporaria();
      carregarListaToDo();
      alert(`"${item}" adicionado novamente à lista de compras.`);
    } else {
      alert(`"${item}" já está na lista de compras.`);
    }
  });

  const btnRemover = document.createElement('button');
  btnRemover.className = 'button button-small button-danger';
  btnRemover.innerText = 'Remover';
  btnRemover.addEventListener('click', () => {
    if (confirm(`Deseja remover "${item}" do histórico?`)) {
      removerDoHistorico(item, quantidade, preco, total, mesAno);
      linha.remove();
      atualizarTotalMes(mesAno);
    }
  });

  cellAcoes.append(btnReutilizar, btnRemover);
}

function removerDoHistorico(item, quantidade, preco, total, mesAno) {
  historico = JSON.parse(localStorage.getItem(STORAGE_HISTORICO)) || {};
  if (historico[mesAno]) {
    historico[mesAno] = historico[mesAno].filter(i => !(i.item === item && i.quantidade === quantidade && i.preco === preco && i.total === total));
    if (historico[mesAno].length === 0) delete historico[mesAno];
    localStorage.setItem(STORAGE_HISTORICO, JSON.stringify(historico));
  }
}

function salvarHistorico(item, quantidade, preco, total, mesAno) {
  historico = JSON.parse(localStorage.getItem(STORAGE_HISTORICO)) || {};
  if (!historico[mesAno]) historico[mesAno] = [];
  historico[mesAno].push({ item, quantidade, preco, total });
  localStorage.setItem(STORAGE_HISTORICO, JSON.stringify(historico));
}

function atualizarTotalMes(mesAno) {
  historico = JSON.parse(localStorage.getItem(STORAGE_HISTORICO)) || {};
  const total = historico[mesAno] ? historico[mesAno].reduce((acc, cur) => acc + cur.total, 0) : 0;
  totalMesSpan.innerText = formatter.format(total);
}

function limparTabelaDaTela() {
  tabelaHistoricoBody.innerHTML = '';
}

function reutilizarTodosDoMes(mesAno) {
  historico = JSON.parse(localStorage.getItem(STORAGE_HISTORICO)) || {};
  if (historico[mesAno]) {
    historico[mesAno].forEach(({ item }) => {
      if (!listaToDo.includes(item)) listaToDo.push(item);
    });
    salvarListaTemporaria();
    carregarListaToDo();
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
  btnReutilizarTodos.className = 'button button-secondary';
  btnReutilizarTodos.innerText = 'Reutilizar Todos';
  btnReutilizarTodos.addEventListener('click', () => reutilizarTodosDoMes(mesAno));

  containerBotoesReutilizar.appendChild(btnReutilizarTodos);
}

function mostrarHistoricoPorMes() {
  historico = JSON.parse(localStorage.getItem(STORAGE_HISTORICO)) || {};
  if (Object.keys(historico).length === 0) {
    conteudoHistorico.innerText = 'Nenhum histórico de gastos encontrado.';
    containerBotoes.innerHTML = '';
  } else {
    let texto = 'Gastos por mês:\n\n';
    for (const mes in historico) {
      const totalMes = historico[mes].reduce((acc, cur) => acc + cur.total, 0);
      texto += `${mes}: ${formatter.format(totalMes)}\n`;
    }
    conteudoHistorico.innerText = texto;
    criarBotoesLimpar();
  }
  modal.style.display = 'flex';
}

function criarBotoesLimpar() {
  containerBotoes.innerHTML = '';
  for (const mes in historico) {
    const btn = document.createElement('button');
    btn.className = 'button button-danger button-small';
    btn.innerText = `Limpar ${mes}`;
    btn.addEventListener('click', () => {
      if (confirm(`Deseja limpar o mês ${mes}?`)) {
        delete historico[mes];
        localStorage.setItem(STORAGE_HISTORICO, JSON.stringify(historico));
        carregarHistoricoMes(mesAnoAtual);
        modal.style.display = 'none';
      }
    });
    containerBotoes.appendChild(btn);
  }

  const btnLimparTudoModal = document.createElement('button');
  btnLimparTudoModal.className = 'button button-secondary button-small';
  btnLimparTudoModal.innerText = 'Limpar Tudo';
  btnLimparTudoModal.addEventListener('click', () => {
    if (confirm('Deseja limpar todo o histórico?')) {
      localStorage.removeItem(STORAGE_HISTORICO);
      historico = {};
      carregarHistoricoMes(mesAnoAtual);
      modal.style.display = 'none';
    }
  });
  containerBotoes.appendChild(btnLimparTudoModal);
}

function salvarListaTemporaria() {
  localStorage.setItem(STORAGE_TODO, JSON.stringify(listaToDo));
}
