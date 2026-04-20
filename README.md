# 🛒 SuperLista

O **SuperLista** é uma aplicação web leve e totalmente responsiva, desenvolvida para simplificar a organização das suas compras. Com foco na usabilidade e no controle financeiro prático, a ferramenta permite gerenciar itens pendentes, acompanhar os gastos mensais e reaproveitar históricos de compras de forma rápida e inteligente.

> 💡 **Este é um projeto de código aberto!** Sinta-se à vontade para clonar, estudar a estrutura e enviar pull requests com melhorias.

---

### 🛠️ Tecnologias Utilizadas

Projeto construído com base em tecnologias web nativas, integrado com banco de dados em nuvem.

![HTML5](https://img.shields.io/badge/html5-%23E34F26.svg?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/css3-%231572B6.svg?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E)
![Firebase](https://img.shields.io/badge/firebase-a08021?style=for-the-badge&logo=firebase&logoColor=ffcd34)

---

### ✨ Principais Recursos

* 📝 **Gestão de Compras:** Adicione itens informando quantidade e preço, mantendo o controle visual do que ainda está pendente.
* 📊 **Controle Financeiro:** Histórico detalhado de gastos organizados mensalmente para facilitar o fechamento do orçamento.
* ♻️ **Reaproveitamento Inteligente:** Reutilização rápida de itens já registrados no histórico, poupando tempo na montagem de novas listas.
* 📱 **Design Responsivo:** Layout fluido e moderno, perfeitamente adaptado para oferecer a melhor experiência em celulares, tablets e desktops.
* ☁️ **Persistência na Nuvem:** Seus dados são salvos com segurança no Firebase Firestore, permitindo acesso de qualquer dispositivo.

---

### 📂 Estrutura do Projeto

A arquitetura do projeto foi dividida de forma clara para separar a marcação, o estilo e a lógica de negócios:

```text
├── index.html                  # Página inicial e porta de entrada
├── mode2.html                  # Interface principal da lista de compras
├── css/
│   └── style.css               # Estilização global e responsividade
└── js/
    ├── firebase-config.example.js  # Exemplo de chaves para devs
    └── mode2.js                # Lógica de negócios e persistência
