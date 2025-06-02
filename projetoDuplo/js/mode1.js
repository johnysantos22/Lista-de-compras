let ultimoPDF = null;

document.addEventListener("DOMContentLoaded", () => {
  if (localStorage.getItem("itens")) {
    const dadosSalvos = JSON.parse(localStorage.getItem("itens"));
    dadosSalvos.forEach(item => inserirNaTabela(item));
    atualizarTotalGeral();
  }
});

let listaItens = JSON.parse(localStorage.getItem("itens")) || [];

function formatarBRL(valor) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function adicionarItem() {
  const item = document.getElementById("item").value.trim();
  const quantidade = parseInt(document.getElementById("quantidade").value);
  const preco = parseFloat(document.getElementById("preco").value);

  if (!item || isNaN(quantidade) || isNaN(preco)) {
    alert("Preencha todos os campos corretamente.");
    return;
  }

  const novoItem = { item, quantidade, preco };
  listaItens.push(novoItem);
  localStorage.setItem("itens", JSON.stringify(listaItens));

  inserirNaTabela(novoItem);
  atualizarTotalGeral();

  document.getElementById("item").value = "";
  document.getElementById("quantidade").value = "";
  document.getElementById("preco").value = "";
}

function inserirNaTabela({ item, quantidade, preco }) {
  const tabela = document.getElementById("tabela");
  const row = tabela.insertRow();

  const cellItem = row.insertCell(0);
  const cellQtd = row.insertCell(1);
  const cellPreco = row.insertCell(2);
  const cellTotal = row.insertCell(3);
  const cellAcao = row.insertCell(4);

  cellItem.innerText = item;
  cellQtd.innerText = quantidade;
  cellPreco.innerText = formatarBRL(preco);
  cellTotal.innerText = formatarBRL(quantidade * preco);

  const btnRemover = document.createElement("button");
  btnRemover.innerText = "Remover";
  btnRemover.onclick = () => {
    row.remove();
    listaItens = listaItens.filter(i => !(i.item === item && i.quantidade === quantidade && i.preco === preco));
    localStorage.setItem("itens", JSON.stringify(listaItens));
    atualizarTotalGeral();
  };
  cellAcao.appendChild(btnRemover);
}

function atualizarTotalGeral() {
  const total = listaItens.reduce((soma, { quantidade, preco }) => soma + quantidade * preco, 0);
  document.getElementById("totalGeral").innerText = formatarBRL(total);
}

function limparTudo() {
  if (confirm("Tem certeza que deseja limpar todos os dados?")) {
    localStorage.removeItem("itens");
    listaItens = [];
    const tabela = document.getElementById("tabela");
    while (tabela.rows.length > 1) {
      tabela.deleteRow(1);
    }
    atualizarTotalGeral();
    document.getElementById("previewFrame").style.display = "none";
    ultimoPDF = null;
  }
}

function visualizarPDF() {
  const doc = new jspdf.jsPDF();

  const headers = [["Item", "Quantidade", "Preço", "Total"]];
  const dados = listaItens.map(({ item, quantidade, preco }) => [
    item,
    quantidade,
    preco.toLocaleString("pt-BR", { minimumFractionDigits: 2 }),
    (quantidade * preco).toLocaleString("pt-BR", { minimumFractionDigits: 2 })
  ]);

  const totalGeral = listaItens.reduce((acc, { quantidade, preco }) => acc + quantidade * preco, 0);

  doc.setFontSize(18);
  doc.text("Orçamento", 105, 20, { align: "center" }); // Centralizado

  doc.autoTable({
    startY: 30,
    head: headers,
    body: dados,
  });

  doc.text(`Total Geral: R$ ${totalGeral.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, 14, doc.lastAutoTable.finalY + 10);

  ultimoPDF = doc;

  const blobUrl = doc.output("bloburl");
  const iframe = document.getElementById("previewFrame");
  iframe.src = blobUrl;
  iframe.style.display = "block";
}

function salvarPDF() {
  if (ultimoPDF) {
    ultimoPDF.save("orcamento.pdf");
  } else {
    alert("Visualize o PDF antes de salvar.");
  }
}
