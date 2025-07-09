// apiService.js

const RANGE_SUFFIX = '!A:G'; // Range das colunas, a aba será adicionada dinamicamente

/**
 * Busca os nomes de todas as abas (páginas) da planilha.
 * @param {string} spreadsheetId - O ID da planilha do Google Sheets.
 * @param {string} apiKey - A chave da API do Google Sheets.
 * @returns {Promise<string[]>} Uma promessa que resolve com um array de nomes de abas.
 */
export async function fetchSheetNames(spreadsheetId, apiKey) {
    if (!spreadsheetId || !apiKey) {
        throw new Error("ID da Planilha e Chave da API são obrigatórios.");
    }

    try {
        const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${apiKey}`);
        if (!response.ok) {
            throw new Error(`Erro ao buscar nomes das abas: ${response.statusText}`);
        }
        const data = await response.json();
        return data.sheets.map(sheet => sheet.properties.title);
    } catch (error) {
        console.error('Erro ao buscar nomes das abas:', error);
        throw new Error(`Não foi possível carregar as abas da planilha. Verifique suas credenciais e o ID. Detalhe: ${error.message}`);
    }
}

/**
 * Busca os dados de agendamentos da aba atualmente selecionada.
 * @param {string} spreadsheetId - O ID da planilha do Google Sheets.
 * @param {string} apiKey - A chave da API do Google Sheets.
 * @param {string} selectedSheet - O nome da aba selecionada.
 * @returns {Promise<Array<Object>>} Uma promessa que resolve com um array de objetos de agendamento.
 */
export async function fetchAppointments(spreadsheetId, apiKey, selectedSheet) {
    if (!spreadsheetId || !apiKey || !selectedSheet) {
        throw new Error("ID da Planilha, Chave da API e Aba selecionada são obrigatórios.");
    }

    const RANGES = ['A:G', 'G:M', 'M:S']; // Ranges para as três tabelas
    const rangesQuery = RANGES.map(r => `ranges='${selectedSheet}'!${r}`).join('&');

    try {
        const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${rangesQuery}&key=${apiKey}`);
        if (!response.ok) {
            throw new Error(`Erro na API do Google Sheets: ${response.statusText}`);
        }
        const data = await response.json();
        return processAppointmentData(data.valueRanges);
    } catch (error) {
        console.error('Erro ao buscar agendamentos:', error);
        throw new Error(`Erro ao carregar agendamentos: ${error.message}. Verifique o ID, a chave, o nome da aba e o range.`);
    }
}

/**
 * Processa os dados brutos da API do Google Sheets em um formato utilizável.
 * @param {Array<Object>} valueRanges - Os ranges de valores retornados pela API.
 * @returns {Array<Object>} Um array de objetos de agendamento.
 */
function processAppointmentData(valueRanges) {
    const allAppointments = [];

    if (!valueRanges || valueRanges.length === 0) {
        return [];
    }

    for (const valueRange of valueRanges) {
        const values = valueRange.values;

        if (!values || values.length === 0) {
            continue;
        }

        let currentDate = '';

        for (const row of values) {
            if (!row || row.length === 0 || (row.length === 1 && row[0] === '')) continue;

            if (row.length === 2 && row[0] === '' && row[1] && (row[1].includes('/') || row[1].includes('-'))) {
                const dateMatch = row[1].match(/\d{2}[\/\-]\d{2}(?:[\/\-]\d{4})?/);
                if (dateMatch) {
                    let [day, month, year] = dateMatch[0].split(/[\/\-]/);
                    if (!year) year = new Date().getFullYear();
                    currentDate = `${day}/${month}/${year}`;
                }
                continue;
            }

            if (row.length >= 6 && row[1] === 'Horário' && row[2] === 'Paciente') continue;

            if (row.length >= 6 && row[1] && row[2] && currentDate) {
                const normalizedTime = normalizeTime(row[1]);
                if (normalizedTime) {
                    allAppointments.push({
                        time: `${currentDate} ${normalizedTime}`,
                        patient: row[2] || '',
                        contact: row[3] || '',
                        procedure: row[4] || '',
                        professional: row[5] || '',
                        status: row[6] || ''
                    });
                }
            }
        }
    }
    return allAppointments;
}

/**
 * Normaliza uma string de tempo para o formato HH:mm.
 * @param {string} timeStr - A string de tempo a ser normalizada.
 * @returns {string|null} O tempo normalizado ou null se não puder ser normalizado.
 */
function normalizeTime(timeStr) {
    if (!timeStr) return null;
    let str = String(timeStr).toLowerCase().trim().replace(/\s/g, '');
    if (str.match(/^\d{1,2}h$/)) str = str.replace('h', ':00');
    if (str.match(/^\d{1,2}h\d{2}$/)) str = str.replace('h', ':');
    if (str.includes(';')) str = str.replace(';', ':');
    if (str.match(/^\d{1,2}:\d{2}$/)) str = str.padStart(5, '0');
    return str.match(/^\d{2}:\d{2}$/) ? str : null;
}
