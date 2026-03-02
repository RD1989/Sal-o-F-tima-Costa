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

    // SERVICE TABS — Filtro de Serviços
    const tabBtns = document.querySelectorAll('.tab-btn');
    const servicoCards = document.querySelectorAll('.servico-card');

    if (tabBtns.length > 0) {
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const cat = btn.dataset.cat;
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                servicoCards.forEach(card => {
                    if (cat === 'todos' || card.dataset.cat === cat) {
                        card.style.display = 'block';
                        setTimeout(() => card.style.opacity = '1', 10);
                    } else {
                        card.style.opacity = '0';
                        setTimeout(() => card.style.display = 'none', 300);
                    }
                });
            });
        });
    }

    // CARROSSEL DE RESULTADOS
    const track = document.getElementById('results-track');
    const dotsContainer = document.getElementById('carousel-dots');
    const prevBtn = document.getElementById('prev-result');
    const nextBtn = document.getElementById('next-result');
    const slides = document.querySelectorAll('.result-item');

    if (track && slides.length > 0) {
        let currentIndex = 0;

        // Criar dots
        if (dotsContainer) {
            slides.forEach((_, i) => {
                const dot = document.createElement('div');
                dot.classList.add('dot');
                if (i === 0) dot.classList.add('active');
                dot.addEventListener('click', () => goToSlide(i));
                dotsContainer.appendChild(dot);
            });
        }

        const dots = document.querySelectorAll('.dot');

        function updateCarousel() {
            track.style.transform = `translateX(-${currentIndex * 100}%)`;
            if (dots.length > 0) {
                dots.forEach((dot, i) => {
                    dot.classList.toggle('active', i === currentIndex);
                });
            }
        }

        function goToSlide(index) {
            currentIndex = index;
            updateCarousel();
        }

        function nextSlide() {
            currentIndex = (currentIndex + 1) % slides.length;
            updateCarousel();
        }

        function prevSlide() {
            currentIndex = (currentIndex - 1 + slides.length) % slides.length;
            updateCarousel();
        }

        if (nextBtn) nextBtn.addEventListener('click', nextSlide);
        if (prevBtn) prevBtn.addEventListener('click', prevSlide);

        // Auto play opcional
        let autoPlay = setInterval(nextSlide, 5000);

        const interactiveElements = [prevBtn, nextBtn, dotsContainer].filter(Boolean);
        interactiveElements.forEach(el => {
            el.addEventListener('mouseenter', () => clearInterval(autoPlay));
            el.addEventListener('mouseleave', () => autoPlay = setInterval(nextSlide, 5000));
        });
    }

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
