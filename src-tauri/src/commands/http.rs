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
    // 停用自動 redirect — 改為手動 follow，確保 Authorization header 不被移除
    // reqwest 預設在跨 origin redirect 時會移除 sensitive headers，
    // 手動 follow 可完整保留所有 headers，與 Postman 行為一致
    let client = reqwest::Client::builder()
        .danger_accept_invalid_certs(true)
        .redirect(Policy::none())
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

    // Build method
    let method = payload
        .method
        .parse::<reqwest::Method>()
        .map_err(|e| format!("Invalid HTTP method: {}", e))?;

    // Send and measure（計時包含完整回應：headers + body 下載）
    let start = Instant::now();

    // 手動 follow redirect（最多 10 次），每次都帶上完整 headers
    let mut current_url = payload.url.clone();
    let mut current_method = method.clone();
    let mut current_body = payload.body.clone();
    let mut response;
    let max_redirects = 10;

    for i in 0..=max_redirects {
        let mut req = client
            .request(current_method.clone(), &current_url)
            .headers(header_map.clone());

        if let Some(ref body) = current_body {
            req = req.body(body.clone());
        }

        response = req
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;

        let status = response.status();

        // 非 3xx → 不是 redirect，直接回傳結果
        if !status.is_redirection() {
            return build_response(response, start).await;
        }

        // 超過最大 redirect 次數
        if i == max_redirects {
            return Err("Too many redirects (max 10)".to_string());
        }

        // 取得 Location header
        let location = response
            .headers()
            .get("location")
            .and_then(|v| v.to_str().ok())
            .ok_or("Redirect response missing Location header")?
            .to_string();

        // 解析 Location（可能是相對路徑）
        current_url = if location.starts_with("http://") || location.starts_with("https://") {
            location
        } else {
            // 相對路徑 → 基於目前 URL 解析
            let base = reqwest::Url::parse(&current_url)
                .map_err(|e| format!("Invalid base URL: {}", e))?;
            base.join(&location)
                .map_err(|e| format!("Invalid redirect URL: {}", e))?
                .to_string()
        };

        // 303 See Other → 強制轉為 GET 且不帶 body（HTTP 規範）
        if status == reqwest::StatusCode::SEE_OTHER {
            current_method = reqwest::Method::GET;
            current_body = None;
        }
        // 301/302 且原始為 POST → 轉為 GET（符合瀏覽器 / Postman 行為）
        else if (status == reqwest::StatusCode::MOVED_PERMANENTLY
            || status == reqwest::StatusCode::FOUND)
            && current_method == reqwest::Method::POST
        {
            current_method = reqwest::Method::GET;
            current_body = None;
        }
    }

    Err("Unexpected redirect loop".to_string())
}

/// 從 reqwest Response 建構回傳結構
async fn build_response(
    response: reqwest::Response,
    start: Instant,
) -> Result<HttpResponsePayload, String> {
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
            header_size += (key.as_str().len() + 2 + v.len() + 2) as u64;
            resp_headers.insert(key.to_string(), v.to_string());
        }
    }

    // 取得原始傳輸大小
    let content_length: Option<u64> = resp_headers
        .get("content-length")
        .and_then(|v| v.parse().ok());

    // 判斷是否為二進位內容
    let content_type = resp_headers
        .get("content-type")
        .cloned()
        .unwrap_or_default();
    let is_binary = is_binary_content_type(&content_type);

    // Read body
    let body_bytes = response
        .bytes()
        .await
        .map_err(|e| format!("Failed to read response body: {}", e))?;

    let duration = start.elapsed().as_millis() as u64;

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
