const fs = require('fs-extra');
const path = require('path');
const marked = require('marked');
const frontMatter = require('front-matter');

// Konfiguriere die Verzeichnisse
const contentDir = 'content';
const postsDir = path.join(contentDir, 'posts');
const outputDir = 'docs';
const templatesDir = 'templates';

// Funktion zum Generieren des Standard-HTML Templates
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

// Funktion zum Generieren des Blog-Post HTML
async function generateBlogPostHtml(content, attributes = {}) {
    const templatePath = path.join(templatesDir, 'blog-post.html');
    let template = await fs.readFile(templatePath, 'utf-8');
    
    // Ersetze Template-Variablen
    template = template.replace('{{title}}', attributes.title || 'Blog Post');
    template = template.replace('{{date}}', attributes.date || new Date().toISOString().split('T')[0]);
    template = template.replace('{{content}}', content);
    
    return template;
}

// Erstelle Build-Funktion
async function build() {
    // Stelle sicher, dass die Verzeichnisse existieren
    await fs.ensureDir(contentDir);
    await fs.ensureDir(outputDir);
    await fs.ensureDir(postsDir);

    // Kopiere statische Assets
    if (await fs.pathExists('styles')) {
        await fs.copy('styles', path.join(outputDir, 'styles'));
    }
    if (await fs.pathExists('scripts')) {
        await fs.copy('scripts', path.join(outputDir, 'scripts'));
    }

    // Verarbeite Hauptseiten
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

    // Verarbeite Blog-Posts
    if (await fs.pathExists(postsDir)) {
        const posts = await fs.readdir(postsDir);
        const blogPosts = [];

        for (const post of posts) {
            if (path.extname(post) === '.md') {
                const content = await fs.readFile(path.join(postsDir, post), 'utf-8');
                const { attributes, body } = frontMatter(content);
                const html = marked.parse(body);

                // Erstelle HTML mit Blog-Template
                const finalHtml = await generateBlogPostHtml(html, attributes);
                
                // Speichere die HTML-Datei
                const outputPath = path.join(outputDir, 'posts', post.replace('.md', '.html'));
                await fs.ensureDir(path.dirname(outputPath));
                await fs.writeFile(outputPath, finalHtml);

                // Sammle Post-Informationen für die Blog-Übersicht
                blogPosts.push({
                    title: attributes.title,
                    date: attributes.date,
                    url: `posts/${post.replace('.md', '.html')}`
                });
            }
        }

        // Aktualisiere die Blog-Übersichtsseite
        const blogIndexPath = path.join(contentDir, 'blog.md');
        if (await fs.pathExists(blogIndexPath)) {
            let blogContent = await fs.readFile(blogIndexPath, 'utf-8');
            const { attributes, body } = frontMatter(blogContent);
            
            // Füge die Liste der Blog-Posts hinzu
            const postsList = blogPosts
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .map(post => `- [${post.title}](${post.url}) (${post.date})`)
                .join('\n');

            const updatedContent = body.replace(/## Neueste Beiträge\n\n[\s\S]*?(?=\n\n|$)/, 
                `## Neueste Beiträge\n\n${postsList}`);

            await fs.writeFile(blogIndexPath, 
                `---\n${Object.entries(attributes).map(([k, v]) => `${k}: ${v}`).join('\n')}\n---\n\n${updatedContent}`);
        }
    }

    console.log('Build erfolgreich abgeschlossen!');
}

// Führe Build aus
build().catch(console.error);