// uiManager.js

/**
 * Exibe os agendamentos na interface do usuário.
 * @param {Array<Object>} appointmentsToDisplay - Array de objetos de agendamento a serem exibidos.
 * @param {HTMLElement} container - O elemento HTML onde os agendamentos serão renderizados.
 */
export function displayAppointments(appointmentsToDisplay, container) {
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
        container.appendChild(daySection);
    });
}

/**
 * Preenche o seletor de abas com os nomes das abas fornecidos.
 * @param {string[]} sheetNames - Array de nomes de abas.
 * @param {HTMLElement} sheetSelectorElement - O elemento select para as abas.
 */
export function populateSheetSelector(sheetNames, sheetSelectorElement) {
    sheetSelectorElement.innerHTML = '';
    sheetNames.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        sheetSelectorElement.appendChild(option);
    });
}

/**
 * Preenche os seletores de filtro com opções baseadas nos dados dos agendamentos.
 * @param {HTMLElement} professionalSelectElement - O elemento select para profissionais.
 * @param {HTMLElement} procedureSelectElement - O elemento select para procedimentos.
 * @param {Array<Object>} appointments - Array de objetos de agendamento.
 */
export function populateFilters(professionalSelectElement, procedureSelectElement, appointments) {
    populateSelectWithOptions(professionalSelectElement, appointments, 'professional', 'Todos os Profissionais');
    populateSelectWithOptions(procedureSelectElement, appointments, 'procedure', 'Todos os Atendimentos');
}

/**
 * Função auxiliar para preencher um elemento select com opções únicas de uma propriedade.
 * @param {HTMLElement} selectElement - O elemento select a ser preenchido.
 * @param {Array<Object>} data - O array de dados.
 * @param {string} property - A propriedade dos objetos a ser usada para as opções.
 * @param {string} defaultOptionText - O texto da opção padrão.
 */
export function populateSelectWithOptions(selectElement, data, property, defaultOptionText) {
    const uniqueValues = [...new Set(data.map(item => item[property]).filter(Boolean))].sort();
    selectElement.innerHTML = `<option value="">${defaultOptionText}</option>`;
    uniqueValues.forEach(value => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        selectElement.appendChild(option);
    });
}

/**
 * Formata um número de telefone para uso em links tel: ou wa.me.
 * @param {string} phoneStr - A string do número de telefone.
 * @returns {string} O número de telefone formatado.
 */
export function formatPhoneNumberForLinks(phoneStr) {
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

/**
 * Renderiza os resultados do dashboard na interface do usuário.
 * @param {Object} counts - Um objeto com a contagem de agendamentos por profissional.
 * @param {HTMLElement} container - O elemento HTML onde os resultados do dashboard serão renderizados.
 */
export function renderDashboardResults(counts, container) {
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
