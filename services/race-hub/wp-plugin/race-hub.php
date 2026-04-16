<?php
/**
 * Plugin Name: Race Hub
 * Description: Japanese marathon race listings powered by the Race Hub API.
 * Version: 1.0.0
 */

if ( ! defined( 'ABSPATH' ) ) exit;

function race_hub_shortcode() {
    $plugin_url = plugin_dir_url( __FILE__ );
    wp_enqueue_style( 'race-hub-fonts', 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;700;800&family=Inter:wght@400;500;600;700&family=Noto+Sans+SC:wght@400;500;700&display=swap', [], null );
    wp_enqueue_style( 'race-hub-icons', 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200', [], null );
    wp_enqueue_script( 'race-hub-js', $plugin_url . 'dist/assets/race-hub.js', [], null, true );
    wp_enqueue_style( 'race-hub-css', $plugin_url . 'dist/assets/index.css', [], null );
    return '<div id="race-hub-root" class="race-hub-root"></div>';
}

add_shortcode( 'race_hub', 'race_hub_shortcode' );
