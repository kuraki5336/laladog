use base64::Engine;
use reqwest::header::{HeaderMap, HeaderName, HeaderValue};
use reqwest::redirect::Policy;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::Instant;

#[derive(Debug, Deserialize)]
pub struct HttpRequestPayload {
    pub method: String,
    pub url: String,
    pub headers: HashMap<String, String>,
    pub body: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct HttpResponsePayload {
    pub status: u16,
    pub status_text: String,
    pub headers: HashMap<String, String>,
    pub body: String,
    pub duration: u64,
    pub size: u64,
    /// "text" 或 "base64"，二進位回應以 base64 編碼
    pub body_encoding: String,
}

/// 判斷 Content-Type 是否為二進位類型
fn is_binary_content_type(content_type: &str) -> bool {
    let ct = content_type.to_lowercase();
    ct.starts_with("application/octet-stream")
        || ct.starts_with("application/pdf")
        || ct.starts_with("application/zip")
        || ct.starts_with("application/gzip")
        || ct.starts_with("application/vnd.openxmlformats")
        || ct.starts_with("application/vnd.ms-excel")
        || ct.starts_with("application/vnd.ms-word")
        || ct.starts_with("application/vnd.ms-powerpoint")
        || ct.starts_with("application/msword")
        || ct.starts_with("application/x-tar")
        || ct.starts_with("application/x-7z")
        || ct.starts_with("application/x-rar")
        || ct.starts_with("image/")
        || ct.starts_with("audio/")
        || ct.starts_with("video/")
        || ct.starts_with("font/")
}

#[tauri::command]
pub async fn send_http_request(payload: HttpRequestPayload) -> Result<HttpResponsePayload, String> {
    // 自訂 redirect policy：follow redirect 時保留所有 headers（含 Authorization）
    // 與 Postman 行為一致 — http→https redirect 不會丟失 auth token
    let client = reqwest::Client::builder()
        .danger_accept_invalid_certs(true)
        .redirect(Policy::custom(|attempt| {
            if attempt.previous().len() > 10 {
                attempt.error("too many redirects")
            } else {
                attempt.follow()
            }
        }))
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

    // Send and measure（計時包含完整回應：headers + body 下載）
    let start = Instant::now();
    let response = request
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    let status = response.status().as_u16();
    let status_text = response
        .status()
        .canonical_reason()
        .unwrap_or("Unknown")
        .to_string();

    // Collect response headers
    let mut resp_headers = HashMap::new();
    let mut header_size: u64 = 0;
    for (key, value) in response.headers() {
        if let Ok(v) = value.to_str() {
            // 計算 header 在線上的大小（"key: value\r\n"）
            header_size += (key.as_str().len() + 2 + v.len() + 2) as u64;
            resp_headers.insert(key.to_string(), v.to_string());
        }
    }

    // 取得原始傳輸大小（壓縮後），若 server 有回 content-length 就用它
    let content_length: Option<u64> = resp_headers
        .get("content-length")
        .and_then(|v| v.parse().ok());

    // 判斷是否為二進位內容
    let content_type = resp_headers
        .get("content-type")
        .cloned()
        .unwrap_or_default();
    let is_binary = is_binary_content_type(&content_type);

    // Read body（reqwest 會自動解壓 gzip/br/deflate）
    let body_bytes = response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read response body: {}", e))?;

    // 計時到 body 完全讀完才停
    let duration = start.elapsed().as_millis() as u64;

    // 大小：優先使用 content-length（傳輸大小），加上 header 大小
    // 這與 Postman 的計算方式一致
    let body_transfer_size = content_length.unwrap_or(body_bytes.len() as u64);
    let size = header_size + body_transfer_size;

    let (body, body_encoding) = if is_binary {
        (
            base64::engine::general_purpose::STANDARD.encode(&body_bytes),
            "base64".to_string(),
        )
    } else {
        (
            String::from_utf8_lossy(&body_bytes).to_string(),
            "text".to_string(),
        )
    };

    Ok(HttpResponsePayload {
        status,
        status_text,
        headers: resp_headers,
        body,
        duration,
        size,
        body_encoding,
    })
}
