/* ============================================================
   SALÃO FÁTIMA COSTA — MÓDULO DE AGENDAMENTO
   Fluxo Multi-Step: 6 passos + Integração WhatsApp
   ============================================================ */

(function () {
    'use strict';

    // ===== DADOS DOS SERVIÇOS (Fallback local — substituído pela API) =====
    const DADOS = {
        categorias: [
            { id: 'coloracao', nome: 'Coloração', emoji: '🎨', desc: 'Loiro, luzes, mechas...' },
            { id: 'corte', nome: 'Cortes', emoji: '✂️', desc: 'Design de cortes premium' },
            { id: 'noiva', nome: 'Dia da Noiva', emoji: '👰', desc: 'Penteados e make' },
            { id: 'escova', nome: 'Escova & Finalização', emoji: '💨', desc: 'Acabamento perfeito' },
            { id: 'tratamento', nome: 'Tratamentos', emoji: '✨', desc: 'Hidratação e nutrição' },
            { id: 'sobrancelha', nome: 'Sobrancelha & Maquiagem', emoji: '🖌️', desc: 'Realce do olhar' },
        ],
        servicos: {
            coloracao: [
                { id: 1, nome: 'Loiro Platinado', duracao: '240min', preco: 'A consultar' },
                { id: 2, nome: 'Mechas / Luzes', duracao: '180min', preco: 'A partir de R$ 180' },
                { id: 3, nome: 'Coloração completa', duracao: '90min', preco: 'A partir de R$ 120' },
                { id: 4, nome: 'Balayage', duracao: '210min', preco: 'A consultar' },
                { id: 5, nome: 'Retoque de raiz', duracao: '60min', preco: 'A partir de R$ 80' },
            ],
            corte: [
                { id: 6, nome: 'Corte feminino', duracao: '60min', preco: 'A partir de R$ 70' },
                { id: 7, nome: 'Corte + Escova', duracao: '90min', preco: 'A partir de R$ 110' },
                { id: 8, nome: 'Franja', duracao: '20min', preco: 'R$ 30' },
            ],
            noiva: [
                { id: 9, nome: 'Penteado Noiva', duracao: '120min', preco: 'A consultar' },
                { id: 10, nome: 'Pacote Dia da Noiva', duracao: '360min', preco: 'A consultar' },
                { id: 11, nome: 'Teste de Penteado', duracao: '90min', preco: 'A consultar' },
            ],
            escova: [
                { id: 12, nome: 'Escova Tradicional', duracao: '60min', preco: 'A partir de R$ 60' },
                { id: 13, nome: 'Escova Progressiva', duracao: '180min', preco: 'A partir de R$ 200' },
                { id: 14, nome: 'Finalização', duracao: '45min', preco: 'A partir de R$ 50' },
            ],
            tratamento: [
                { id: 15, nome: 'Hidratação Intensiva', duracao: '60min', preco: 'A partir de R$ 80' },
                { id: 16, nome: 'Cronograma Capilar', duracao: '120min', preco: 'A partir de R$ 150' },
                { id: 17, nome: 'Nutrição com Botox', duracao: '120min', preco: 'A partir de R$ 180' },
            ],
            sobrancelha: [
                { id: 18, nome: 'Design de Sobrancelha', duracao: '30min', preco: 'R$ 25' },
                { id: 19, nome: 'Maquiagem Social', duracao: '60min', preco: 'A partir de R$ 80' },
                { id: 20, nome: 'Maquiagem de Festa', duracao: '90min', preco: 'A partir de R$ 120' },
            ],
        },
        profissionais: [
            { id: 0, nome: 'Qualquer disponível', especialidade: 'Primeiro disponível', inicial: '★' },
            { id: 1, nome: 'Fátima Costa', especialidade: 'Colorimetria & Noivas', inicial: 'FC' },
            { id: 2, nome: 'Profissional 2', especialidade: 'Cortes & Escova', inicial: 'P2' },
            { id: 3, nome: 'Profissional 3', especialidade: 'Tratamentos', inicial: 'P3' },
        ],
        horarios: ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'],
    };

    // ===== ESTADO DO AGENDAMENTO =====
    let state = {
        passoAtual: 1,
        totalPassos: 5,
        categoriaId: null,
        servico: null,
        profissional: null,
        data: null,
        hora: null,
        cliente: { nome: '', telefone: '' },
    };

    let calData = {
        ano: new Date().getFullYear(),
        mes: new Date().getMonth(),
    };

    // ===== REFERÊNCIAS DOM =====
    let overlay, modal, progressFill;

    // ===== INICIALIZAÇÃO =====
    function init() {
        criarModal();
        overlay = document.getElementById('agendamento-overlay');
        modal = document.getElementById('agendamento-modal');
        progressFill = document.querySelector('.progress-line-fill');

        document.getElementById('modal-close').addEventListener('click', fechar);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) fechar(); });
        document.getElementById('btn-voltar').addEventListener('click', voltarPasso);
        document.getElementById('btn-avancar').addEventListener('click', avancarPasso);
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fechar(); });
    }

    // ===== CRIAR ESTRUTURA HTML DO MODAL =====
    function criarModal() {
        const html = `
        <div id="agendamento-overlay" class="agendamento-overlay" role="dialog" aria-modal="true" aria-label="Agendamento online">
          <div id="agendamento-modal" class="agendamento-modal">
            <div class="modal-header">
              <div class="modal-header-info">
                <h3>Agendar Horário</h3>
                <p>Salão Fátima Costa · Itaperuna</p>
              </div>
              <button id="modal-close" class="modal-close" aria-label="Fechar"><i class="fas fa-times"></i></button>
            </div>

            <div class="modal-progress">
              <div class="progress-steps">
                <div class="progress-line"><div class="progress-line-fill" style="width:0%"></div></div>
                ${[1, 2, 3, 4, 5].map(n => `<div class="step-dot" id="step-dot-${n}" data-step="${n}"><span>${n}</span></div>`).join('')}
              </div>
              <p class="progress-label">Passo <strong id="passo-atual-label">1</strong> de 5</p>
            </div>

            <div class="modal-body">
              <!-- PASSO 1: CATEGORIA -->
              <div class="step-panel active" id="passo-1">
                <h3 class="step-title">Qual serviço deseja?</h3>
                <p class="step-subtitle">Escolha a categoria para ver os serviços disponíveis</p>
                <div class="opcoes-grid" id="grid-categorias"></div>
              </div>

              <!-- PASSO 2: SERVIÇO -->
              <div class="step-panel" id="passo-2">
                <h3 class="step-title">Escolha o serviço</h3>
                <p class="step-subtitle">Serviços disponíveis na categoria selecionada</p>
                <div class="servicos-lista" id="lista-servicos"></div>
              </div>

              <!-- PASSO 3: PROFISSIONAL -->
              <div class="step-panel" id="passo-3">
                <h3 class="step-title">Escolha a profissional</h3>
                <p class="step-subtitle">Selecione com quem deseja ser atendida</p>
                <div class="profissionais-grid" id="grid-profissionais"></div>
              </div>

              <!-- PASSO 4: DATA E HORA -->
              <div class="step-panel" id="passo-4">
                <h3 class="step-title">Escolha a data e hora</h3>
                <p class="step-subtitle">Selecione um dia disponível no calendário</p>
                <div class="calendario-container">
                  <div class="calendario-header">
                    <button class="cal-nav" id="cal-prev" aria-label="Mês anterior"><i class="fas fa-chevron-left"></i></button>
                    <h4 id="cal-titulo"></h4>
                    <button class="cal-nav" id="cal-next" aria-label="Próximo mês"><i class="fas fa-chevron-right"></i></button>
                  </div>
                  <div class="calendario-grid" id="calendario-grid"></div>
                  <div id="horarios-wrap" style="display:none;">
                    <p class="step-subtitle" style="margin-bottom:0.75rem;">Horários disponíveis:</p>
                    <div class="horarios-grid" id="horarios-grid"></div>
                  </div>
                </div>
              </div>

              <!-- PASSO 5: DADOS DO CLIENTE -->
              <div class="step-panel" id="passo-5">
                <h3 class="step-title">Seus dados</h3>
                <p class="step-subtitle">Precisamos apenas do seu nome e WhatsApp para confirmar</p>
                <div class="form-group">
                  <label for="cliente-nome">Seu nome completo</label>
                  <input type="text" id="cliente-nome" placeholder="Ex: Maria da Silva" autocomplete="name">
                </div>
                <div class="form-group">
                  <label for="cliente-telefone">WhatsApp (somente números)</label>
                  <input type="tel" id="cliente-telefone" placeholder="Ex: 22999998888" inputmode="numeric" maxlength="15">
                </div>
                <div class="resumo-card" id="resumo-rapido"></div>
              </div>

              <!-- PASSO SUCESSO -->
              <div class="step-panel" id="passo-sucesso">
                <div class="sucesso-container">
                  <div class="sucesso-icon"><i class="fas fa-check"></i></div>
                  <h3>Solicitação enviada!</h3>
                  <p>Seu agendamento foi registrado com sucesso.<br>Clique abaixo para confirmar pelo WhatsApp e garantir seu horário.</p>
                  <a id="wpp-link-confirmar" href="#" target="_blank" class="btn-wpp-confirmar">
                    <i class="fab fa-whatsapp"></i> Confirmar pelo WhatsApp
                  </a>
                </div>
              </div>
            </div>

            <div class="modal-footer">
              <button id="btn-voltar" class="btn-voltar" disabled><i class="fas fa-arrow-left"></i> Voltar</button>
              <button id="btn-avancar" class="btn-avancar">Continuar <i class="fas fa-arrow-right"></i></button>
            </div>
          </div>
        </div>`;

        const wrapper = document.createElement('div');
        wrapper.innerHTML = html;
        document.body.appendChild(wrapper.firstElementChild);
    }

    // ===== ABRIR / FECHAR =====
    function abrir(servicoIdPreSelecionado) {
        resetarEstado();
        renderPasso(1);
        document.getElementById('agendamento-overlay').classList.add('active');
        document.body.style.overflow = 'hidden';

        if (servicoIdPreSelecionado) {
            // Localiza o serviço e pré-seleciona categoria
            for (const [catId, servs] of Object.entries(DADOS.servicos)) {
                const serv = servs.find(s => String(s.id) === String(servicoIdPreSelecionado));
                if (serv) {
                    state.categoriaId = catId;
                    state.servico = serv;
                    irParaPasso(3);
                    break;
                }
            }
        }
    }

    function fechar() {
        document.getElementById('agendamento-overlay').classList.remove('active');
        document.body.style.overflow = '';
    }

    function resetarEstado() {
        state = { passoAtual: 1, totalPassos: 5, categoriaId: null, servico: null, profissional: null, data: null, hora: null, cliente: { nome: '', telefone: '' } };
        calData = { ano: new Date().getFullYear(), mes: new Date().getMonth() };
    }

    // ===== NAVEGAÇÃO =====
    function avancarPasso() {
        if (!validarPassoAtual()) return;

        if (state.passoAtual === 5) {
            submeterAgendamento();
            return;
        }
        irParaPasso(state.passoAtual + 1);
    }

    function voltarPasso() {
        if (state.passoAtual > 1) irParaPasso(state.passoAtual - 1);
    }

    function irParaPasso(novoPasso) {
        document.getElementById(`passo-${state.passoAtual}`).classList.remove('active');
        state.passoAtual = novoPasso;
        renderPasso(novoPasso);
        document.getElementById(`passo-${novoPasso}`).classList.add('active');
        atualizarProgress();
    }

    function atualizarProgress() {
        const pct = ((state.passoAtual - 1) / (state.totalPassos - 1)) * 100;
        document.querySelector('.progress-line-fill').style.width = pct + '%';
        document.getElementById('passo-atual-label').textContent = state.passoAtual;

        for (let i = 1; i <= state.totalPassos; i++) {
            const dot = document.getElementById(`step-dot-${i}`);
            if (!dot) continue;
            dot.className = 'step-dot';
            if (i < state.passoAtual) dot.classList.add('done');
            else if (i === state.passoAtual) dot.classList.add('active');
        }

        const btnVoltar = document.getElementById('btn-voltar');
        const btnAvancar = document.getElementById('btn-avancar');
        btnVoltar.disabled = state.passoAtual === 1;

        if (state.passoAtual === 5) {
            btnAvancar.innerHTML = 'Confirmar <i class="fas fa-check"></i>';
        } else {
            btnAvancar.innerHTML = 'Continuar <i class="fas fa-arrow-right"></i>';
        }
    }

    // ===== VALIDAÇÃO POR PASSO =====
    function validarPassoAtual() {
        switch (state.passoAtual) {
            case 1: if (!state.categoriaId) { alertaModal('Selecione uma categoria'); return false; } break;
            case 2: if (!state.servico) { alertaModal('Selecione um serviço'); return false; } break;
            case 3: if (state.profissional === null) { alertaModal('Selecione uma profissional'); return false; } break;
            case 4:
                if (!state.data) { alertaModal('Selecione uma data'); return false; }
                if (!state.hora) { alertaModal('Selecione um horário'); return false; }
                break;
            case 5:
                state.cliente.nome = document.getElementById('cliente-nome').value.trim();
                state.cliente.telefone = document.getElementById('cliente-telefone').value.replace(/\D/g, '');
                if (!state.cliente.nome) { alertaModal('Informe seu nome'); return false; }
                if (state.cliente.telefone.length < 10) { alertaModal('Informe um WhatsApp válido'); return false; }
                break;
        }
        return true;
    }

    function alertaModal(msg) {
        const btn = document.getElementById('btn-avancar');
        const original = btn.innerHTML;
        btn.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${msg}`;
        btn.style.background = '#8B3A1A';
        setTimeout(() => { btn.innerHTML = original; btn.style.background = ''; }, 2000);
    }

    // ===== RENDERIZAÇÃO POR PASSO =====
    function renderPasso(passo) {
        switch (passo) {
            case 1: renderCategorias(); break;
            case 2: renderServicos(); break;
            case 3: renderProfissionais(); break;
            case 4: renderCalendario(); break;
            case 5: renderResumo(); break;
        }
    }

    function renderCategorias() {
        const grid = document.getElementById('grid-categorias');
        grid.innerHTML = DADOS.categorias.map(cat => `
            <div class="opcao-card ${state.categoriaId === cat.id ? 'selected' : ''}" data-id="${cat.id}">
                <span class="opcao-icon">${cat.emoji}</span>
                <div class="opcao-nome">${cat.nome}</div>
                <div class="opcao-desc">${cat.desc}</div>
            </div>
        `).join('');

        grid.querySelectorAll('.opcao-card').forEach(card => {
            card.addEventListener('click', () => {
                state.categoriaId = card.dataset.id;
                state.servico = null; // reset ao mudar categoria
                grid.querySelectorAll('.opcao-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
            });
        });
    }

    function renderServicos() {
        const lista = document.getElementById('lista-servicos');
        const servicos = DADOS.servicos[state.categoriaId] || [];
        lista.innerHTML = servicos.map(serv => `
            <div class="servico-item-select ${state.servico && state.servico.id === serv.id ? 'selected' : ''}" data-id="${serv.id}">
                <div class="servico-item-info">
                    <h4>${serv.nome}</h4>
                    <span><i class="far fa-clock"></i> ${serv.duracao}</span>
                </div>
                <div class="servico-item-preco">${serv.preco}</div>
            </div>
        `).join('');

        lista.querySelectorAll('.servico-item-select').forEach(item => {
            item.addEventListener('click', () => {
                const id = parseInt(item.dataset.id);
                state.servico = DADOS.servicos[state.categoriaId].find(s => s.id === id);
                lista.querySelectorAll('.servico-item-select').forEach(i => i.classList.remove('selected'));
                item.classList.add('selected');
            });
        });
    }

    function renderProfissionais() {
        const grid = document.getElementById('grid-profissionais');
        grid.innerHTML = DADOS.profissionais.map(prof => `
            <div class="profissional-card ${state.profissional !== null && state.profissional.id === prof.id ? 'selected' : ''}" data-id="${prof.id}">
                <div class="prof-avatar">${prof.inicial}</div>
                <div class="prof-nome">${prof.nome}</div>
                <div class="prof-especialidade">${prof.especialidade}</div>
            </div>
        `).join('');

        grid.querySelectorAll('.profissional-card').forEach(card => {
            card.addEventListener('click', () => {
                const id = parseInt(card.dataset.id);
                state.profissional = DADOS.profissionais.find(p => p.id === id);
                grid.querySelectorAll('.profissional-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
            });
        });
    }

    function renderCalendario() {
        const titulo = document.getElementById('cal-titulo');
        const grid = document.getElementById('calendario-grid');

        const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        const nomes = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        titulo.textContent = `${meses[calData.mes]} ${calData.ano}`;

        const hoje = new Date();
        const primeiroDia = new Date(calData.ano, calData.mes, 1).getDay();
        const totalDias = new Date(calData.ano, calData.mes + 1, 0).getDate();

        let html = nomes.map(n => `<div class="cal-day-name">${n}</div>`).join('');
        for (let i = 0; i < primeiroDia; i++) html += `<div class="cal-day empty"></div>`;

        for (let d = 1; d <= totalDias; d++) {
            const dateObj = new Date(calData.ano, calData.mes, d);
            const isPast = dateObj < new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
            const isHoje = d === hoje.getDate() && calData.mes === hoje.getMonth() && calData.ano === hoje.getFullYear();
            const isDomingo = dateObj.getDay() === 0;
            const dateStr = `${calData.ano}-${String(calData.mes + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const isSelected = state.data === dateStr;

            let classes = 'cal-day';
            if (isPast || isDomingo) classes += ' past';
            else classes += ' available';
            if (isHoje) classes += ' today';
            if (isSelected) classes += ' selected';

            html += `<div class="${classes}" data-date="${dateStr}">${d}</div>`;
        }

        grid.innerHTML = html;

        grid.querySelectorAll('.cal-day.available').forEach(day => {
            day.addEventListener('click', () => {
                state.data = day.dataset.date;
                state.hora = null;
                grid.querySelectorAll('.cal-day').forEach(d => d.classList.remove('selected'));
                day.classList.add('selected');
                renderHorarios();
            });
        });

        document.getElementById('cal-prev').onclick = () => {
            if (calData.mes === 0) { calData.mes = 11; calData.ano--; }
            else calData.mes--;
            renderCalendario();
        };

        document.getElementById('cal-next').onclick = () => {
            if (calData.mes === 11) { calData.mes = 0; calData.ano++; }
            else calData.mes++;
            renderCalendario();
        };

        if (state.data) renderHorarios();
    }

    function renderHorarios() {
        const wrap = document.getElementById('horarios-wrap');
        const grid = document.getElementById('horarios-grid');
        wrap.style.display = 'block';

        // Simula horários já ocupados (backend real consultaria a API)
        const ocupados = ['10:00', '11:30', '14:00'];

        grid.innerHTML = DADOS.horarios.map(h => {
            const isOcupado = ocupados.includes(h);
            const isSelected = state.hora === h;
            return `<button class="horario-btn ${isOcupado ? 'ocupado' : ''} ${isSelected ? 'selected' : ''}"
                data-hora="${h}" ${isOcupado ? 'disabled' : ''}>${h}</button>`;
        }).join('');

        grid.querySelectorAll('.horario-btn:not(.ocupado)').forEach(btn => {
            btn.addEventListener('click', () => {
                state.hora = btn.dataset.hora;
                grid.querySelectorAll('.horario-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
            });
        });
    }

    function renderResumo() {
        const resumo = document.getElementById('resumo-rapido');
        const profNome = state.profissional && state.profissional.id !== 0 ? state.profissional.nome : 'Qualquer disponível';
        const dataFormatada = state.data ? formatarData(state.data) : '—';

        resumo.innerHTML = `
            <h4>Resumo do agendamento</h4>
            <div class="resumo-linha"><span class="label">Serviço</span><span class="valor">${state.servico ? state.servico.nome : '—'}</span></div>
            <div class="resumo-linha"><span class="label">Profissional</span><span class="valor">${profNome}</span></div>
            <div class="resumo-linha"><span class="label">Data</span><span class="valor">${dataFormatada}</span></div>
            <div class="resumo-linha"><span class="label">Horário</span><span class="valor">${state.hora || '—'}</span></div>
        `;
    }

    // ===== SUBMISSÃO =====
    async function submeterAgendamento() {
        const btnAvancar = document.getElementById('btn-avancar');
        btnAvancar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
        btnAvancar.disabled = true;

        const payload = {
            cliente_nome: state.cliente.nome,
            cliente_telefone: state.cliente.telefone,
            servico_id: state.servico.id,
            profissional_id: state.profissional ? state.profissional.id : 0,
            data_hora: `${state.data}T${state.hora}:00`,
        };

        try {
            // Tenta enviar para a API local
            const resp = await fetch('api/appointments.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!resp.ok) throw new Error('API indisponível');
            const result = await resp.json();
            if (!result.success) throw new Error(result.message || 'Erro no servidor');

        } catch (e) {
            // Fallback: gera link WhatsApp mesmo sem API
            console.warn('API não disponível. Usando fallback WhatsApp.', e.message);
        }

        // Gera link WhatsApp de confirmação (funciona com ou sem API)
        const wppLink = gerarLinkWhatsApp();
        document.getElementById('wpp-link-confirmar').href = wppLink;

        // Esconde passos e mostra sucesso
        document.querySelectorAll('.step-panel').forEach(p => p.classList.remove('active'));
        document.getElementById('passo-sucesso').classList.add('active');
        document.getElementById('modal-footer') && (document.getElementById('modal-footer').style.display = 'none');
        document.querySelector('.modal-footer').style.display = 'none';
        document.querySelector('.modal-progress').style.display = 'none';
    }

    // ===== GERAÇÃO DE LINK WHATSAPP =====
    function gerarLinkWhatsApp() {
        const SALAO_WHATSAPP = '5522999999999'; // Número do salão
        const dataFormatada = formatarData(state.data);
        const servNome = state.servico ? state.servico.nome : 'Serviço';

        const mensagem = `Olá ${state.cliente.nome}! Aqui é do *Salão Fátima Costa*. ✨\n\nConfirmando seu agendamento para *${servNome}* no dia *${dataFormatada}* às *${state.hora}*.\n\n_Podemos confirmar?_ 💆‍♀️`;
        const encoded = encodeURIComponent(mensagem);

        // Link para o NÚMERO DO CLIENTE (salão manda para o cliente)
        return `https://wa.me/55${state.cliente.telefone}?text=${encoded}`;
    }

    // ===== UTILITÁRIOS =====
    function formatarData(dateStr) {
        if (!dateStr) return '—';
        const [ano, mes, dia] = dateStr.split('-');
        const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const d = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
        return `${diasSemana[d.getDay()]}, ${dia}/${mes}/${ano}`;
    }

    // ===== API PÚBLICA =====
    window.AgendamentoApp = { abrir, fechar };

    // Inicializa após o DOM estar pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
