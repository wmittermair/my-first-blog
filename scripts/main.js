// Markdown zu HTML Konverter
document.addEventListener('DOMContentLoaded', function() {
    console.log('Script geladen!'); // Debug-Ausgabe
    
    const celebrateBtn = document.getElementById('celebrateBtn');
    
    if (celebrateBtn) {
        console.log('Button gefunden!');
        
        celebrateBtn.addEventListener('click', function() {
            console.log('Button geklickt!');
            
            // Konfetti-Effekt mit der canvas-confetti Bibliothek
            confetti({
                particleCount: 200,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#5B8772', '#FFB86B', '#3E5A4C', '#4A7261'],
                startVelocity: 30,
                gravity: 1.2,
                scalar: 1.2,
                ticks: 300
            });
        });
    }

    // Markdown-Logik nur ausführen, wenn ein content-div existiert
    const contentDiv = document.getElementById('content');
    if (contentDiv) {
        const path = window.location.pathname;
        const page = path.split('/').pop().replace('.html', '');
        
        fetch(`content/${page}.md`)
            .then(response => response.text())
            .then(markdown => {
                const html = marked.parse(markdown);
                contentDiv.innerHTML = html;
            })
            .catch(console.error);
    }
}); 