const fs = require('fs-extra');
const path = require('path');
const marked = require('marked');
const frontMatter = require('front-matter');

// Konfiguriere die Verzeichnisse
const contentDir = 'content';
const postsDir = path.join(contentDir, 'posts');
const outputDir = 'docs';
const templatesDir = 'templates';

// Funktion zur Formatierung des Datums
function formatDate(date) {
    const d = new Date(date);
    const weekdays = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    const weekday = weekdays[d.getDay()];
    return `(${weekday}, ${day}.${month}.${year})`;
}

// Lade Header und Footer Templates
async function loadTemplates() {
    const header = await fs.readFile(path.join(templatesDir, 'header.html'), 'utf-8');
    const footer = await fs.readFile(path.join(templatesDir, 'footer.html'), 'utf-8');
    return { header, footer };
}

// Funktion zum Generieren des Standard-HTML Templates
async function generateHtml(content, attributes = {}, blogPosts = []) {
    const { header, footer } = await loadTemplates();
    
    const finalHeader = header
        .replace('${title}', attributes.title || 'Meine Website')
        .replace('${stylePrefix}', '')
        .replace(/\${prefix}/g, '');
        
    const finalFooter = footer
        .replace(/\${scriptPrefix}/g, '');

    // Füge die neuesten Blog-Posts zur Startseite hinzu
    let latestPosts = '';
    if (attributes.isHome && blogPosts.length > 0) {
        latestPosts = `
        <section class="latest-posts">
            <h2>Neueste Blog-Posts</h2>
            <ul>
                ${blogPosts
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .slice(0, 5)
                    .map(post => `<li><a href="${post.url}">${post.title}</a> ${formatDate(post.date)}</li>`)
                    .join('\n')}
            </ul>
        </section>`;
        content = content + latestPosts;
    }

    return finalHeader + `
    <main>
        <div class="content">
            ${content}
        </div>
    </main>
    ` + finalFooter;
}

// Funktion zum Generieren des Blog-Post HTML
async function generateBlogPostHtml(content, attributes = {}) {
    const { header, footer } = await loadTemplates();
    const blogTemplate = await fs.readFile(path.join(templatesDir, 'blog-post.html'), 'utf-8');
    
    const finalHeader = header
        .replace('${title}', attributes.title || 'Blog Post')
        .replace('${stylePrefix}', '../')
        .replace(/\${prefix}/g, '../');
        
    const finalFooter = footer
        .replace(/\${scriptPrefix}/g, '../');

    // Füge das Datum nach der ersten Überschrift ein
    const date = attributes.date || new Date().toISOString().split('T')[0];
    const contentWithDate = content.replace(/^(# .+)$/m, `$1\n\n${date}`);

    return blogTemplate
        .replace('${header}', finalHeader)
        .replace('${footer}', finalFooter)
        .replace('${content}', contentWithDate);
}

// Funktion zum Scannen des Posts-Verzeichnisses und Generieren der Blog-Liste
async function generateBlogList() {
    const postsDir = path.join(contentDir, 'posts');
    const files = await fs.readdir(postsDir);
    const posts = [];

    for (const file of files) {
        if (file.endsWith('.md')) {
            const content = await fs.readFile(path.join(postsDir, file), 'utf-8');
            const { attributes } = frontMatter(content);
            
            posts.push({
                title: attributes.title || file.replace('.md', ''),
                date: attributes.date || new Date().toISOString(),
                url: `posts/${file.replace('.md', '.html')}`
            });
        }
    }

    // Sortiere Posts nach Datum (neueste zuerst)
    return posts.sort((a, b) => new Date(b.date) - new Date(a.date));
}

// Aktualisiere die Blog-Übersichtsseite
async function updateBlogIndex() {
    const blogIndexPath = path.join(contentDir, 'blog.md');
    if (await fs.pathExists(blogIndexPath)) {
        let blogContent = await fs.readFile(blogIndexPath, 'utf-8');
        const { attributes, body } = frontMatter(blogContent);
        
        // Hole alle Blog-Posts
        const blogPosts = await generateBlogList();
        
        // Generiere die Liste der Blog-Posts
        const postsList = `<section class="latest-posts">
            <h2>Neueste Blog-Posts</h2>
            <ul>
                ${blogPosts
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .map(post => `<li><a href="${post.url}">${post.title}</a> ${formatDate(post.date)}</li>`)
                    .join('\n')}
            </ul>
        </section>`;

        // Aktualisiere den Content
        // Suche nach dem vorhandenen latest-posts section und ersetze sie
        let updatedContent;
        if (body.includes('<section class="latest-posts">')) {
            updatedContent = body.replace(
                /<section class="latest-posts">[\s\S]*?<\/section>/,
                postsList
            );
        } else {
            // Wenn keine section existiert, füge sie nach der ersten Überschrift ein
            updatedContent = body.replace(
                /^(# .+\n\n)/m,
                `$1${postsList}\n\n`
            );
        }

        // Erstelle den vollständigen Inhalt mit Front Matter
        const fullContent = `---\ntitle: ${attributes.title || 'Blog'}\ndate: ${new Date().toISOString()}\n---\n\n${updatedContent}`;
        
        // Speichere die aktualisierte Markdown-Datei
        await fs.writeFile(blogIndexPath, fullContent);
        
        // Generiere die HTML-Version
        const html = marked.parse(updatedContent);
        const finalHtml = await generateHtml(html, attributes);
        const outputPath = path.join(outputDir, 'blog.html');
        await fs.writeFile(outputPath, finalHtml);
    }
}

async function buildSite() {
    // Lösche alle HTML-Dateien im docs-Ordner
    await fs.emptyDir(outputDir);
    
    // Kopiere statische Assets (CSS, JS, Bilder etc.)
    await fs.copy(path.join(__dirname, 'styles'), path.join(outputDir, 'styles'));
    await fs.copy(path.join(__dirname, 'scripts'), path.join(outputDir, 'scripts'));
    
    // Generiere alle Seiten neu
    await generatePages();
    await generateBlogPosts();
    await updateBlogIndex();
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

    // Sammle zuerst alle Blog-Posts
    const blogPosts = [];
    if (await fs.pathExists(postsDir)) {
        const posts = await fs.readdir(postsDir);
        for (const post of posts) {
            if (path.extname(post) === '.md') {
                const content = await fs.readFile(path.join(postsDir, post), 'utf-8');
                const { attributes } = frontMatter(content);
                blogPosts.push({
                    title: attributes.title,
                    date: attributes.date,
                    url: `posts/${post.replace('.md', '.html')}`
                });
            }
        }
    }

    // Verarbeite Hauptseiten
    const files = await fs.readdir(contentDir);
    for (const file of files) {
        if (path.extname(file) === '.md') {
            const content = await fs.readFile(path.join(contentDir, file), 'utf-8');
            const { attributes, body } = frontMatter(content);
            const html = marked.parse(body);

            // Prüfe, ob es sich um die Startseite handelt
            const isHome = file === 'index.md';
            attributes.isHome = isHome;

            // Erstelle HTML mit Template
            const finalHtml = await generateHtml(html, attributes, blogPosts);
            
            // Speichere die HTML-Datei
            const outputPath = path.join(outputDir, file.replace('.md', '.html'));
            await fs.writeFile(outputPath, finalHtml);
        }
    }

    // Verarbeite Blog-Posts
    if (await fs.pathExists(postsDir)) {
        const posts = await fs.readdir(postsDir);

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
            }
        }

        // Aktualisiere die Blog-Übersichtsseite
        await updateBlogIndex();
    }

    console.log('Build erfolgreich abgeschlossen!');
}

// Führe Build aus
build().catch(console.error);