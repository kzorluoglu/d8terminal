const config = {
    baseUrl: wpData.baseUrl, // This will be dynamically set to the base URL,
	siteTitle: wpData.siteTitle,
	siteDescription: wpData.siteDescription,
    currentTheme: wpData.currentTheme,
    memoryUsage: wpData.memoryUsage,
    serverSoftware: wpData.serverSoftware,
    ipAddress: wpData.ipAddress,
    requestTime: wpData.requestTime,
};

const history = document.getElementById('history');

document.addEventListener('DOMContentLoaded', (event) => {
    welcomeScreen();
});

async function welcomeScreen() {
	getTitle().then(r => {
        executeCommand('help').then(r => {
            autoExecuteCommandFromURL();
        });
    } );
}

async function autoExecuteCommandFromURL() {
    const pathname = new URL(window.location.href).pathname;

    if (pathname === '/'){
        // Default action if no specific category or post is found in the URL
        await executeCommand('ls');
        return;
    }

    let nameOrSlug = pathname.slice(1);
    if (nameOrSlug.endsWith('/')) {
        nameOrSlug = nameOrSlug.slice(0, -1);
    }

    // Check if it's a category or a post. Any other non-root pathname is considered a post slug
    if (pathname.startsWith('/category/')) {
        const categoryId = await getCategoryIDByName(nameOrSlug.replace('category/', ''));
        await executeCommand(`posts ${categoryId}`);
    } else {
        const postId = await getPostIDBySlug(nameOrSlug);
        await executeCommand(`cat ${postId}`);
    }
}

async function getPostIDBySlug(slug) {
    let response;
    try {
        response = await fetch(`/wp-json/wp/v2/posts?slug=${slug}`);
    } catch (error) {
        console.error('Error while fetching:', error);
        return null;
    }

    let posts;
    try {
        posts = await response.json();
    } catch (error) {
        console.error('Error while parsing response:', error);
        return null;
    }

    if (posts.length > 0) {
        return posts[0].id; // Assuming the first post is the one we want
    } else {
        console.error('Post not found');
        return null;
    }
}

async function executeCommand(command) {
    appendCommandLineToHistory(command);

    const [mainCommand, ...args] = command.split(' ');

    try {
        await executeMainCommand(mainCommand, args);
    } catch (error) {
        await outputError(` ${mainCommand}: An error occurred while executing the command.`);
    } finally {
        await appendCommandInput();
        scrollToBottomOfHistory();
    }
}

async function executeMainCommand(mainCommand, args) {
    switch(mainCommand) {
        case 'ls':
            await listPosts(args[0] || 1, args[1] || 10);
            break;
        case 'cat':
            await viewPost(args[0]);
            break;
        case 'search':
            await searchPosts(args[0]);
            break;
        case 'categories':
            await fetchCategories();
            break;
        case 'posts':
            await listPostsByCategory(args[0]);
            break;
        case 'help':
            await getHelp();
            break;
        default:
            await outputError('Command not recognized');
    }
}

function appendCommandLineToHistory(command, promptSymbol = true) {
    // Include the $ symbol only if promptSymbol is true
    const prompt = promptSymbol ? '$ ' : '';
    history.innerHTML += `<div class="command-line">${prompt}${command}</div>`;
}

function scrollToBottomOfHistory() {
    history.scrollTop = history.scrollHeight;
}


function appendCommandInput() {
	// Remove existing command input line if it exists
    const existingCommandLine = history.querySelector('#commandInput');
    if (existingCommandLine) {
        existingCommandLine.parentElement.remove();
    }
    // Add the new command input field to the bottom of the history
    appendCommandLineToHistory(`<input type="text" id="commandInput" placeholder="">`)
    const commandInput = document.getElementById('commandInput');
    commandInput.focus();

    // Event listener for the commandInput
    commandInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            let command = this.value.trim();
            executeCommand(command);
            
        }
    });
}

async function getTitle() {

    const totalPosts = await getTotalPosts();
    const totalCategories = await getTotalCategories();

	const domain = new URL(config.baseUrl).hostname;
	const emailAddress = `hello@${domain}`;

    appendCommandLineToHistory(`Welcome to ${config.siteTitle} - ${config.siteDescription}`);
    appendCommandLineToHistory(` * For more information, email: ${emailAddress}`);
    appendCommandLineToHistory(` `);
    appendCommandLineToHistory(`System information as of ${new Date().toLocaleString()}`);
    appendCommandLineToHistory(``);
    appendCommandLineToHistory(`<table class="no-spacing">
        <tr>
            <td>$ System software:</td>
            <td>${config.serverSoftware}</td>
            <td>Total Articles:</td>
            <td>${totalPosts}</td>
        </tr>
        <tr>
            <td>$ Request Time:</td>
            <td>${config.requestTime}</td>
            <td>Total Categories:</td>
            <td>${totalCategories}</td>
        </tr>
        <tr>
            <td>$ Memory usage:</td>
            <td>${config.memoryUsage}</td>
            <td>IP address:</td>
            <td>${config.ipAddress}</td>
        </tr>
    </table>
`, false);
    appendCommandLineToHistory( `Current theme: ${config.currentTheme}`);
    appendCommandLineToHistory(``);
}


async function getHelp() {
    let helpText = `
        <div class="help-text">
            <strong>Available Commands:</strong>
            <ul>
                <li><strong>ls [page] [per_page]</strong> - Lists all articles. Usage: <code>ls</code> for default, <code>ls 2</code> for page 2, <code>ls 2 5</code> for page 2 with 5 posts per page.</li>
                <li><strong>cat [post-id or title]</strong> - Displays a specific article by its ID or title. Usage: <code>cat 123</code> or <code>cat example-post-title</code></li>
                <li><strong>search [query]</strong> - Searches articles with the given query. Usage: <code>search keyword</code></li>
                <li><strong>categories</strong> - Lists all categories. Usage: <code>categories</code></li>
                <li><strong>posts [category-id]</strong> - Lists all articles in a specific category. Usage: <code>posts 5</code> (where 5 is the category ID)</li>
                <li><strong>help</strong> - Displays this help message. Usage: <code>help</code></li>
            </ul>
        </div>
    `;
    appendCommandLineToHistory(`${helpText}`, false);
}

const fetchTotalPosts = async () => {
    const response = await fetch(`/wp-json/wp/v2/posts?per_page=1`);
    return parseInt(response.headers.get('X-WP-Total'));
}

const fetchPosts = async (page, perPage) => {
    const response = await fetch(`/wp-json/wp/v2/posts?page=${page}&per_page=${perPage}&_embed`);
    return await response.json();
}

async function fetchPost(id) {
    const response = await fetch(`/wp-json/wp/v2/posts/${id}?_embed`);
    return response.json();
}

const generateShareLinks = (url, title) => {
    const twitterShareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${title}`;
    const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
    const linkedInShareUrl = `https://www.linkedin.com/shareArticle?mini=true&url=${url}&title=${title}`;

    // Share Links HTML
    return `
<a href="${twitterShareUrl}" target="_blank" class="terminal-link"> Twitter</a> | 
<a href="${facebookShareUrl}" target="_blank" class="terminal-link"> Facebook</a> | 
<a href="${linkedInShareUrl}" target="_blank" class="terminal-link"> LinkedIn</a>
    `;
}
const generateSocialMediaUrls = (post) => {
    const postUrl = `${config.baseUrl}/${post.slug}`; // Adjust based on your site's URL structure
    const postTitle = encodeURIComponent(post.title.rendered);

    // Return social media links.
    return `Share this post: ${generateShareLinks(postUrl, postTitle)}`;
}

const outputPosts = (posts) => {
    return posts.map(post => {
        return `ID: ${post.id} | <span class="clickable-post"
onclick="executeCommand('cat ${post.id}')">${post.title.rendered}</span>
 | Date: ${new Date(post.date).toLocaleDateString()} | ${generateSocialMediaUrls(post)}`;
    }).join('<br>');
}

const updatePaginationControls = (page, totalPages, perPage) => {
    appendCommandLineToHistory('<div class="pagination-controls">', false);
    if (page > 1) {
        appendCommandLineToHistory(`<button class="terminal-button" onclick="executeCommand('ls ${parseInt(page) - 1} ${perPage}')">Previous Page</button>`, false);
    }
    if (page < totalPages) {
        appendCommandLineToHistory(`<button class="terminal-button" onclick="executeCommand('ls ${parseInt(page) + 1} ${perPage}')">Next Page</button>`, false);
    }
    appendCommandLineToHistory('</div>', false);
}


const validatePagination = async (page, perPage) => {
    const totalPosts = await fetchTotalPosts();
    const totalPages = Math.ceil(totalPosts / perPage);

    if (page > totalPages) {
        await outputError(`Page ${page} does not exist. Total pages: ${totalPages}.`);
        return false;
    }

    return true;
}

async function listPosts(page = 1, perPage = 10) {
    try {
        const totalPosts = await fetchTotalPosts();
        const totalPages = Math.ceil(totalPosts / perPage);

        if (page > totalPages) {
            await outputError(`Page ${page} does not exist. Total pages: ${totalPages}.`);
            return;
        }

        const posts = await fetchPosts(page, perPage);
        const output = posts.map(post => {
            let date = new Date(post.date).toLocaleDateString();
            return `ID: ${post.id} | <span class="clickable-post" onclick="executeCommand('cat ${post.id}')">${post.title.rendered}</span> | Date: ${date} | ${generateSocialMediaUrls(post)}`;
        }).join('<br><br>'); // Separate each item with two line breaks

        appendCommandLineToHistory(output);
        updatePaginationControls(page, totalPages, perPage);
    } catch (error) {
        await outputError('Error fetching posts');
    }
}

function generateContent(post) {
    let content = [];

    content.push(`<h2>${post.title.rendered}</h2>`);

    if (post._embedded && post._embedded['wp:featuredmedia'] && post._embedded['wp:featuredmedia'][0]) {
        let imageUrl = post._embedded['wp:featuredmedia'][0].source_url;
        content.push(`<img src="${imageUrl}" alt="${post.title.rendered}" onclick="openImagePopup('${imageUrl}')">`);
    }

    // handle pre code block
    let splittedContent = post.content.rendered.split(/(\<pre[\s\S]*?\<\/pre>)/);

    splittedContent.forEach(line => {
        // For <pre> code block, keep it as it is. For normal text, split by newline.
        if(line.startsWith("<pre")) {
            content.push(line);
        } else {
            line.split('\n').forEach(subLine => content.push(subLine));
        }
    });

    return content;
}

async function viewPost(identifier) {
    try {
        let post = await fetchPost(identifier);

        if (!post || post.length === 0) {
            await outputError('Post not found');
            return;
        }

        const contents = generateContent(post);
        contents.forEach(content => appendCommandLineToHistory(content, false));

        appendCommandLineToHistory(generateSocialMediaUrls(post), false);
        scrollToBottomOfHistory();

    } catch (error) {
        await outputError('Error fetching post');
    }
}

async function fetchCategories() {
    try {
        const response = await fetch('/wp-json/wp/v2/categories');
        const categories = await response.json();
        displayCategories(categories);
    } catch (error) {
        await outputError('Error fetching categories');
    }
}

function displayCategories(categories) {
    let output = categories.map(category => {
        let categoryUrl = `${config.baseUrl}/${category.slug}`; // Adjust based on your site's URL structure
        let categoryTitle = encodeURIComponent(category.name);

        // Return ID, category name, and social media links.
        return `ID: ${category.id} | <span class="clickable-post" onclick="executeCommand('posts ${category.id}')">${category.name} | ${generateShareLinks(categoryUrl, categoryTitle)}</span>`;
    }).join('<br>');

    appendCommandLineToHistory(output);
}

async function listPostsByCategory(categoryId) {
    try {
        const response = await fetch(`/wp-json/wp/v2/posts?categories=${categoryId}`);
        const posts = await response.json();
        const output = posts.map(post => {
            let date = new Date(post.date).toLocaleDateString();
            return `ID: ${post.id} | <span class="clickable-post" onclick="executeCommand('cat ${post.id}')">${post.title.rendered}</span> | Date: ${date}`;
        }).join('<br>');

        appendCommandLineToHistory(output);
    } catch (error) {
        await outputError(`Error fetching posts for category ${categoryId}`);
    }
}

async function getCategoryIDByName(categoryName) {
    try {
        const response = await fetch(`wp-json/wp/v2/categories?slug=${categoryName}`);
        const categories = await response.json();
        if (categories.length > 0) {
            return categories[0].id; // Assuming the first category is the one we want
        } else {
            throw new Error('Category not found');
        }
    } catch (error) {
        console.error('Error fetching category ID:', error);
        return null;
    }
}

async function searchPosts(query) {
    // AJAX request to search posts
}

async function outputError(message) {
    // Use backticks `` to create a multiline string
    // Add a class 'terminal-error' to this div that you can use to style it with CSS
    let errorMessage = `
        <div class="terminal-error">
            bash: ${message}: command not found
        </div>
    `;

    appendCommandLineToHistory(errorMessage);
    scrollToBottomOfHistory();
}

function openImagePopup(imageUrl) {
    const popup = document.createElement('div');
    popup.style.position = 'fixed';
    popup.style.top = '0';
    popup.style.left = '0';
    popup.style.width = '100%';
    popup.style.height = '100%';
    popup.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    popup.style.display = 'flex';
    popup.style.justifyContent = 'center';
    popup.style.alignItems = 'center';
    popup.style.zIndex = '1000';

    const img = document.createElement('img');
    img.src = imageUrl;
    img.style.maxWidth = '90%';
    img.style.maxHeight = '90%';
    img.style.margin = 'auto';

    popup.appendChild(img);

    popup.addEventListener('click', function() {
        document.body.removeChild(popup);
    });

    document.body.appendChild(popup);
}

async function getTotalPosts() {
    try {
        const response = await fetch(`${config.baseUrl}/wp-json/wp/v2/posts?per_page=1`);
        return response.headers.get('X-WP-Total');
    } catch (error) {
        console.error('Error fetching total posts:', error);
        return 'Unavailable';
    }
}

async function getTotalCategories() {
    try {
        const response = await fetch(`${config.baseUrl}/wp-json/wp/v2/categories?per_page=1`);
        return response.headers.get('X-WP-Total');
    } catch (error) {
        console.error('Error fetching total categories:', error);
        return 'Unavailable';
    }
}