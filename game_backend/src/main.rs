use actix_web::{get, post, web, App, HttpResponse, HttpServer, Responder};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;

#[derive(Deserialize)]
struct ScoreSubmission {
    name: String,
    score: u32,
}

#[derive(Serialize)]
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
    scores.push(Score {
        name: score_submission.name.clone(),
        score: score_submission.score,
    });
    HttpResponse::Ok().body("Score received")
}

#[get("/scores")]
async fn get_scores(data: web::Data<AppState>) -> impl Responder {
    let scores = data.scores.lock().unwrap();
    HttpResponse::Ok().json(&*scores)
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let state = web::Data::new(AppState {
        scores: Mutex::new(Vec::new()),
    });

    HttpServer::new(move || {
        App::new()
            .app_data(state.clone())
            .service(post_score)
            .service(get_scores)
    })
    .bind("127.0.0.1:8080")?
    .run()
    .await
}
