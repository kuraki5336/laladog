use reqwest::header::{HeaderMap, HeaderName, HeaderValue};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::Instant;

#[derive(Debug, Deserialize)]
pub struct HttpRequestPayload {
    pub method: String,
    pub url: String,
    pub headers: HashMap<String, String>,
    pub body: Option<String>,
    pub body_type: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct HttpResponsePayload {
    pub status: u16,
    pub status_text: String,
    pub headers: HashMap<String, String>,
    pub body: String,
    pub duration: u64,
    pub size: u64,
}

#[tauri::command]
pub async fn send_http_request(payload: HttpRequestPayload) -> Result<HttpResponsePayload, String> {
    let client = reqwest::Client::builder()
        .danger_accept_invalid_certs(true)
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;

    // Build headers
    let mut header_map = HeaderMap::new();
    for (key, value) in &payload.headers {
        let name = HeaderName::from_bytes(key.as_bytes())
            .map_err(|e| format!("Invalid header name '{}': {}", key, e))?;
        let val = HeaderValue::from_str(value)
            .map_err(|e| format!("Invalid header value for '{}': {}", key, e))?;
        header_map.insert(name, val);
    }

    // Build request
    let method = payload
        .method
        .parse::<reqwest::Method>()
        .map_err(|e| format!("Invalid HTTP method: {}", e))?;

    let mut request = client.request(method, &payload.url).headers(header_map);

    // Attach body
    if let Some(body) = &payload.body {
        request = request.body(body.clone());
    }

    // Send and measure
    let start = Instant::now();
    let response = request
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;
    let duration = start.elapsed().as_millis() as u64;

    let status = response.status().as_u16();
    let status_text = response
        .status()
        .canonical_reason()
        .unwrap_or("Unknown")
        .to_string();

    // Collect response headers
    let mut resp_headers = HashMap::new();
    for (key, value) in response.headers() {
        if let Ok(v) = value.to_str() {
            resp_headers.insert(key.to_string(), v.to_string());
        }
    }

    // Read body
    let body_bytes = response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read response body: {}", e))?;
    let size = body_bytes.len() as u64;
    let body = String::from_utf8_lossy(&body_bytes).to_string();

    Ok(HttpResponsePayload {
        status,
        status_text,
        headers: resp_headers,
        body,
        duration,
        size,
    })
}
