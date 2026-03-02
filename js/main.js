/* ============================================================
   SALÃO FÁTIMA COSTA — JAVASCRIPT PRINCIPAL
   Smooth Scroll | Sticky Header | Fade-In | FAQ | Menu Mobile
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

    // --- STICKY HEADER ---
    const header = document.getElementById('header');
    const onScroll = () => {
        header.classList.toggle('scrolled', window.scrollY > 60);
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    // --- MENU MOBILE ---
    const menuToggle = document.querySelector('.menu-toggle');
    const nav = document.querySelector('nav');

    if (menuToggle && nav) {
        menuToggle.addEventListener('click', () => {
            nav.classList.toggle('open');
            const isOpen = nav.classList.contains('open');
            menuToggle.querySelectorAll('span')[0].style.transform = isOpen ? 'rotate(45deg) translate(5px, 5px)' : '';
            menuToggle.querySelectorAll('span')[1].style.opacity = isOpen ? '0' : '';
            menuToggle.querySelectorAll('span')[2].style.transform = isOpen ? 'rotate(-45deg) translate(5px, -5px)' : '';
            document.body.style.overflow = isOpen ? 'hidden' : '';
        });

        nav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                nav.classList.remove('open');
                menuToggle.querySelectorAll('span').forEach(s => s.style = '');
                document.body.style.overflow = '';
            });
        });
    }

    // --- SMOOTH SCROLL ---
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', e => {
            const href = anchor.getAttribute('href');
            if (href && href.length > 1) {
                const target = document.querySelector(href);
                if (target) {
                    e.preventDefault();
                    const yOffset = -80;
                    const y = target.getBoundingClientRect().top + window.pageYOffset + yOffset;
                    window.scrollTo({ top: y, behavior: 'smooth' });
                }
            }
        });
    });

    // --- FADE-IN INTERSECTION OBSERVER ---
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12 });

    document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

    // --- FAQ EXPANSÍVEL ---
    document.querySelectorAll('.faq-question').forEach(question => {
        question.addEventListener('click', () => {
            const item = question.closest('.faq-item');
            const isOpen = item.classList.contains('open');

            // Fecha todos
            document.querySelectorAll('.faq-item.open').forEach(openItem => {
                openItem.classList.remove('open');
            });

            // Abre o clicado (se estava fechado)
            if (!isOpen) item.classList.add('open');
        });
    });

    // --- TABS DE SERVIÇOS ---
    const tabBtns = document.querySelectorAll('.tab-btn');
    const servicoCards = document.querySelectorAll('.servico-card');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const categoria = btn.dataset.cat;
            servicoCards.forEach(card => {
                if (categoria === 'todos' || card.dataset.cat === categoria) {
                    card.style.display = '';
                    setTimeout(() => card.classList.add('visible'), 10);
                } else {
                    card.style.display = 'none';
                    card.classList.remove('visible');
                }
            });
        });
    });

    // --- CONTADOR ANIMADO NOS STATS ---
    const counters = document.querySelectorAll('.stat-number[data-count]');
    const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;
                const target = parseInt(el.dataset.count);
                const suffix = el.dataset.suffix || '';
                let count = 0;
                const duration = 1800;
                const increment = target / (duration / 16);

                const update = () => {
                    count = Math.min(count + increment, target);
                    el.textContent = Math.floor(count) + suffix;
                    if (count < target) requestAnimationFrame(update);
                };
                requestAnimationFrame(update);
                counterObserver.unobserve(el);
            }
        });
    }, { threshold: 0.5 });

    counters.forEach(counter => counterObserver.observe(counter));

    // --- ABRIR MODAL DE AGENDAMENTO COM SERVIÇO PRÉ-SELECIONADO ---
    document.querySelectorAll('.servico-btn-agendar').forEach(btn => {
        btn.addEventListener('click', () => {
            const card = btn.closest('.servico-card');
            const servicoId = card ? card.dataset.servicoId : null;
            abrirAgendamento(servicoId);
        });
    });

    document.querySelectorAll('[data-abrir-agendamento]').forEach(el => {
        el.addEventListener('click', () => abrirAgendamento());
    });

});

// Exposta globalmente para uso inline
function abrirAgendamento(servicoIdPreSelecionado) {
    window.AgendamentoApp && window.AgendamentoApp.abrir(servicoIdPreSelecionado);
}
