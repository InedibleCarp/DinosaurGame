use actix_web::{get, post, web, App, HttpResponse, HttpServer, Responder};
use actix_web::middleware::DefaultHeaders;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;

#[derive(Deserialize)]
struct ScoreSubmission {
    name: String,
    score: u32,
}

#[derive(Serialize, Clone)]
struct Score {
    name: String,
    score: u32,
}

// Shared application state using a Mutex for thread safety.
struct AppState {
    scores: Mutex<Vec<Score>>,
}

#[post("/score")]
async fn post_score(score_submission: web::Json<ScoreSubmission>, data: web::Data<AppState>) -> impl Responder {
    let mut scores = data.scores.lock().unwrap();
    
    println!("Received score: {} from {}", score_submission.score, score_submission.name);
    
    scores.push(Score {
        name: score_submission.name.clone(),
        score: score_submission.score,
    });
    
    // Sort scores by highest score first
    scores.sort_by(|a, b| b.score.cmp(&a.score));
    
    // Keep only top 100 scores
    if scores.len() > 100 {
        scores.truncate(100);
    }
    
    HttpResponse::Ok().json("Score received")
}

#[get("/scores")]
async fn get_scores(data: web::Data<AppState>) -> impl Responder {
    let scores = data.scores.lock().unwrap();
    HttpResponse::Ok().json(&*scores)
}

// Health check endpoint
#[get("/health")]
async fn health_check() -> impl Responder {
    HttpResponse::Ok().body("Server is running")
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    println!("Starting Dino Run game server on http://127.0.0.1:8080");
    
    // Initialize with some example scores
    let initial_scores = vec![
        Score { name: "T-Rex".to_string(), score: 1500 },
        Score { name: "Raptor".to_string(), score: 1200 },
        Score { name: "Stego".to_string(), score: 900 },
    ];
    
    let state = web::Data::new(AppState {
        scores: Mutex::new(initial_scores),
    });

    HttpServer::new(move || {
        App::new()
            .app_data(state.clone())
            // Add CORS middleware
            .wrap(
                DefaultHeaders::new()
                    .add(("Access-Control-Allow-Origin", "*"))
                    .add(("Access-Control-Allow-Methods", "GET, POST, OPTIONS"))
                    .add(("Access-Control-Allow-Headers", "Content-Type"))
            )
            .service(post_score)
            .service(get_scores)
            .service(health_check)
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await
}