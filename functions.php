<?php

function d8_set_permalink_structure() {
    // Check if the permalink structure is already set to 'post name'
    if ( get_option('permalink_structure') !== '/%postname%/' ) {
        // Set the permalink structure to 'post name'
        global $wp_rewrite;
        $wp_rewrite->set_permalink_structure('/%postname%/');
        $wp_rewrite->flush_rules();
    }
}

add_action('after_switch_theme', 'd8_set_permalink_structure');

function terminal_theme_scripts() {
    wp_enqueue_style('terminal-style', get_template_directory_uri() . '/style.css');
    // Enqueue your script
    wp_enqueue_script('terminal-theme-script', get_template_directory_uri() . '/script.js', array(), null, true);
    
    // Localize script with base URL
    wp_localize_script('terminal-theme-script', 'wpData', array(
        'baseUrl' => get_site_url(),
		'siteTitle' => get_bloginfo('name'), // Retrieves the WordPress site title
		'siteDescription' => get_bloginfo('description'), // Retrieves the WordPress site description
        'memoryUsage' => size_format(memory_get_usage(), 2),
        'currentTheme' => wp_get_theme()->get('Name'),
        'serverSoftware' => $_SERVER['SERVER_SOFTWARE'],
        'ipAddress' => $_SERVER['REMOTE_ADDR'],
        'requestTime' => $_SERVER['REQUEST_TIME'],
    ));
}

add_action('wp_enqueue_scripts', 'terminal_theme_scripts');

function terminal_setup() {
    add_theme_support( 'title-tag' );
    add_theme_support( 'automatic-feed-links' );
    add_theme_support( 'post-thumbnails' );
}

add_action( 'after_setup_theme', 'terminal_setup' );


function terminal_meta_description() {

    $description = '';

    if (is_single() || is_page()) {
        // For single posts or pages
        $description = get_the_excerpt();
    } elseif (is_home() || is_front_page()) {
        // For the home/front page
        $description = get_bloginfo('description');
    }

    return esc_attr(strip_tags($description));
}


function terminal_open_graph_tags() {
    global $post;

    if (is_single()) {
        // Assuming you have set featured images for your posts
        $og_image = get_the_post_thumbnail_url($post->ID, 'large');
    } else {
        // Default image
        $og_image = 'URL_to_default_image';
    }

    // Echo the tags
    echo '<meta property="og:title" content="' . get_the_title() . '">';
    echo '<meta property="og:description" content="' . terminal_meta_description() . '">';
    echo '<meta property="og:image" content="' . $og_image . '">';
    // Add more tags as needed
}