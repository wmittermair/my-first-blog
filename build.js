const fs = require('fs-extra');
const path = require('path');
const marked = require('marked');
const frontMatter = require('front-matter');

// Konfiguriere die Verzeichnisse
const contentDir = 'content';
const outputDir = 'dist';

// Funktion zum Generieren des HTML Templates
function generateHtml(content, attributes = {}) {
    return `
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${attributes.title || 'Meine Website'}</title>
    <link rel="stylesheet" href="styles/main.css">
    <script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.2/dist/confetti.browser.min.js"></script>
</head>
<body>
    <header>
        <nav>
            <ul>
                <li><a href="index.html">Home</a></li>
                <li><a href="blog.html">Blog</a></li>
                <li><a href="about.html">Über mich</a></li>
                <li><a href="faq.html">FAQ</a></li>
                <li>
                    <button id="celebrateBtn" class="celebrate-btn">
                        🎉
                        <span class="fallback-text">Feiern!</span>
                    </button>
                </li>
            </ul>
        </nav>
    </header>

    <main>
        <div class="content">
            ${content}
        </div>
    </main>

    <footer>
        <p>&copy; 2024 Ihre Website</p>
    </footer>

    <script src="scripts/main.js"></script>
</body>
</html>
`;}

// Erstelle Build-Funktion
async function build() {
    // Stelle sicher, dass die Verzeichnisse existieren
    await fs.ensureDir(contentDir);
    await fs.ensureDir(outputDir);

    // Kopiere statische Assets
    if (await fs.pathExists('styles')) {
        await fs.copy('styles', path.join(outputDir, 'styles'));
    }
    if (await fs.pathExists('scripts')) {
        await fs.copy('scripts', path.join(outputDir, 'scripts'));
    }

    // Verarbeite Markdown-Dateien
    const files = await fs.readdir(contentDir);
    for (const file of files) {
        if (path.extname(file) === '.md') {
            const content = await fs.readFile(path.join(contentDir, file), 'utf-8');
            const { attributes, body } = frontMatter(content);
            const html = marked.parse(body);

            // Erstelle HTML mit Template
            const finalHtml = generateHtml(html, attributes);
            
            // Speichere die HTML-Datei
            const outputPath = path.join(outputDir, file.replace('.md', '.html'));
            await fs.writeFile(outputPath, finalHtml);
        }
    }

    console.log('Build erfolgreich abgeschlossen!');
}

// Führe Build aus
build().catch(console.error);