<?php
/**
 * Plugin Name: Race Hub
 * Description: Japanese marathon race listings powered by the Race Hub API.
 * Version: 1.0.0
 */

if ( ! defined( 'ABSPATH' ) ) exit;

function race_hub_shortcode() {
    $plugin_url = plugin_dir_url( __FILE__ );
    wp_enqueue_script( 'race-hub-js', $plugin_url . 'dist/assets/race-hub.js', [], null, true );
    wp_enqueue_style( 'race-hub-css', $plugin_url . 'dist/assets/index.css', [], null );
    return '<div id="race-hub-root" class="race-hub-root"></div>';
}

add_shortcode( 'race_hub', 'race_hub_shortcode' );
