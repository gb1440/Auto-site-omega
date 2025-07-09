// script.js

document.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add('no-scroll'); // Garante que o body não rola inicialmente

    // Elementos da UI
    const appointmentsContainer = document.getElementById('appointmentsContainer');
    const calendarContainer = document.getElementById('calendarContainer');
    const loginScreen = document.getElementById('loginScreen');
    const mainPanelScreen = document.getElementById('mainPanelScreen');

    // Inputs e Botões de Login
    const spreadsheetIdInput = document.getElementById('spreadsheetIdInput');
    const apiKeyInput = document.getElementById('apiKeyInput');
    const enterPanelButton = document.getElementById('enterPanelButton');
    const saveLoginCredentialsButton = document.getElementById('saveLoginCredentialsButton');
    const clearCredentialsButton = document.getElementById('clearCredentials');

    // Filtros e Botões do Painel
    const sheetSelector = document.getElementById('sheetSelector');
    const searchPatientInput = document.getElementById('searchPatient');
    const filterProfessionalSelect = document.getElementById('filterProfessional');
    const filterDateInput = document.getElementById('filterDate');
    const filterProcedureSelect = document.getElementById('filterProcedure');
    const filterPaidCheckbox = document.getElementById('filterPaidCheckbox');
    const toggleFiltersButton = document.getElementById('toggleFiltersButton');
    const filterContainer = document.getElementById('filterContainer');
    const clearFiltersButton = document.getElementById('clearFilters'); // Botão Sair
    const toggleViewButton = document.getElementById('toggleViewButton');
    const reloadDataButton = document.getElementById('reloadData');
    const saveCredentialsButton = document.getElementById('saveCredentials');
    const logoTitle = document.getElementById('logoTitle');

    const RANGE_SUFFIX = '!A:G'; // Range das colunas, a aba será adicionada dinamicamente
    let allAppointments = []; // Armazena todos os agendamentos da aba selecionada
    let calendar = null; // Armazena a instância do FullCalendar
    let isCalendarRendered = false; // Controla se o calendário já foi renderizado pela primeira vez

    // --- LÓGICA DE INICIALIZAÇÃO ---

    function initializeApp() {
        loadCredentials();
        const savedSpreadsheetId = localStorage.getItem('spreadsheetId');
        const savedApiKey = localStorage.getItem('apiKey');

        if (savedSpreadsheetId && savedApiKey) {
            spreadsheetIdInput.value = savedSpreadsheetId;
            apiKeyInput.value = savedApiKey;
            showMainPanel();
        } else {
            showLoginScreen();
        }
    }

    function showLoginScreen() {
        loginScreen.style.display = 'flex';
        mainPanelScreen.style.display = 'none';
        document.body.classList.add('no-scroll');
    }

    async function showMainPanel() {
        loginScreen.style.display = 'none';
        mainPanelScreen.style.display = 'flex';
        document.body.classList.remove('no-scroll');
        initializeCalendar(); // Inicializa o calendário na primeira vez que o painel é exibido
        await fetchSheetNames(); // Busca os nomes das abas primeiro
        await fetchAppointments(); // Depois busca os agendamentos da aba padrão
    }

    // --- FUNÇÕES DA API DO GOOGLE SHEETS ---

    /**
     * Busca os nomes de todas as abas (páginas) da planilha.
     */
    async function fetchSheetNames() {
        const SPREADSHEET_ID = spreadsheetIdInput.value;
        const API_KEY = apiKeyInput.value;

        if (!SPREADSHEET_ID || !API_KEY) return;

        try {
            const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}?key=${API_KEY}`);
            if (!response.ok) {
                throw new Error(`Erro ao buscar nomes das abas: ${response.statusText}`);
            }
            const data = await response.json();
            const sheetTitles = data.sheets.map(sheet => sheet.properties.title);
            populateSheetSelector(sheetTitles);
        } catch (error) {
            console.error('Erro ao buscar nomes das abas:', error);
            alert(`Não foi possível carregar as abas da planilha. Verifique suas credenciais e o ID. Detalhe: ${error.message}`);
        }
    }

    /**
     * Busca os dados de agendamentos da aba atualmente selecionada.
     */
    async function fetchAppointments() {
        const SPREADSHEET_ID = spreadsheetIdInput.value;
        const API_KEY = apiKeyInput.value;
        const selectedSheet = sheetSelector.value;

        if (!SPREADSHEET_ID || !API_KEY || !selectedSheet) {
            appointmentsContainer.innerHTML = '<p class="text-center text-red-500">Por favor, insira o ID da Planilha, a Chave da API e selecione uma aba.</p>';
            return;
        }

        const RANGE = `'${selectedSheet}'${RANGE_SUFFIX}`;
        appointmentsContainer.innerHTML = '<p class="text-center text-gray-500">Carregando agendamentos...</p>';

        try {
            const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${RANGE}?key=${API_KEY}`);
            if (!response.ok) {
                throw new Error(`Erro na API do Google Sheets: ${response.statusText}`);
            }
            const data = await response.json();
            processAppointmentData(data.values);
        } catch (error) {
            console.error('Erro ao buscar agendamentos:', error);
            appointmentsContainer.innerHTML = `<p class="text-center text-red-500">Erro ao carregar agendamentos: ${error.message}. Verifique o ID, a chave, o nome da aba e o range.</p>`;
        }
    }

    // --- PROCESSAMENTO E EXIBIÇÃO DE DADOS ---

    function processAppointmentData(values) {
        allAppointments = [];
        let currentDate = '';

        if (!values || values.length === 0) {
            appointmentsContainer.innerHTML = '<p class="text-center text-gray-500">Nenhum dado encontrado na aba selecionada.</p>';
            return;
        }

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

        if (allAppointments.length > 0) {
            displayAppointments(allAppointments);
            populateFilters(allAppointments);
            updateCalendarEvents(allAppointments);
        } else {
            appointmentsContainer.innerHTML = '<p class="text-center text-gray-500">Nenhum agendamento válido encontrado após processamento.</p>';
            updateCalendarEvents([]); // Limpa o calendário se não houver eventos
        }
    }

    function displayAppointments(appointmentsToDisplay) {
        appointmentsContainer.innerHTML = '';

        if (appointmentsToDisplay.length === 0) {
            appointmentsContainer.innerHTML = '<p class="text-center text-gray-500">Nenhum agendamento corresponde aos critérios de busca/filtro.</p>';
            return;
        }

        const groupedByDay = appointmentsToDisplay.reduce((acc, app) => {
            if (!app.time || typeof app.time !== 'string' || app.time.trim() === '') return acc;
            const [datePart] = app.time.split(' ');
            if (!datePart) return acc;
            const [day, month, year] = datePart.split('/');
            if (!day || !month || !year) return acc;
            const dateKey = `${year}-${month}-${day}`;
            if (!acc[dateKey]) acc[dateKey] = [];
            acc[dateKey].push(app);
            return acc;
        }, {});

        const sortedDays = Object.keys(groupedByDay).sort((a, b) => new Date(a) - new Date(b));

        sortedDays.forEach(dateKey => {
            const dayAppointments = groupedByDay[dateKey];
            dayAppointments.sort((a, b) => (a.time.split(' ')[1] || '').localeCompare(b.time.split(' ')[1] || ''));

            const [year, month, day] = dateKey.split('-');
            const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
            const formattedDate = date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

            const daySection = document.createElement('div');
            daySection.className = 'mb-8 relative';
            daySection.innerHTML = `
                <h2 class="text-2xl font-semibold text-purple-main mb-4 capitalize flex items-center">
                    <i class="fas fa-calendar-alt mr-3 text-pink-accent"></i> ${formattedDate}
                </h2>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    ${dayAppointments.map(app => {
                        const isPaid = app.status?.toLowerCase() === 'pago';
                        const isPending = app.status?.toLowerCase() === 'pendente';
                        const statusBadgeClass = isPaid ? 'bg-green-500' : (isPending ? 'bg-yellow-500' : 'bg-gray-400');
                        const statusBadgeText = isPaid ? 'Pago' : (isPending ? 'Pendente' : (app.status || 'Não Informado'));
                        const cleanPhoneNumber = formatPhoneNumberForLinks(app.contact);

                        return `
                            <div class="card group p-6 flex flex-col justify-between overflow-hidden">
                                <div>
                                    <p class="text-xl font-semibold text-purple-main mb-2 flex items-center">
                                        <i class="far fa-clock mr-2 text-pink-accent"></i> ${app.time.split(' ')[1]}
                                    </p>
                                    <div class="flex items-center mb-2">
                                        <p class="text-client-name mr-2">${app.patient}</p>
                                        <span class="text-xs font-bold px-2 py-1 rounded-full text-white ${statusBadgeClass}">${statusBadgeText}</span>
                                    </div>
                                    <p class="text-gray-700 mb-1"><i class="fas fa-hand-sparkles mr-2 text-pink-accent"></i> ${app.procedure}</p>
                                    <p class="text-gray-700 mb-1"><i class="fas fa-phone-alt mr-2 text-pink-accent"></i> ${app.contact}</p>
                                    <p class="text-gray-700"><i class="fas fa-user-tie mr-2 text-pink-accent"></i> Prof: ${app.professional}</p>
                                </div>
                                <div class="mt-4 pt-4 border-t border-gray-200 flex items-center justify-end space-x-2 opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                                    <a href="tel:${cleanPhoneNumber}" target="_blank" class="h-10 w-10 flex items-center justify-center rounded-full text-purple-500 hover:bg-purple-100 transition-colors tooltip" data-tooltip="Ligar para ${app.contact}">
                                        <i class="fas fa-phone-alt fa-xl"></i>
                                    </a>
                                    <a href="https://wa.me/${cleanPhoneNumber}?text=Olá, ${app.patient}! Sobre o seu agendamento..." target="_blank" rel="noopener noreferrer" class="h-10 w-10 flex items-center justify-center rounded-full text-green-500 hover:bg-green-100 transition-colors tooltip" data-tooltip="WhatsApp: ${app.contact}">
                                        <i class="fab fa-whatsapp fa-xl"></i>
                                    </a>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
                <div class="border-b-2 border-gray-200 my-8"></div>
            `;
            appointmentsContainer.appendChild(daySection);
        });
    }

    // --- FILTROS E EVENTOS ---

    function applyFilters() {
        const searchTerm = searchPatientInput.value.toLowerCase();
        const selectedProfessional = filterProfessionalSelect.value;
        const selectedDate = filterDateInput.value;
        const selectedProcedure = filterProcedureSelect.value;
        const filterPaid = filterPaidCheckbox.checked;

        const filteredAppointments = allAppointments.filter(app => {
            const [appDatePart] = app.time.split(' ');
            const [day, month, year] = appDatePart.split('/');
            const formattedAppDate = `${year}-${month}-${day}`;

            return (app.patient.toLowerCase().includes(searchTerm) || app.contact.includes(searchTerm)) &&
                   (selectedProfessional === '' || app.professional === selectedProfessional) &&
                   (selectedDate === '' || formattedAppDate === selectedDate) &&
                   (selectedProcedure === '' || app.procedure === selectedProcedure) &&
                   (!filterPaid || app.status?.toLowerCase() === 'pago');
        });
        displayAppointments(filteredAppointments);
    }

    function populateSheetSelector(sheetNames) {
        sheetSelector.innerHTML = '';
        sheetNames.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            sheetSelector.appendChild(option);
        });
    }

    function populateFilters(appointments) {
        populateSelectWithOptions(filterProfessionalSelect, appointments, 'professional', 'Todos os Profissionais');
        populateSelectWithOptions(filterProcedureSelect, appointments, 'procedure', 'Todos os Atendimentos');
    }

    function populateSelectWithOptions(selectElement, data, property, defaultOptionText) {
        const uniqueValues = [...new Set(data.map(item => item[property]).filter(Boolean))].sort();
        selectElement.innerHTML = `<option value="">${defaultOptionText}</option>`;
        uniqueValues.forEach(value => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value;
            selectElement.appendChild(option);
        });
    }

    // --- FUNÇÕES AUXILIARES E CREDENCIAIS ---

    function formatPhoneNumberForLinks(phoneStr) {
        if (!phoneStr) return '';
        // Remove todos os caracteres que não são dígitos
        let cleaned = phoneStr.replace(/\D/g, '');

        // Se o número tiver 10 ou 11 dígitos (DDD + Número), adiciona o código do Brasil (55)
        if (cleaned.length === 10 || cleaned.length === 11) {
            cleaned = '55' + cleaned;
        }
        // Retorna o número limpo, pronto para ser usado em links `tel:` ou `https://wa.me/`
        return cleaned;
    }

    function normalizeTime(timeStr) {
        if (!timeStr) return null;
        let str = String(timeStr).toLowerCase().trim().replace(/\s/g, '');
        if (str.match(/^\d{1,2}h$/)) str = str.replace('h', ':00');
        if (str.match(/^\d{1,2}h\d{2}$/)) str = str.replace('h', ':');
        if (str.includes(';')) str = str.replace(';', ':');
        if (str.match(/^\d{1,2}:\d{2}$/)) str = str.padStart(5, '0');
        return str.match(/^\d{2}:\d{2}$/) ? str : null;
    }

    function loadCredentials() {
        spreadsheetIdInput.value = localStorage.getItem('spreadsheetId') || '';
        apiKeyInput.value = localStorage.getItem('apiKey') || '';
    }

    function saveCredentials() {
        const id = spreadsheetIdInput.value;
        const key = apiKeyInput.value;
        if (id && key) {
            localStorage.setItem('spreadsheetId', id);
            localStorage.setItem('apiKey', key);
            alert('Credenciais salvas com sucesso!');
        } else {
            alert('Por favor, preencha o ID da Planilha e a Chave da API para salvar.');
        }
    }

    function clearCredentialsAndLogout() {
        localStorage.removeItem('spreadsheetId');
        localStorage.removeItem('apiKey');
        spreadsheetIdInput.value = '';
        apiKeyInput.value = '';
        allAppointments = [];
        sheetSelector.innerHTML = '';
        filterProfessionalSelect.innerHTML = '<option value="">Todos os Profissionais</option>';
        filterProcedureSelect.innerHTML = '<option value="">Todos os Atendimentos</option>';
        showLoginScreen();
    }

    // --- EVENT LISTENERS ---

    enterPanelButton.addEventListener('click', showMainPanel);
    saveLoginCredentialsButton.addEventListener('click', saveCredentials);
    clearCredentialsButton.addEventListener('click', () => {
        clearCredentialsAndLogout();
        alert('Credenciais limpas!');
    });

    sheetSelector.addEventListener('change', fetchAppointments);
    reloadDataButton.addEventListener('click', fetchAppointments);
    saveCredentialsButton.addEventListener('click', saveCredentials);
    clearFiltersButton.addEventListener('click', clearCredentialsAndLogout); // Botão Sair

    [searchPatientInput, filterDateInput].forEach(el => el.addEventListener('input', applyFilters));
    [filterProfessionalSelect, filterProcedureSelect, filterPaidCheckbox].forEach(el => el.addEventListener('change', applyFilters));

    logoTitle.addEventListener('click', () => {
        // Recarrega a página inteira.
        location.reload();
    });

    toggleFiltersButton.addEventListener('click', () => filterContainer.classList.toggle('hidden'));
    toggleViewButton.addEventListener('click', () => {
        calendarContainer.classList.toggle('hidden');
        appointmentsContainer.classList.toggle('hidden');
        const isCalendarVisible = !calendarContainer.classList.contains('hidden');

        if (isCalendarVisible) {
            if (!isCalendarRendered) {
                calendar.render();
                isCalendarRendered = true;
            }
            calendar.updateSize();
            toggleViewButton.setAttribute('data-tooltip', 'Ver Lista');
        } else {
            toggleViewButton.setAttribute('data-tooltip', 'Ver Calendário');
        }
    });

    // --- FUNÇÕES DO CALENDÁRIO ---
    function initializeCalendar() {
        if (calendar) return; // Não inicializa duas vezes

        calendar = new FullCalendar.Calendar(calendarContainer, {
            locale: 'pt-br',
            initialView: 'dayGridMonth',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
            },
            events: [], // Começa vazio
            eventClick: function(info) {
                const event = info.event;
                const props = event.extendedProps;
                alert(
                    `Cliente: ${event.title}\n` +
                    `Horário: ${event.start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}\n` +
                    `Procedimento: ${props.procedure}\n` +
                    `Profissional: ${props.professional}\n` +
                    `Status: ${props.status}`
                );
            }
        });
    }

    function updateCalendarEvents(appointments) {
        if (!calendar) return;

        const events = appointments.map(app => {
            const [datePart, timePart] = app.time.split(' ');
            const [day, month, year] = datePart.split('/');
            const isoDateTime = `${year}-${month}-${day}T${timePart}`;

            return {
                title: app.patient,
                start: isoDateTime,
                extendedProps: {
                    procedure: app.procedure,
                    professional: app.professional,
                    status: app.status,
                    contact: app.contact
                },
                // Muda a cor do evento com base no status
                backgroundColor: app.status?.toLowerCase() === 'pago' ? '#10B981' : (app.status?.toLowerCase() === 'pendente' ? '#F59E0B' : '#6B7280'),
                borderColor: app.status?.toLowerCase() === 'pago' ? '#10B981' : (app.status?.toLowerCase() === 'pendente' ? '#F59E0B' : '#6B7280')
            };
        });

        calendar.getEventSources().forEach(source => source.remove()); // Remove a fonte de eventos antiga
        calendar.addEventSource(events); // Adiciona a nova fonte
    }

    // --- INICIALIZAÇÃO ---
    initializeApp();
});