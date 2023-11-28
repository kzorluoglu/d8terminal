const config = {
    baseUrl: wpData.baseUrl, // This will be dynamically set to the WordPress base URL,
    siteTitle: wpData.siteTitle,
    siteDescription: wpData.siteDescription,
    currentTheme: wpData.currentTheme,
    memoryUsage: wpData.memoryUsage,
    serverSoftware: wpData.serverSoftware,
    ipAddress: wpData.ipAddress,
    requestTime: wpData.requestTime,

};

const history = document.getElementById('history');

// Terminal Service
const terminalService = {
    print: (message, promptSymbol = true) => {
        const prompt = promptSymbol ? '$ ' : '';
        history.innerHTML += `<div class="command-output">${prompt}${message}</div>`;
    },
    printError: (errorMessage) => {
        history.innerHTML += `<div class="command-output error">${errorMessage}</div>`;
    },
    appendCommandInput: () => {
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
        commandInput.addEventListener('keypress', function (event) {
            if (event.key === 'Enter') {
                let command = this.value.trim();
                commandService.execute(command);
            }
        });
    },
};

// API Service
const apiService = {
    getTotalPosts: async () => {
        try {
            const response = await fetch(`${config.baseUrl}/wp-json/wp/v2/posts?per_page=1`);
            return response.headers.get('X-WP-Total');
        } catch (error) {
            console.error('Error fetching total posts:', error);
            return 'Unavailable';
        }
    },
    getTotalCategories: async () => {
        try {
            const response = await fetch(`${config.baseUrl}/wp-json/wp/v2/categories?per_page=1`);
            return response.headers.get('X-WP-Total');
        } catch (error) {
            console.error('Error fetching total categories:', error);
            return 'Unavailable';
        }
    },
    getCategories: async () => {
        try {
            const response = await fetch(`${config.baseUrl}/wp-json/wp/v2/categories`);
            if (!response.ok) {
                throw new Error(`Failed to fetch categories: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching categories:', error);
            throw error; // You can choose to throw the error for better error handling
        }
    },
    fetchPostsByPage: async (page = 1, perPage = 10) => {
        try {
            const response = await fetch(
                `${config.baseUrl}/wp-json/wp/v2/posts?page=${page}&per_page=${perPage}&_embed`
            );

            if (!response.ok) {
                throw new Error(`Failed to fetch posts: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching posts:', error);
            throw error; // You can choose to throw the error for better error handling
        }
    },
    fetchPostsByCategory: async (categoryId) => {
        try {
            const response = await fetch(
                `${config.baseUrl}/wp-json/wp/v2/posts?categories=${categoryId}&_embed`
            );

            if (!response.ok) {
                throw new Error(`Failed to fetch posts by category: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching posts by category:', error);
            throw error; // You can choose to throw the error for better error handling
        }
    },
    fetchCategoriesBySlug: async (slug) => {
        try {
            const response = await fetch(
                `${config.baseUrl}/wp-json/wp/v2/categories?slug=${slug}`
            );

            if (!response.ok) {
                throw new Error(`Failed to fetch categories by slug: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching categories by slug:', error);
            throw error; // You can choose to throw the error for better error handling
        }
    },
    fetchPost: async (postId) => {
        try {
            const response = await fetch(
                `${config.baseUrl}/wp-json/wp/v2/posts/${postId}?_embed`
            );

            if (!response.ok) {
                throw new Error(`Failed to fetch post: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching post:', error);
            throw error; // You can choose to throw the error for better error handling
        }
    },
    fetchPostsBySearch: async (query, page = 1, perPage = 10) => {
        try {
            // First, fetch the total number of search results to calculate the total pages
            const totalResultsResponse = await fetch(
                `${config.baseUrl}/wp-json/wp/v2/posts?per_page=1&search=${encodeURIComponent(
                    query
                )}`
            );

            const totalResults = parseInt(
                totalResultsResponse.headers.get('X-WP-Total')
            );
            const totalPages = Math.ceil(totalResults / perPage);

            // Check if the requested page exceeds the total pages
            if (page > totalPages) {
                throw new Error(
                    `Page ${page} does not exist. Total pages: ${totalPages}.`
                );
            }

            const response = await fetch(
                `${config.baseUrl}/wp-json/wp/v2/posts?page=${page}&per_page=${perPage}&search=${encodeURIComponent(
                    query
                )}&_embed`
            );

            if (!response.ok) {
                throw new Error(`Failed to fetch posts: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching posts:', error);
            throw error; // You can choose to throw the error for better error handling
        }
    },
    getTotalSearchResults: async (query) => {
        try {
            // Make a request to the WordPress REST API to retrieve the total number of search results for the given query
            const response = await fetch(`${config.baseUrl}/wp-json/wp/v2/posts?search=${query}`);
            const headers = response.headers;
            const totalResults = parseInt(headers.get('X-WP-Total'));

            if (isNaN(totalResults)) {
                throw new Error('Invalid total results count');
            }

            return totalResults;
        } catch (error) {
            console.error('Error fetching total search results:', error);
            return 0; // Return 0 in case of an error
        }
    },
};

// Command Service
const commandService = {
    execute: async (command) => {
        terminalService.print(command);

        let commandParts = command.split(' ');
        let mainCommand = commandParts[0];
        let arguments = commandParts.slice(1);

        let page = 1;
        let perPage = 10;

        try {
            switch (mainCommand) {
                case 'ls':
                    page = parseInt(arguments[0]) || 1;
                    perPage = parseInt(arguments[1]) || 10;
                    await listPosts(page, perPage);
                    break;
                case 'cat':
                    await viewPost(arguments[0]);
                    break;
                case 'search':
                    page = parseInt(arguments[0]) || 1;
                    perPage = parseInt(arguments[1]) || 10;
                    await searchPosts(arguments[0], page, perPage);
                    break;
                case 'categories':
                    await fetchCategories();
                    break;
                case 'posts':
                    await listPostsByCategory(arguments[0]);
                    break;
                case 'help':
                    await getHelp();
                    break;
                default:
                    terminalService.printError('Command not recognized');
            }
        } catch (error) {
            terminalService.printError('An error occurred while executing the command.');
        } finally {
            await terminalService.appendCommandInput();
            history.scrollTop = history.scrollHeight;
        }
    },
};

// URL Service
const urlService = {
    getCurrentPathname: () => {
        const url = window.location.href;
        const urlObj = new URL(url);
        return urlObj.pathname;
    },
    getCategoryNameFromPathname: (pathname) => {
        if (pathname.startsWith('/category/')) {
            let categoryName = pathname.split('/category/')[1];
            if (categoryName.endsWith('/')) {
                categoryName = categoryName.slice(0, -1);
            }
            return categoryName;
        }
        return null;
    },
    getPostSlugFromPathname: (pathname) => {
        if (pathname !== '/' && !pathname.startsWith('/category/')) {
            let postSlug = pathname.slice(1); // Remove the leading '/'
            if (postSlug.endsWith('/')) {
                postSlug = postSlug.slice(0, -1);
            }
            return postSlug;
        }
        return null;
    },
};

// Service for generating social media share links
const shareService = {
    generateShareLinks: (url, title) => {
            const twitterShareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${title}`;
            const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
            const linkedInShareUrl = `https://www.linkedin.com/shareArticle?mini=true&url=${url}&title=${title}`;

            return `<span class="shared-links"><span class="text-orange">Share on</span>
    <a href="${twitterShareUrl}" target="_blank" class="terminal-link">Twitter</a> |
    <a href="${facebookShareUrl}" target="_blank" class="terminal-link">Facebook</a> |
    <a href="${linkedInShareUrl}" target="_blank" class="terminal-link">LinkedIn</a></span>
    `;
    },
};

// Service for error handling
const errorService = {
    printError: (message) => {
        // Implement logic to display error messages
    },
};


document.addEventListener('DOMContentLoaded', (event) => {
    welcomeScreen();
});

async function welcomeScreen() {
    const title = await printTitle();
    await commandService.execute('help');
    await autoExecuteCommandFromURL();
}

// Refactored autoExecuteCommandFromURL using services
async function autoExecuteCommandFromURL() {
    const pathname = urlService.getCurrentPathname();
    const categoryName = urlService.getCategoryNameFromPathname(pathname);
    const postSlug = urlService.getPostSlugFromPathname(pathname);

    if (categoryName) {
        const categoryId = await getCategoryIDByName(categoryName);
        await commandService.execute(`posts ${categoryId}`);
    } else if (postSlug) {
        const postId = await getPostIDBySlug(postSlug);
        await commandService.execute(`cat ${postId}`);
    } else {
        await commandService.execute('ls');
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

async function printTitle() {
    try {
        const totalPosts = await apiService.getTotalPosts();
        const totalCategories = await apiService.getTotalCategories();

        const domain = new URL(config.baseUrl).hostname;
        const emailAddress = `hello@${domain}`;

        terminalService.print(`Welcome to ${config.siteTitle} - ${config.siteDescription}`);
        terminalService.print(`* For more information, email: ${emailAddress}`);
        terminalService.print(``);
        terminalService.print(`System information as of ${new Date().toLocaleString()}`);
        terminalService.print(``);
        terminalService.print(`
            <table class="no-spacing">
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
        `);
        terminalService.print(`Current theme: ${config.currentTheme} `);
        terminalService.print(``);
    } catch (error) {
        errorService.printError('Error fetching data');
    }
}


async function getHelp() {
    let helpText = `
        <div class="help-text">
            <strong>Available Commands:</strong>
            <ul>
                <li><strong>ls [page] [per_page]</strong> - Lists all articles. Usage: <code>ls</code> for default, <code>ls 2</code> for page 2, <code>ls 2 5</code> for page 2 with 5 posts per page.</li>
                <li><strong>cat [post-id or title]</strong> - Displays a specific article by its ID or title. Usage: <code>cat 123</code> or <code>cat example-post-title</code></li>
                <li><strong>search [query] [page] [per_page]</strong> - Searches articles with the given query. Usage: <code>search keyword</code> for default, <code>search keyword 2</code> for page 2, <code>search keyword 2 5</code> for page 2 with 5 posts per page</li>
                <li><strong>categories</strong> - Lists all categories. Usage: <code>categories</code></li>
                <li><strong>posts [category-id]</strong> - Lists all articles in a specific category. Usage: <code>posts 5</code> (where 5 is the category ID)</li>
                <li><strong>help</strong> - Displays this help message. Usage: <code>help</code></li>
            </ul>
        </div>
    `;
    terminalService.print(`${helpText}`, false);
}


async function listPosts(page = 1, perPage = 10) {
    try {
        // First, fetch the total number of posts to calculate the total pages
        const totalPosts = await apiService.getTotalPosts();
        let totalPages = Math.ceil(totalPosts / perPage);

        // Check if the requested page exceeds the total pages
        if (page > totalPages) {
            errorService.printError(`Page ${page} does not exist. Total pages: ${totalPages}.`);
            return;
        }

        const posts = await apiService.fetchPostsByPage(page, perPage);

        // Generate and display output
        const output = posts.map(post => {
            const date = new Date(post.date).toLocaleDateString();
            const postUrl = `${config.baseUrl}/${post.slug}`; // Adjust based on your site's URL structure
            const postTitle = encodeURIComponent(post.title.rendered);

            // Generate social media share links
            const socialMediaLinks = shareService.generateShareLinks(postUrl, postTitle);

            return `ID: ${post.id} | <span class="clickable-post" onclick="commandService.execute('cat ${post.id}')">${post.title.rendered}</span> | Date: ${date} | ${socialMediaLinks}`;
        }).join('<br>');

        terminalService.print(output, false);

        // Pagination controls
        terminalService.print('<div class="pagination-controls">', false);
        if (page > 1) {
            terminalService.print(`<button class="terminal-button" onclick="commandService.execute(('ls ${parseInt(page) - 1} ${perPage}')">Previous Page</button>`, false);
        }
        if (page < totalPages) {
            terminalService.print(`<button class="terminal-button" onclick="commandService.execute(('ls ${parseInt(page) + 1} ${perPage}')">Next Page</button>`, false);
        }
        terminalService.print('</div>', false);
    } catch (error) {
        errorService.printError('Error fetching posts');
    }
}


async function viewPost(identifier) {

    try {
        const post = await apiService.fetchPost(identifier);

        if (!post || post.length === 0) {
            errorService.printError('Post not found');
            return;
        }

        let content = `<h2>${post.title.rendered}</h2>`;

        // Check if the post has a featured image
        if (post._embedded && post._embedded['wp:featuredmedia'] && post._embedded['wp:featuredmedia'][0]) {
            const imageUrl = post._embedded['wp:featuredmedia'][0].source_url;
            content += `<img src="${imageUrl}" alt="${post.title.rendered}" onclick="openImagePopup('${imageUrl}')">`;
        }

        content += `${post.content.rendered}`;
        terminalService.print(content, false);

        const postUrl = `${config.baseUrl}/${post.slug}`; // Adjust based on your site's URL structure
        const postTitle = encodeURIComponent(post.title.rendered);

        terminalService.print(shareService.generateShareLinks(postUrl, postTitle), false);
    } catch (error) {
        errorService.printError('Error fetching post');
    }
}

async function fetchCategories() {
    try {
        const categories = await apiService.getCategories();
        displayCategories(categories);
    } catch (error) {
        errorService.printError('Error fetching categories');
    }
}

function displayCategories(categories) {
    const output = categories.map(category => {
        const categoryUrl = `${config.baseUrl}/${category.slug}`; // Adjust based on your site's URL structure
        const categoryTitle = encodeURIComponent(category.name);

        // Generate social media share links
        const socialMediaLinks = shareService.generateShareLinks(categoryUrl, categoryTitle);

        return `ID: ${category.id} | <span class="clickable-post" onclick="commandService.execute('posts ${category.id}')">${category.name}</span> | <span>${socialMediaLinks}</span>`;
    }).join('<br>');

    terminalService.print(output);
}

async function listPostsByCategory(categoryId) {
    try {
        const posts = await apiService.fetchPostsByCategory(categoryId);
        const output = posts.map(post => {
            const date = new Date(post.date).toLocaleDateString();
            return `ID: ${post.id} | <span class="clickable-post" onclick="commandService.execute('cat ${post.id}')">${post.title.rendered}</span> | Date: ${date}`;
        }).join('<br>');

        terminalService.print(output);
    } catch (error) {
        errorService.printError(`Error fetching posts for category ${categoryId}`);
    }
}

async function getCategoryIDByName(categoryName) {
    try {
        const categories = await apiService.fetchCategoriesBySlug(categoryName);
        if (categories.length > 0) {
            return categories[0].id; // Assuming the first category is the one we want
        } else {
            throw new Error('Category not found');
        }
    } catch (error) {
        errorService.printError('Error fetching category ID:', error);
        return null;
    }
}

async function searchPosts(query, page = 1, perPage = 10) {
    try {
        // Fetch the total number of search results to calculate total pages
        const totalResults = await apiService.getTotalSearchResults(query);
        const totalPages = Math.ceil(totalResults / perPage);

        if (totalPages === 0) {
            terminalService.print(`No results found for "${query}"`);
            return;
        }

        // Check if the requested page exceeds the total pages
        if (page > totalPages) {
            errorService.printError(`Page ${page} does not exist. Total pages: ${totalPages}.`);
            return;
        }

        // Fetch search results for the specified page
        const searchResults = await apiService.fetchPostsBySearch(query, page, perPage);

        // Generate and display output
        const output = searchResults.map(post => {
            const date = new Date(post.date).toLocaleDateString();
            const postUrl = `${config.baseUrl}/${post.slug}`; // Adjust based on your site's URL structure
            const postTitle = encodeURIComponent(post.title.rendered);

            // Generate social media share links
            const socialMediaLinks = shareService.generateShareLinks(postUrl, postTitle);

            return `ID: ${post.id} | <span class="clickable-post" onclick="commandService.execute('cat ${post.id}')">${post.title.rendered}</span> | Date: ${date} | ${socialMediaLinks}`;
        }).join('<br>');

        terminalService.print(output);

        // Pagination controls
        terminalService.print('<div class="pagination-controls">', false);
        if (page > 1) {
            terminalService.print(`<button class="terminal-button" onclick="commandService.execute('search ${query} ${parseInt(page) - 1} ${perPage}')">Previous Page</button>`, false);
        }
        if (page < totalPages) {
            terminalService.print(`<button class="terminal-button" onclick="commandService.execute('search ${query} ${parseInt(page) + 1} ${perPage}')">Next Page</button>`, false);
        }
        terminalService.print('</div>', false);
    } catch (error) {
        errorService.printError('Error fetching search results');
    }
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
