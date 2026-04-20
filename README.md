# SuperLista

SuperLista é uma aplicação web leve e responsiva para organizar suas compras, controlar gastos mensais e reaproveitar itens do histórico. 

Este é um projeto de código aberto! Sinta-se à vontade para clonar, estudar e enviar melhorias.

## 🚀 Recursos

- **Lista de compras pendentes**: Adicione itens rapidamente e salve com quantidade e preço.
- **Histórico mensal de gastos**: Visualize compras por mês com totais calculados.
- **Reutilização de itens**: Reaproveite itens do histórico para novas listas.
- **Layout responsivo**: Otimizado para celular, tablet e desktop.
- **Persistência no Firebase**: Dados salvos na nuvem, sincronizados em tempo real.
- **Interface em português**: Totalmente localizada para usuários brasileiros.

## 🛠️ Tecnologias

- **HTML5** e **CSS3** para estrutura e estilos
- **JavaScript ES6+** com módulos
- **Firebase Firestore** para armazenamento de dados
- **Firebase Analytics** para métricas de uso

## 💻 Como executar o projeto localmente

Para garantir a segurança dos dados e permitir que qualquer desenvolvedor contribua, este projeto requer que você configure o seu próprio ambiente do Firebase para testes locais.

### 1. Configuração do seu Firebase

1. Acesse o [Firebase Console](https://console.firebase.google.com/) e crie um novo projeto.
2. No menu lateral, acesse **Firestore Database** e clique em **Criar banco de dados**.
3. Escolha **Iniciar em modo de teste** (apenas para desenvolvimento local).
4. Vá nas configurações do projeto (ícone de engrenagem) e adicione um aplicativo Web `</>` para gerar suas chaves de API.

### 2. Configurando o repositório

1. Clone este repositório em sua máquina:
   `git clone https://github.com/SEU_USUARIO/superlista.git`
2. Navegue até a pasta do projeto:
   `cd superlista`
3. Na pasta `js/` (ou onde estiver sua configuração), localize o arquivo `firebase-config.example.js`.
4. Crie uma cópia desse arquivo e renomeie para `firebase-config.js` (este arquivo está no `.gitignore` e não subirá para o repositório).
5. Abra o `firebase-config.js` e cole as chaves do seu projeto Firebase recém-criado.

### 3. Rodando o App

1. Abra o arquivo `index.html` em um navegador moderno (ou use extensões como Live Server no VSCode).
2. A aplicação se conectará automaticamente ao seu Firebase Firestore.

## 🤝 Como contribuir

Contribuições são muito bem-vindas! Se você tem ideias para melhorar o código, a interface ou adicionar novos recursos:

1. Faça um Fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/NovaFuncionalidade`)
3. Faça o commit das suas alterações (`git commit -m 'Adiciona nova funcionalidade X'`)
4. Faça o push para a branch (`git push origin feature/NovaFuncionalidade`)
5. Abra um Pull Request

## 📁 Estrutura do projeto

```text
├── index.html          # Página inicial
├── mode2.html          # Aplicação principal
├── css/
│   └── style.css       # Estilos responsivos
└── js/
    ├── firebase-config.example.js  # Exemplo de configuração pública
    └── mode2.js        # Lógica da aplicação