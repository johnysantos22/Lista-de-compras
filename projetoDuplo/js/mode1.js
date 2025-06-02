// Variável para armazenar o PDF gerado
let ultimoPDF = null;

// Recupera dados ao carregar a página
document.addEventListener("DOMContentLoaded", () => {
  if (localStorage.getItem("itens")) {
    const dadosSalvos = JSON.parse(localStorage.getItem("itens"));
    dadosSalvos.forEach(item => inserirNaTabela(item));
    atualizarTotalGeral();
  }
});

let listaItens = JSON.parse(localStorage.getItem("itens")) || [];

// Função para formatar valores em moeda BRL
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

  // Limpa inputs
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
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(18);

  const pageWidth = doc.internal.pageSize.getWidth();
  const texto = "Orçamento";
  const textoWidth = doc.getTextWidth(texto);
  const x = (pageWidth - textoWidth) / 2;
  doc.text(texto, x, 20);

  const headers = [["Item", "Quantidade", "Preço (R$)", "Total (R$)"]];
  const dados = listaItens.map(({ item, quantidade, preco }) => [
    item,
    quantidade.toString(),
    formatarBRL(preco),
    formatarBRL(quantidade * preco),
  ]);

  const totalGeral = listaItens.reduce((soma, { quantidade, preco }) => soma + quantidade * preco, 0);

  doc.autoTable({
    head: headers,
    body: dados,
    startY: 30,
    theme: 'grid',
    styles: {
      halign: 'center',
      valign: 'middle',
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontSize: 12,
    },
    bodyStyles: {
      fontSize: 11,
    },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { cellWidth: 30 },
      2: { cellWidth: 40 },
      3: { cellWidth: 40 },
    }
  });

  doc.text(`Total Geral: ${formatarBRL(totalGeral)}`, 14, doc.lastAutoTable.finalY + 10);

  // Armazena para salvar depois
  ultimoPDF = doc;

  // Gera o blob e mostra no iframe
  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);
  const frame = document.getElementById("previewFrame");
  frame.src = `${url}#toolbar=0&navpanes=0&scrollbar=0&zoom=100`;
  frame.style.display = "block";
}
