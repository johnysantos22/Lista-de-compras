 let listaToDo = JSON.parse(localStorage.getItem('todoListTemp')) || [];
    const dataAtual = new Date();
    const mesAnoAtual = dataAtual.toLocaleDateString('pt-BR', {
      month: '2-digit',
      year: 'numeric'
    }).replace('/', '/');

    const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
    let historico = JSON.parse(localStorage.getItem('historicoGastos')) || {};

    carregarHistoricoMes(mesAnoAtual);
    carregarListaToDo();

    function carregarHistoricoMes(mesAno) {
      historico = JSON.parse(localStorage.getItem('historicoGastos')) || {};
      limparTabelaDaTela();
      if (historico[mesAno]) {
        historico[mesAno].forEach(({ item, quantidade, preco, total }) => {
          inserirNaTabela(item, quantidade, preco, total, mesAno);
        });
      }
      atualizarTotalMes(mesAno);
    }

    function carregarListaToDo() {
      listaToDo = JSON.parse(localStorage.getItem('todoListTemp')) || [];
      const todoListUL = document.getElementById('todoList');
      todoListUL.innerHTML = '';
      listaToDo.forEach(item => renderizarItem(item));
    }

    function adicionarToDo() {
      const valor = document.getElementById('todoItem').value.trim();
      const erroDiv = document.getElementById('erroItem');
      erroDiv.innerText = '';

      if (!valor) {
        erroDiv.innerText = 'O nome do item é obrigatório.';
        return;
      }

      if (listaToDo.includes(valor)) {
        erroDiv.innerText = 'Este item já está na lista.';
        return;
      }

      listaToDo.push(valor);
      localStorage.setItem('todoListTemp', JSON.stringify(listaToDo));
      renderizarItem(valor);
      document.getElementById('todoItem').value = '';
    }

    function renderizarItem(valor) {
      const li = document.createElement('li');
      li.style.marginBottom = '10px';

      const nomeSpan = document.createElement('span');
      nomeSpan.innerText = valor;
      nomeSpan.style.marginRight = '10px';

      const inputQuantidade = document.createElement('input');
      inputQuantidade.type = 'number';
      inputQuantidade.placeholder = 'Qtd';
      inputQuantidade.style.width = '60px';

      const inputPreco = document.createElement('input');
      inputPreco.type = 'number';
      inputPreco.placeholder = 'Preço';
      inputPreco.style.width = '80px';

      const botaoSalvar = document.createElement('button');
      botaoSalvar.innerText = 'Salvar';
      botaoSalvar.style.marginLeft = '8px';

      botaoSalvar.onclick = () => {
        const erroExistente = li.querySelector('.erroInput');
        if (erroExistente) erroExistente.remove();

        const quantidade = parseInt(inputQuantidade.value);
        const preco = parseFloat(inputPreco.value);

        if (!quantidade || quantidade <= 0 || !preco || preco <= 0) {
          const erro = document.createElement('div');
          erro.innerText = 'Preencha quantidade e preço válidos.';
          erro.className = 'erroInput';
          erro.style.color = 'red';
          erro.style.fontSize = '14px';
          li.appendChild(erro);
          return;
        }

        const total = quantidade * preco;
        inserirNaTabela(valor, quantidade, preco, total, mesAnoAtual);
        salvarHistorico(valor, quantidade, preco, total, mesAnoAtual);
        atualizarTotalMes(mesAnoAtual);

        listaToDo = listaToDo.filter(item => item !== valor);
        localStorage.setItem('todoListTemp', JSON.stringify(listaToDo));
        li.remove();
      };

      li.appendChild(nomeSpan);
      li.appendChild(inputQuantidade);
      li.appendChild(inputPreco);
      li.appendChild(botaoSalvar);
      document.getElementById('todoList').appendChild(li);
    }

    function inserirNaTabela(item, quantidade, preco, total, mesAno) {
      const tabela = document.getElementById('tabelaHistorico');
      const linha = tabela.insertRow();
      linha.insertCell().innerText = item;
      linha.insertCell().innerText = quantidade;
      linha.insertCell().innerText = formatter.format(preco);
      linha.insertCell().innerText = formatter.format(total);
      linha.insertCell().innerText = mesAno;
    }

    function salvarHistorico(item, quantidade, preco, total, mesAno) {
      historico = JSON.parse(localStorage.getItem('historicoGastos')) || {};
      if (!historico[mesAno]) historico[mesAno] = [];
      historico[mesAno].push({ item, quantidade, preco, total });
      localStorage.setItem('historicoGastos', JSON.stringify(historico));
    }

    function atualizarTotalMes(mesAno) {
      historico = JSON.parse(localStorage.getItem('historicoGastos')) || {};
      let total = 0;
      if (historico[mesAno]) {
        total = historico[mesAno].reduce((acc, cur) => acc + cur.total, 0);
      }
      document.getElementById('totalMes').innerText = formatter.format(total);
    }

    function limparTabelaDaTela() {
      const tabela = document.getElementById('tabelaHistorico');
      while (tabela.rows.length > 1) tabela.deleteRow(1);
    }

    const modal = document.getElementById('modalHistorico');
    const conteudoHistorico = document.getElementById('conteudoHistorico');
    const btnFecharModal = document.getElementById('btnFecharModal');
    const containerBotoes = document.getElementById('containerBotoes');

    btnFecharModal.onclick = () => {
      modal.style.display = 'none';
    };

    function mostrarHistoricoPorMes() {
      historico = JSON.parse(localStorage.getItem('historicoGastos')) || {};
      if (Object.keys(historico).length === 0) {
        conteudoHistorico.innerText = 'Nenhum histórico de gastos encontrado.';
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
        btn.innerText = `Limpar ${mes}`;
        btn.style.backgroundColor = '#d9534f';
        btn.style.color = '#fff';
        btn.style.marginRight = '6px';
        btn.style.marginTop = '10px';
        btn.onclick = () => {
          if (confirm(`Deseja limpar o mês ${mes}?`)) {
            delete historico[mes];
            localStorage.setItem('historicoGastos', JSON.stringify(historico));
            carregarHistoricoMes(mesAnoAtual);
            modal.style.display = 'none';
          }
        };
        containerBotoes.appendChild(btn);
      }

      const btnLimparTudo = document.createElement('button');
      btnLimparTudo.innerText = 'Limpar Tudo';
      btnLimparTudo.style.backgroundColor = '#000';
      btnLimparTudo.style.color = '#fff';
      btnLimparTudo.style.marginTop = '10px';
      btnLimparTudo.onclick = () => {
        if (confirm('Deseja limpar todo o histórico?')) {
          localStorage.removeItem('historicoGastos');
          historico = {};
          carregarHistoricoMes(mesAnoAtual);
          modal.style.display = 'none';
        }
      };
      containerBotoes.appendChild(btnLimparTudo);
    }