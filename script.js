const config = {
    baseUrl: wpData.baseUrl, // This will be dynamically set to the WordPress base URL,
	siteTitle: wpData.siteTitle,
	siteDescription: wpData.siteDescription,

};

const history = document.getElementById('history');

welcomeScreen();

function welcomeScreen() {
	getTitle();
	executeCommand('help');
}

document.addEventListener('DOMContentLoaded', (event) => {
    autoExecuteCommandFromURL();
});

async function autoExecuteCommandFromURL() {
    const url = window.location.href;
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;

    if (pathname.startsWith('/category/')) {
        let categoryName = pathname.split('/category/')[1];
        if (categoryName.endsWith('/')) {
            categoryName = categoryName.slice(0, -1);
        }
        const categoryId = await getCategoryIDByName(categoryName);
        executeCommand(`posts ${categoryId}`);
    } else if (pathname !== '/' && !pathname.startsWith('/category/')) {
        // Assuming that any other non-root, non-category pathname is a post slug
        let postSlug = pathname.slice(1); // Remove the leading '/'
        if (postSlug.endsWith('/')) {
            postSlug = postSlug.slice(0, -1);
        }
        const postId = await getPostIDBySlug(postSlug);
        executeCommand(`cat ${postId}`);
    } else {
        // Default action if no specific category or post is found in the URL
        executeCommand('ls');
    }
}

async function getPostIDBySlug(slug) {
    try {
        let response = await fetch(`/wp-json/wp/v2/posts?slug=${slug}`);
        let posts = await response.json();
        if (posts.length > 0) {
            return posts[0].id; // Assuming the first post is the one we want
        } else {
            throw new Error('Post not found');
        }
    } catch (error) {
        console.error('Error fetching post ID:', error);
        return null;
    }
}

async function executeCommand(command) {
    history.innerHTML += `<div class="command-line">$ ${command}</div>`;

    let commandParts = command.split(' ');
    let mainCommand = commandParts[0];
    let arguments = commandParts.slice(1);
	    try {
        switch(mainCommand) {
            case 'ls':
            	let page = arguments[0] || 1;
            	let perPage = arguments[1] || 10;
            	await listPosts(page, perPage);
                break;
			case 'cat':
				await viewPost(arguments[0]);
				break;
			case 'search':
				await searchPosts(arguments[0]);
				break;
            case 'categories':
                await fetchCategories();
                break;
			case 'posts':
				await listPostsByCategory(arguments[0]);
				break;
            case 'help':
                getHelp();
                break;
            default:
                outputError('Command not recognized');
        }
    } catch (error) {
        outputError('An error occurred while executing the command.');
    } finally {
        await appendCommandInput();
        history.scrollTop = history.scrollHeight;
    }

}


function appendCommandInput() {
	// Remove existing command input line if it exists
    const existingCommandLine = history.querySelector('#commandInput');
    if (existingCommandLine) {
        existingCommandLine.parentElement.remove();
    }
    // Add the new command input field to the bottom of the history
	history.innerHTML += `<div class="command-line">$ <input type="text" id="commandInput" placeholder=""></div>`;
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

	const domain = new URL(config.baseUrl).hostname;
	const emailAddress = `hello@${domain}`;

	history.innerHTML += `<div class="command-output">$ Welcome to ${config.siteTitle} - ${config.siteDescription}</div>`;
	history.innerHTML += `<div class="command-output">$ * For more information, email: ${emailAddress}</div>`;
	history.innerHTML += `<div class="command-output">$</div>`;
	history.innerHTML += `<div class="command-output">$ System information as of ${new Date().toLocaleString()}</div>`;
	history.innerHTML += `<div class="command-output">$</div>`;
	history.innerHTML += `<div class="command-output">$ System load:  [Data Unavailable]    Processes:           [Data Unavailable]</div>`;
	history.innerHTML += `<div class="command-output">$ Usage of /:   [Data Unavailable]    Users logged in:     [Data Unavailable]</div>`;
	history.innerHTML += `<div class="command-output">$ Memory usage: [Data Unavailable]    IP address:          [Data Unavailable]</div>`;
	history.innerHTML += `<div class="command-output">$ Swap usage:   [Data Unavailable]</div>`;
	history.innerHTML += `<div class="command-output">$</div>`;
	history.innerHTML += `<div class="command-output">$ [Number] articles can be explored.</div>`;
	history.innerHTML += `<div class="command-output">$ [Number] categories to discover.</div>`;
	history.innerHTML += `<div class="command-output">$</div>`;
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
    history.innerHTML += `<div class="command-output">${helpText}</div>`;
}


async function listPosts(page = 1, perPage = 10) {
    try {
        // First, fetch the total number of posts to calculate the total pages
        let totalPostsResponse = await fetch(`/wp-json/wp/v2/posts?per_page=1`);
        let totalPosts = parseInt(totalPostsResponse.headers.get('X-WP-Total'));
        let totalPages = Math.ceil(totalPosts / perPage);

        // Check if the requested page exceeds the total pages
        if (page > totalPages) {
            outputError(`Page ${page} does not exist. Total pages: ${totalPages}.`);
            return;
        }

        let response = await fetch(`/wp-json/wp/v2/posts?page=${page}&per_page=${perPage}&_embed`);
        let posts = await response.json();

        let output = posts.map(post => {
        let date = new Date(post.date).toLocaleDateString();
        let postUrl = `https://d8devs.com/${post.slug}`; // Adjust based on your site's URL structure
        let postTitle = encodeURIComponent(post.title.rendered);

        // Social Media Share URLs
        let twitterShareUrl = `https://twitter.com/intent/tweet?url=${postUrl}&text=${postTitle}`;
        let facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${postUrl}`;
        let linkedInShareUrl = `https://www.linkedin.com/shareArticle?mini=true&url=${postUrl}&title=${postTitle}`;

			
			
return `ID: ${post.id} | <span class="clickable-post" onclick="executeCommand('cat ${post.id}')">${post.title.rendered}</span> | Date: ${date} | <a href="${twitterShareUrl}" target="_blank" class="terminal-link">Share on Twitter</a> | <a href="${facebookShareUrl}" target="_blank" class="terminal-link">Share on Facebook</a> | <a href="${linkedInShareUrl}" target="_blank" class="terminal-link">Share on LinkedIn</a>`;
    }).join('<br>');

        history.innerHTML += output;

        // Pagination controls
        history.innerHTML += '<div class="pagination-controls">';
        if (page > 1) {
            history.innerHTML += `<button class="terminal-button" onclick="executeCommand('ls ${parseInt(page) - 1} ${perPage}')">Previous Page</button>`;
        }
        if (page < totalPages) {
            history.innerHTML += `<button class="terminal-button" onclick="executeCommand('ls ${parseInt(page) + 1} ${perPage}')">Next Page</button>`;
        }
        history.innerHTML += '</div>';
    } catch (error) {
        outputError('Error fetching posts');
    }
}




async function viewPost(identifier) {
	let apiUrl = `/wp-json/wp/v2/posts/${identifier}?_embed`;
	
    try {
        let response = await fetch(apiUrl);
        let post = await response.json();

        if (!post || post.length === 0) {
            outputError('Post not found');
            return;
        }

        let content = `<h2>${post.title.rendered}</h2>`;

        // Check if the post has a featured image
        if (post._embedded && post._embedded['wp:featuredmedia'] && post._embedded['wp:featuredmedia'][0]) {
            let imageUrl = post._embedded['wp:featuredmedia'][0].source_url;
			content += `<img src="${imageUrl}" alt="${post.title.rendered}" onclick="openImagePopup('${imageUrl}')">`;

        }

        content += `${post.content.rendered}`;
        history.innerHTML += content;
		
		let postUrl = `${config.baseUrl}/${post.slug}`; // Adjust based on your site's URL structure
		let postTitle = encodeURIComponent(post.title.rendered);

		// Social Media Share URLs
		let twitterShareUrl = `https://twitter.com/intent/tweet?url=${postUrl}&text=${postTitle}`;
		let facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${postUrl}`;
		let linkedInShareUrl = `https://www.linkedin.com/shareArticle?mini=true&url=${postUrl}&title=${postTitle}`;

		// Add share links to the history
		let shareLinksHtml = `
			<div class="share-links">
				Share this post: 
				<a href="${twitterShareUrl}" target="_blank">Twitter</a> | 
				<a href="${facebookShareUrl}" target="_blank">Facebook</a> | 
				<a href="${linkedInShareUrl}" target="_blank">LinkedIn</a>
			</div>
		`;
		history.innerHTML += shareLinksHtml;
		
		
    } catch (error) {
        outputError('Error fetching post');
    }
}

async function fetchCategories() {
    try {
        let response = await fetch('/wp-json/wp/v2/categories');
        let categories = await response.json();
        displayCategories(categories);
    } catch (error) {
        outputError('Error fetching categories');
    }
}

function displayCategories(categories) {
    let output = categories.map(category => {
		
		let categoryUrl = `${config.baseUrl}/${category.slug}`; // Adjust based on your site's URL structure
        let categoryTitle = encodeURIComponent(category.name);

        // Social Media Share URLs
        let twitterShareUrl = `https://twitter.com/intent/tweet?url=${categoryUrl}&text=${categoryTitle}`;
        let facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${categoryUrl}`;
        let linkedInShareUrl = `https://www.linkedin.com/shareArticle?mini=true&url=${categoryUrl}&title=${categoryTitle}`;
		
		
        return `ID: ${category.id} | <span class="clickable-post" onclick="executeCommand('posts ${category.id}')">${category.name} | <a href="${twitterShareUrl}" target="_blank" class="terminal-link">Share on Twitter</a> | <a href="${facebookShareUrl}" target="_blank" class="terminal-link">Share on Facebook</a> | <a href="${linkedInShareUrl}" target="_blank" class="terminal-link">Share on LinkedIn</a></span>`;
    }).join('<br>');
    history.innerHTML += output;
}

async function listPostsByCategory(categoryId) {
    try {
        let response = await fetch(`/wp-json/wp/v2/posts?categories=${categoryId}`);
        let posts = await response.json();
        let output = posts.map(post => {
            let date = new Date(post.date).toLocaleDateString();
            return `ID: ${post.id} | <span class="clickable-post" onclick="executeCommand('cat ${post.id}')">${post.title.rendered}</span> | Date: ${date}`;
        }).join('<br>');
        history.innerHTML += output;
    } catch (error) {
        outputError(`Error fetching posts for category ${categoryId}`);
    }
}

async function getCategoryIDByName(categoryName) {
    try {
        let response = await fetch(`wp-json/wp/v2/categories?slug=${categoryName}`);
        let categories = await response.json();
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
    // AJAX request to WordPress to search posts
}

async function outputError(message) {
    // Display error message in the terminal
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
