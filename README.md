# PainelEstética

Um painel web visual e elegante para gerenciar agendamentos de clínicas de estética, conectando-se a uma planilha do Google Sheets.

## Funcionalidades

- Conexão com Google Sheets API para carregar dados de agendamentos.
- Exibição de agendamentos agrupados por dia e horário.
- Busca por nome do paciente.
- Filtro por nome do profissional.
- Ícone de status dinâmico.
- Design responsivo para dispositivos móveis e tablets.
- **Salvar e Carregar Credenciais (ID da Planilha e Chave da API) no navegador.**

## Configuração da Google Sheets API

Para que o PainelEstética funcione, você precisa configurar o acesso à Google Sheets API e obter uma chave de API e o ID da sua planilha.

### 1. Habilitar a Google Sheets API

1.  Acesse o [Google Cloud Console](https://console.cloud.google.com/).
2.  Selecione ou crie um novo projeto.
3.  No menu de navegação, vá para **APIs e Serviços > Biblioteca**.
4.  Procure por "Google Sheets API" e clique em **Ativar**.

### 2. Criar Credenciais (Chave de API)

1.  No Google Cloud Console, vá para **APIs e Serviços > Credenciais**.
2.  Clique em **Criar Credenciais > Chave de API**.
3.  Copie a chave de API gerada. **Mantenha esta chave em segurança e restrinja-a para uso apenas com a Google Sheets API e, se possível, para o domínio onde seu painel será hospedado.**

### 3. Obter o ID da Planilha

O ID da planilha é uma longa sequência de caracteres na URL da sua planilha do Google Sheets. Por exemplo, na URL:

`https://docs.google.com/spreadsheets/d/YOUR_SPREADSHEET_ID/edit#gid=0`

`YOUR_SPREADSHEET_ID` é o que você precisa.

### 4. Inserir e Salvar Credenciais no Painel

Agora, você inserirá o ID da Planilha e a Chave da API diretamente nos campos de entrada no próprio painel web. O painel pode salvar essas credenciais no seu navegador para uso futuro.

1.  Abra o arquivo `index.html` em seu navegador.
2.  Você verá os campos de entrada para **"ID da Planilha"** e **"Chave da API"** no cabeçalho.
3.  Cole o ID da sua planilha e a sua chave de API nesses campos.
4.  **Para salvar as credenciais:** Clique no botão **"Salvar Credenciais"**. Elas serão armazenadas no `localStorage` do seu navegador e preenchidas automaticamente na próxima vez que você abrir o painel.
5.  **Para carregar os dados:** Clique no botão **"Recarregar Dados"** para carregar os agendamentos da sua planilha.
6.  **Para limpar as credenciais salvas:** Clique no botão **"Limpar Credenciais"**.

    **Estrutura esperada da planilha (exemplo):**

    | Horário (B) | Paciente (C) | Contato (D) | Atendimento/Procedimento (E) | Profissional (F) | Status (G) |
    |-------------|--------------|-------------|------------------------------|------------------|------------|
    | 10/07/2025 10:00 | Luana Silva  | 85 99632-0103 | Avaliação + Prótese          | Camilly          | Confirmado |
    | 10/07/2025 11:30 | Mariana Costa| 85 98765-4321 | Limpeza de Pele              | Ana Paula        | Pendente   |

    *   **Importante:** A primeira coluna (A) da sua planilha pode estar vazia, mas o script espera que o **Horário** esteja na coluna B, **Paciente** na C, etc., e o **Status** na G.
    *   **Formato do Horário:** Certifique-se de que os horários na sua planilha estejam no formato `HH:mm` (ex: `09:00`, `14:30`). O script tentará normalizar `14h` para `14:00`, mas formatos muito inconsistentes podem ser ignorados.
    *   **Datas:** O script assume o ano atual para as datas. Para datas de anos diferentes, inclua o ano no cabeçalho de dia da sua planilha (ex: `segunda-feira 12/05/2024`).

### 5. Compartilhar a Planilha

Certifique-se de que sua planilha do Google Sheets esteja **pública** ou compartilhada com a conta de serviço associada à sua chave de API (se você estiver usando uma conta de serviço, o que é mais seguro para produção, mas requer configuração adicional). Para este MVP com chave pública, a forma mais simples é torná-la pública para leitura:

1.  Na sua planilha do Google Sheets, clique em **Compartilhar**.
2.  Em "Acesso geral", mude para **Qualquer pessoa com o link**.
3.  Defina a permissão como **Leitor**.

## Como Rodar Localmente

Basta abrir o arquivo `index.html` em seu navegador web.

## Hospedagem

Este projeto pode ser facilmente hospedado em serviços como Netlify, Vercel ou Firebase Hosting, pois é um frontend puro.