<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo( 'charset' ); ?>">
    <meta name="description" content="<?php echo terminal_meta_description(); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <!-- Open Graph Tags -->
    <?php if (is_single()) { terminal_open_graph_tags(); } ?>
	<?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
    <div id="terminal">
	    <div id="history"></div>
    </div>
    <?php wp_footer(); ?>
</body>
</html>

