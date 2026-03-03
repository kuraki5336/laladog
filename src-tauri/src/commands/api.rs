use std::collections::HashMap;
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
pub struct ApiRequest {
    pub method: String,       // GET, POST, PUT, DELETE
    pub url: String,          // full URL e.g. http://127.0.0.1:8000/teams/
    pub headers: Option<HashMap<String, String>>,
    pub body: Option<String>, // JSON string
}

#[derive(Serialize)]
pub struct ApiResponse {
    pub status: u16,
    pub body: String,
}

/// Generic API proxy: forwards HTTP requests from webview through Rust reqwest
/// to avoid Tauri webview fetch restrictions.
#[tauri::command]
pub async fn api_request(request: ApiRequest) -> Result<ApiResponse, String> {
    let result = tokio::task::spawn_blocking(move || {
        let client = reqwest::blocking::Client::new();

        let mut builder = match request.method.to_uppercase().as_str() {
            "GET" => client.get(&request.url),
            "POST" => client.post(&request.url),
            "PUT" => client.put(&request.url),
            "DELETE" => client.delete(&request.url),
            "PATCH" => client.patch(&request.url),
            other => return Err(format!("Unsupported method: {}", other)),
        };

        // Add headers
        if let Some(headers) = request.headers {
            for (key, value) in headers {
                builder = builder.header(&key, &value);
            }
        }

        // Add body
        if let Some(body) = request.body {
            builder = builder.body(body);
        }

        let resp = builder
            .send()
            .map_err(|e| format!("Request failed: {}", e))?;

        let status = resp.status().as_u16();
        let body = resp.text().map_err(|e| format!("Read body failed: {}", e))?;

        Ok(ApiResponse { status, body })
    })
    .await
    .map_err(|e| format!("Task failed: {}", e))?;

    result
}
