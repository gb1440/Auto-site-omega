// script.js

document.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add('no-scroll'); // Garante que o body não rola inicialmente

    // Elementos da UI
    const appointmentsContainer = document.getElementById('appointmentsContainer');
    const calendarContainer = document.getElementById('calendarContainer');
    const dashboardScreen = document.getElementById('dashboardScreen');
    const loginScreen = document.getElementById('loginScreen');
    const mainPanelScreen = document.getElementById('mainPanelScreen');
    const toastContainer = document.getElementById('toastContainer');

    // Inputs e Botões de Login
    const spreadsheetIdInput = document.getElementById('spreadsheetIdInput');
    const apiKeyInput = document.getElementById('apiKeyInput');
    const enterPanelButton = document.getElementById('enterPanelButton');
    const saveLoginCredentialsButton = document.getElementById('saveLoginCredentialsButton');

    // Filtros e Botões do Painel
    const sheetSelector = document.getElementById('sheetSelector');
    const searchPatientInput = document.getElementById('searchPatient');
    const filterProfessionalSelect = document.getElementById('filterProfessional');
    const filterDateInput = document.getElementById('filterDate');
    const filterMonthSelect = document.getElementById('filterMonth');
    const filterProcedureSelect = document.getElementById('filterProcedure');
    const filterPaidCheckbox = document.getElementById('filterPaidCheckbox');
    const toggleFiltersButton = document.getElementById('toggleFiltersButton');
    const filterContainer = document.getElementById('filterContainer');
    const logoutButton = document.getElementById('logoutButton');
    const toggleViewButton = document.getElementById('toggleViewButton');
    const reloadDataButton = document.getElementById('reloadData');
    const saveCredentialsButton = document.getElementById('saveCredentials');
    const logoTitle = document.getElementById('logoTitle');
    const showDashboardButton = document.getElementById('showDashboardButton');
    const dashboardStartDateInput = document.getElementById('dashboardStartDate');
    const dashboardEndDateInput = document.getElementById('dashboardEndDate');
    const applyDashboardFiltersButton = document.getElementById('applyDashboardFilters');
    const dashboardResultsContainer = document.getElementById('dashboardResults');
    const dashboardPeriodSelector = document.getElementById('dashboardPeriodSelector');

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
        appointmentsContainer.classList.remove('hidden');
        calendarContainer.classList.add('hidden');
        dashboardScreen.style.display = 'none';
        document.body.classList.remove('no-scroll');
        initializeCalendar();
        await fetchAndProcessAppointments();
    }

    async function showDashboardScreen() {
        loginScreen.style.display = 'none';
        mainPanelScreen.style.display = 'flex';
        appointmentsContainer.style.display = 'none';
        calendarContainer.style.display = 'none';
        dashboardScreen.style.display = 'flex';
        document.body.classList.remove('no-scroll');
        dashboardPeriodSelector.value = 'monthly';
        updateDashboardDates();
        await fetchAndProcessAppointments();
        generateDashboard();
    }

    function updateDashboardDates() {
        const period = dashboardPeriodSelector.value;
        const today = new Date();
        let startDate = new Date();
        let endDate = new Date();

        dashboardStartDateInput.disabled = false;
        dashboardEndDateInput.disabled = false;

        switch (period) {
            case 'weekly':
                startDate.setDate(today.getDate() - 6);
                break;
            case 'monthly':
                startDate.setDate(today.getDate() - 29);
                break;
            case 'yearly':
                startDate = new Date(today.getFullYear(), 0, 1);
                break;
            case 'custom':
                break;
        }

        if (period !== 'custom') {
            dashboardStartDateInput.value = startDate.toISOString().split('T')[0];
            dashboardEndDateInput.value = endDate.toISOString().split('T')[0];
            dashboardStartDateInput.disabled = true;
            dashboardEndDateInput.disabled = true;
        }
    }

    async function fetchAndProcessAppointments() {
        const SPREADSHEET_ID = spreadsheetIdInput.value;
        const API_KEY = apiKeyInput.value;
        const selectedSheet = sheetSelector.value;

        if (!SPREADSHEET_ID || !API_KEY) {
            showToast('Por favor, insira o ID da Planilha e a Chave da API.', 'error');
            return;
        }

        appointmentsContainer.innerHTML = '<p class="text-center text-gray-500">Carregando agendamentos...</p>';

        try {
            const sheetTitles = await fetchSheetNames(SPREADSHEET_ID, API_KEY);
            populateSheetSelector(sheetTitles, sheetSelector);

            const currentSelectedSheet = sheetSelector.value || sheetTitles[0];
            if (!currentSelectedSheet) {
                showToast('Nenhuma aba encontrada na planilha.', 'error');
                return;
            }
            sheetSelector.value = currentSelectedSheet;

            allAppointments = await fetchAppointments(SPREADSHEET_ID, API_KEY, currentSelectedSheet);

            if (allAppointments.length > 0) {
                displayAppointments(allAppointments, appointmentsContainer);
                populateFilters(filterProfessionalSelect, filterProcedureSelect, allAppointments);
                populateMonthFilter(allAppointments);
                updateCalendarEvents(allAppointments);
            } else {
                displayAppointments([], appointmentsContainer);
                updateCalendarEvents([]);
            }
        } catch (error) {
            console.error('Erro ao buscar agendamentos:', error);
            showToast(`Erro ao carregar agendamentos: ${error.message}.`, 'error');
        }
    }

    // --- FILTROS E EVENTOS ---

    function applyFilters() {
        const searchTerm = searchPatientInput.value.toLowerCase();
        const selectedProfessional = filterProfessionalSelect.value;
        const selectedDate = filterDateInput.value;
        const selectedMonth = filterMonthSelect.value;
        const selectedProcedure = filterProcedureSelect.value;
        const filterPaid = filterPaidCheckbox.checked;

        const filteredAppointments = allAppointments.filter(app => {
            const [datePart] = app.time.split(' ');
            const [day, month, year] = datePart.split('/');
            const formattedAppDate = `${year}-${month}-${day}`;
            const appMonthYear = `${month}/${year}`;

            const dateFilter = selectedDate === '' || formattedAppDate === selectedDate;
            const monthFilter = selectedMonth === '' || appMonthYear === selectedMonth;

            return (app.patient.toLowerCase().includes(searchTerm) || app.contact.includes(searchTerm)) &&
                   (selectedProfessional === '' || app.professional === selectedProfessional) &&
                   dateFilter &&
                   monthFilter &&
                   (selectedProcedure === '' || app.procedure === selectedProcedure) &&
                   (!filterPaid || app.status?.toLowerCase() === 'pago');
        });
        displayAppointments(filteredAppointments, appointmentsContainer);
    }

    function populateMonthFilter(appointments) {
        const months = new Set();
        appointments.forEach(app => {
            const [datePart] = app.time.split(' ');
            const [day, month, year] = datePart.split('/');
            if (month && year) {
                months.add(`${month}/${year}`);
            }
        });

        const sortedMonths = Array.from(months).sort((a, b) => {
            const [monthA, yearA] = a.split('/');
            const [monthB, yearB] = b.split('/');
            const dateA = new Date(yearA, monthA - 1);
            const dateB = new Date(yearB, monthB - 1);
            return dateA - dateB;
        });

        filterMonthSelect.innerHTML = '<option value="">Todos os Meses</option>';
        sortedMonths.forEach(monthYear => {
            const [month, year] = monthYear.split('/');
            const date = new Date(year, month - 1);
            const monthName = date.toLocaleString('pt-BR', { month: 'long' });
            const option = document.createElement('option');
            option.value = monthYear;
            option.textContent = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} de ${year}`;
            filterMonthSelect.appendChild(option);
        });
    }

    // --- FUNÇÕES AUXILIARES E CREDENCIAIS ---

    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('show');
        }, 100); // Delay for CSS transition

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000); // Toast visible for 3 seconds
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
            showToast('Credenciais salvas com sucesso!', 'success');
        } else {
            showToast('Por favor, preencha o ID da Planilha e a Chave da API para salvar.', 'error');
        }
    }

    // --- EVENT LISTENERS ---

    enterPanelButton.addEventListener('click', () => { saveCredentials(); showMainPanel(); });
    saveLoginCredentialsButton.addEventListener('click', saveCredentials);

    sheetSelector.addEventListener('change', fetchAndProcessAppointments);
    reloadDataButton.addEventListener('click', fetchAndProcessAppointments);
    saveCredentialsButton.addEventListener('click', saveCredentials);
    logoutButton.addEventListener('click', showLoginScreen);

    [searchPatientInput].forEach(el => el.addEventListener('input', applyFilters));
    [filterProfessionalSelect, filterProcedureSelect, filterPaidCheckbox].forEach(el => el.addEventListener('change', applyFilters));

    filterDateInput.addEventListener('input', () => {
        if (filterDateInput.value !== '') {
            filterMonthSelect.value = '';
        }
        applyFilters();
    });

    filterMonthSelect.addEventListener('change', () => {
        if (filterMonthSelect.value !== '') {
            filterDateInput.value = '';
        }
        applyFilters();
    });

    logoTitle.addEventListener('click', () => {
        location.reload();
    });

    toggleFiltersButton.addEventListener('click', () => filterContainer.classList.toggle('hidden'));
    toggleViewButton.addEventListener('click', () => {
        calendarContainer.classList.toggle('hidden');
        appointmentsContainer.classList.toggle('hidden');
        dashboardScreen.style.display = 'none';
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

    showDashboardButton.addEventListener('click', showDashboardScreen);
    applyDashboardFiltersButton.addEventListener('click', generateDashboard);
    dashboardPeriodSelector.addEventListener('change', () => {
        updateDashboardDates();
        generateDashboard();
    });

    // --- FUNÇÕES DO CALENDÁRIO ---
    function initializeCalendar() {
        if (calendar) return;

        calendar = new FullCalendar.Calendar(calendarContainer, {
            locale: 'pt-br',
            initialView: 'dayGridMonth',
            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay'
            },
            events: [],
            eventClick: function(info) {
                const event = info.event;
                const props = event.extendedProps;
                const message = `Cliente: ${event.title}\n` +
                    `Horário: ${event.start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`+
                    `Procedimento: ${props.procedure}\n` +
                    `Profissional: ${props.professional}\n` +
                    `Status: ${props.status}`;
                showToast(message, 'info');
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
                backgroundColor: app.status?.toLowerCase() === 'pago' ? '#10B981' : (app.status?.toLowerCase() === 'pendente' ? '#F59E0B' : '#6B7280'),
                borderColor: app.status?.toLowerCase() === 'pago' ? '#10B981' : (app.status?.toLowerCase() === 'pendente' ? '#F59E0B' : '#6B7280')
            };
        });

        calendar.getEventSources().forEach(source => source.remove());
        calendar.addEventSource(events);
    }

    // --- FUNÇÕES DO DASHBOARD ---
    function generateDashboard() {
        const startDate = dashboardStartDateInput.value;
        const endDate = dashboardEndDateInput.value;

        if (!startDate || !endDate) {
            showToast('Por favor, selecione as datas de início e fim.', 'error');
            return;
        }

        const filteredAppointments = allAppointments.filter(app => {
            const [datePart] = app.time.split(' ');
            const [day, month, year] = datePart.split('/');
            const appDate = new Date(year, month - 1, day);
            const start = new Date(startDate);
            const end = new Date(endDate);
            return appDate >= start && appDate <= end;
        });

        const professionalCounts = {};
        filteredAppointments.forEach(app => {
            if (app.professional) {
                professionalCounts[app.professional] = (professionalCounts[app.professional] || 0) + 1;
            }
        });

        renderDashboardResults(professionalCounts, dashboardResultsContainer);
    }

    // --- FUNÇÕES DA API DO GOOGLE SHEETS (MOVIDAS DE apiService.js) ---

    const RANGE_SUFFIX = '!A:G';

    async function fetchSheetNames(spreadsheetId, apiKey) {
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

    async function fetchAppointments(spreadsheetId, apiKey, selectedSheet) {
        if (!spreadsheetId || !apiKey || !selectedSheet) {
            throw new Error("ID da Planilha, Chave da API e Aba selecionada são obrigatórios.");
        }

        const RANGES = ['A:G', 'G:M', 'M:S'];
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

    function normalizeTime(timeStr) {
        if (!timeStr) return null;
        let str = String(timeStr).toLowerCase().trim().replace(/\s/g, '');
        if (str.match(/^\d{1,2}h$/)) str = str.replace('h', ':00');
        if (str.match(/^\d{1,2}h\d{2}$/)) str = str.replace('h', ':');
        if (str.includes(';')) str = str.replace(';', ':');
        if (str.match(/^\d{1,2}:\d{2}$/)) str = str.padStart(5, '0');
        return str.match(/^\d{2}:\d{2}$/) ? str : null;
    }

    // --- FUNÇÕES DE UI (MOVIDAS DE uiManager.js) ---

    function displayAppointments(appointmentsToDisplay, container) {
        container.innerHTML = '';

        if (appointmentsToDisplay.length === 0) {
            container.innerHTML = '<p class="text-center text-gray-500">Nenhum agendamento corresponde aos critérios de busca/filtro.</p>';
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
                        const statusBorderClass = isPaid ? 'status-border-paid' : (isPending ? 'status-border-pending' : 'status-border-default');
                        const cleanPhoneNumber = formatPhoneNumberForLinks(app.contact);

                        return `
                            <div class="card ${statusBorderClass} p-6 flex flex-col justify-between overflow-hidden">
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
                                <div class="card-actions mt-4 pt-4 border-t border-gray-200 flex items-center justify-end space-x-2">
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
            container.appendChild(daySection);
        });
    }

    function populateSheetSelector(sheetNames, sheetSelectorElement) {
        sheetSelectorElement.innerHTML = '';
        sheetNames.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            sheetSelectorElement.appendChild(option);
        });
    }

    function populateFilters(professionalSelectElement, procedureSelectElement, appointments) {
        populateSelectWithOptions(professionalSelectElement, appointments, 'professional', 'Todos os Profissionais');
        populateSelectWithOptions(procedureSelectElement, appointments, 'procedure', 'Todos os Atendimentos');
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

    function formatPhoneNumberForLinks(phoneStr) {
        if (!phoneStr) return '';
        let cleaned = phoneStr.replace(/\D/g, '');

        if (cleaned.length === 10 || cleaned.length === 11) {
            cleaned = '55' + cleaned;
        }
        return cleaned;
    }

    function renderDashboardResults(counts, container) {
        container.innerHTML = '';

        if (Object.keys(counts).length === 0) {
            container.innerHTML = '<p class="text-center text-gray-500">Nenhum agendamento encontrado para o período selecionado.</p>';
            return;
        }

        for (const professional in counts) {
            const card = document.createElement('div');
            card.className = 'card p-6 flex flex-col items-center justify-center';
            card.innerHTML = `
                <h3 class="text-xl font-semibold text-purple-main mb-2">${professional}</h3>
                <p class="text-gray-700 text-4xl font-bold">${counts[professional]}</p>
                <p class="text-gray-500">Agendamentos</p>
            `;
            container.appendChild(card);
        }
    }

    // --- INICIALIZAÇÃO ---
    initializeApp();
});
