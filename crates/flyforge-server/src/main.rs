//! FlyForge HTTP API Server

use axum::{routing::get, Router};
use tower_http::cors::CorsLayer;

#[tokio::main]
async fn main() {
    let app = Router::new()
        .route("/api/health", get(health_check))
        .layer(CorsLayer::permissive());

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000")
        .await
        .unwrap();

    println!("FlyForge server running on http://localhost:3000");
    axum::serve(listener, app).await.unwrap();
}

async fn health_check() -> &'static str {
    "FlyForge API is running"
}