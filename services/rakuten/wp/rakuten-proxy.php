<?php
/**
 * Rakuten PHP Proxy
 *
 * Paste this into your active child theme's functions.php.
 *
 * Registers: POST /wp-json/rakuten/v1/request-product
 *
 * Flow:
 *   Browser → this endpoint → wp_remote_post() → Express on VPS
 *   → do_shortcode('[products ids="..."]') → returns rendered HTML
 */

define( 'RAKUTEN_API_URL', 'http://YOUR_VPS_IP:3000' );

add_action( 'rest_api_init', function () {
	register_rest_route( 'rakuten/v1', '/request-product', [
		'methods'             => 'POST',
		'callback'            => 'rakuten_request_product',
		'permission_callback' => '__return_true',
	] );
} );

function rakuten_request_product( WP_REST_Request $request ) {
	$keyword = sanitize_text_field( $request->get_param( 'keyword' ) );

	if ( empty( $keyword ) ) {
		return new WP_Error( 'missing_keyword', 'keyword is required', [ 'status' => 400 ] );
	}

	$response = wp_remote_post( RAKUTEN_API_URL . '/api/request-product', [
		'headers' => [ 'Content-Type' => 'application/json' ],
		'body'    => wp_json_encode( [ 'keyword' => $keyword ] ),
		'timeout' => 120, // scrape + WC push can take ~2 minutes
	] );

	if ( is_wp_error( $response ) ) {
		return new WP_Error( 'vps_unreachable', 'Could not reach Rakuten service', [ 'status' => 502 ] );
	}

	$body = json_decode( wp_remote_retrieve_body( $response ), true );

	if ( empty( $body['success'] ) || empty( $body['productIds'] ) ) {
		return new WP_Error( 'no_products', 'No matching products found', [ 'status' => 422 ] );
	}

	$ids_string = implode( ',', $body['productIds'] );
	$shortcode  = '[products ids="' . $ids_string . '"]';
	$html       = do_shortcode( $shortcode );

	if ( empty( $html ) ) {
		return new WP_Error( 'render_failed', 'Product grid could not be rendered', [ 'status' => 500 ] );
	}

	return rest_ensure_response( [ 'html' => $html ] );
}
