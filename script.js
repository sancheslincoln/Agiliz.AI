document.addEventListener('DOMContentLoaded', () => {
    // 1. Inicializa os ícones (Lucide)
    lucide.createIcons();

    // 2. Lógica da TELA INICIAL (Splash Screen)
    const splashScreen = document.getElementById('splash-screen');
    const bodyContent = document.getElementById('body-content');

    if (splashScreen) {
        // Aguarda 1.5 segundos (tempo da animação da barra)
        setTimeout(() => {
            // Inicia o fade out
            splashScreen.classList.add('fade-out');
            
            // Libera a rolagem do site que estava bloqueada no CSS (overflow-hidden)
            bodyContent.classList.remove('overflow-hidden');
            
            // Remove o elemento do ecrã depois de ficar invisível (700ms) para libertar memória
            setTimeout(() => {
                splashScreen.style.display = 'none';
            }, 700);
            
        }, 1500); // 1500ms = 1.5 segundos
    }

    // 3. Lógica do Menu Responsivo (Mobile)
    const menuBtn = document.getElementById('menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    const menuIcon = document.getElementById('menu-icon');

    // Função para alternar o estado do menu (Aberto/Fechado)
    function toggleMenu() {
        mobileMenu.classList.toggle('hidden');
        
        // Troca o ícone (Menu Hamburguer <-> Cruz X)
        if (mobileMenu.classList.contains('hidden')) {
            menuIcon.setAttribute('data-lucide', 'menu');
        } else {
            menuIcon.setAttribute('data-lucide', 'x');
        }
        // Recarrega os ícones para aplicar a mudança instantaneamente
        lucide.createIcons(); 
    }

    // Aplica o clique no botão do menu
    if (menuBtn && mobileMenu) {
        menuBtn.addEventListener('click', toggleMenu);
    }

    // Fecha o menu automaticamente quando um link do menu é clicado
    const mobileLinks = document.querySelectorAll('#mobile-menu a');
    mobileLinks.forEach(link => {
        link.addEventListener('click', () => {
            mobileMenu.classList.add('hidden');
            menuIcon.setAttribute('data-lucide', 'menu');
            lucide.createIcons();
        });
    });
});