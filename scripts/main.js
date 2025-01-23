// Markdown zu HTML Konverter
document.addEventListener('DOMContentLoaded', function() {
    console.log('Script geladen!'); // Debug-Ausgabe
    
    // Konfetti-Effekt
    const celebrateBtn = document.getElementById('celebrateBtn');
    if (celebrateBtn) {
        console.log('Button gefunden!');
        
        celebrateBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Konfetti-Effekt mit mehreren Salven
            const count = 200;
            const defaults = {
                origin: { y: 0.7 }
            };

            function fire(particleRatio, opts) {
                confetti({
                    ...defaults,
                    ...opts,
                    particleCount: Math.floor(count * particleRatio),
                    scalar: 1.2,
                    spread: 70,
                    startVelocity: 30,
                    gravity: 1,
                    ticks: 300,
                    colors: ['#5B8772', '#FFB86B', '#3E5A4C', '#4A7261']
                });
            }

            fire(0.25, {
                spread: 26,
                startVelocity: 55,
                angle: 125
            });

            fire(0.2, {
                spread: 60,
                angle: 90
            });

            fire(0.25, {
                spread: 26,
                startVelocity: 55,
                angle: 55
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