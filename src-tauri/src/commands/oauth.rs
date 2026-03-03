/// Google OAuth Tauri command（PKCE 流程）
///
/// 流程：
/// 1. 產生 PKCE code_verifier / code_challenge
/// 2. 啟動 localhost:8923 callback server
/// 3. 開啟系統瀏覽器前往 Google OAuth
/// 4. 使用者登入後 Google redirect 回 localhost:8923/callback?code=xxx
/// 5. 用 authorization code + code_verifier 換取 id_token
/// 6. 用 id_token 呼叫 FastAPI 後端換取 JWT
/// 7. 回傳 JWT + user 給前端

use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use base64::Engine;
use rand::RngCore;
use serde::Serialize;
use sha2::{Digest, Sha256};
use std::collections::HashMap;

const GOOGLE_CLIENT_ID: &str =
    "41519520479-6tvnvenpk8k69irl8sf7suuu3bk6su6p.apps.googleusercontent.com";
const GOOGLE_CLIENT_SECRET: &str = "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";
const REDIRECT_URI: &str = "http://localhost:8923/callback";
const AUTH_ENDPOINT: &str = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT: &str = "https://oauth2.googleapis.com/token";

/// 登入結果，回傳給前端
#[derive(Serialize)]
pub struct LoginResult {
    pub access_token: String,
    pub user: LoginUser,
}

#[derive(Serialize)]
pub struct LoginUser {
    pub id: String,
    pub email: String,
    pub name: String,
    pub picture: Option<String>,
}

/// 產生 PKCE code_verifier（43~128 字元的 Base64url 隨機字串）
fn generate_code_verifier() -> String {
    let mut buf = [0u8; 32];
    rand::thread_rng().fill_bytes(&mut buf);
    URL_SAFE_NO_PAD.encode(buf)
}

/// 從 code_verifier 計算 code_challenge（SHA256 → Base64url）
fn generate_code_challenge(verifier: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(verifier.as_bytes());
    let hash = hasher.finalize();
    URL_SAFE_NO_PAD.encode(hash)
}

/// 組裝 Google OAuth authorization URL
fn build_auth_url(code_challenge: &str) -> String {
    format!(
        "{}?client_id={}&redirect_uri={}&response_type=code&scope={}&code_challenge={}&code_challenge_method=S256&access_type=offline&prompt=consent",
        AUTH_ENDPOINT,
        urlencoding::encode(GOOGLE_CLIENT_ID),
        urlencoding::encode(REDIRECT_URI),
        urlencoding::encode("openid email profile"),
        urlencoding::encode(code_challenge),
    )
}

/// 從 callback URL 的 query string 中解析 authorization code
fn extract_code_from_url(url_str: &str) -> Option<String> {
    let full_url = if url_str.starts_with('/') {
        format!("http://localhost{}", url_str)
    } else {
        url_str.to_string()
    };

    let parsed = url::Url::parse(&full_url).ok()?;
    parsed
        .query_pairs()
        .find(|(key, _)| key == "code")
        .map(|(_, value)| value.to_string())
}

/// 用 authorization code + code_verifier 向 Google 換取 tokens
fn exchange_code_for_tokens(
    code: &str,
    code_verifier: &str,
) -> Result<String, String> {
    let client = reqwest::blocking::Client::new();

    let mut params = HashMap::new();
    params.insert("code", code);
    params.insert("client_id", GOOGLE_CLIENT_ID);
    params.insert("client_secret", GOOGLE_CLIENT_SECRET);
    params.insert("redirect_uri", REDIRECT_URI);
    params.insert("grant_type", "authorization_code");
    params.insert("code_verifier", code_verifier);

    let resp = client
        .post(TOKEN_ENDPOINT)
        .form(&params)
        .send()
        .map_err(|e| format!("Token exchange request failed: {}", e))?;

    if !resp.status().is_success() {
        let body = resp.text().unwrap_or_default();
        return Err(format!("Token exchange failed: {}", body));
    }

    let body: serde_json::Value = resp
        .json()
        .map_err(|e| format!("Failed to parse token response: {}", e))?;

    body["id_token"]
        .as_str()
        .map(|s| s.to_string())
        .ok_or_else(|| "No id_token in response".to_string())
}

/// 用 id_token 呼叫 FastAPI 後端，換取 JWT + user
fn call_backend_auth(id_token: &str, api_base: &str) -> Result<LoginResult, String> {
    let client = reqwest::blocking::Client::new();
    let url = format!("{}/auth/google", api_base);

    let mut body = HashMap::new();
    body.insert("id_token", id_token);

    let resp = client
        .post(&url)
        .json(&body)
        .send()
        .map_err(|e| format!("Backend request failed: {}", e))?;

    if !resp.status().is_success() {
        let status = resp.status().as_u16();
        let err_body = resp.text().unwrap_or_default();
        return Err(format!("Backend auth failed ({}): {}", status, err_body));
    }

    let data: serde_json::Value = resp
        .json()
        .map_err(|e| format!("Failed to parse backend response: {}", e))?;

    Ok(LoginResult {
        access_token: data["access_token"]
            .as_str()
            .unwrap_or_default()
            .to_string(),
        user: LoginUser {
            id: data["user"]["id"].as_str().unwrap_or_default().to_string(),
            email: data["user"]["email"].as_str().unwrap_or_default().to_string(),
            name: data["user"]["name"].as_str().unwrap_or_default().to_string(),
            picture: data["user"]["picture"].as_str().map(|s| s.to_string()),
        },
    })
}

/// 登入成功後顯示在瀏覽器的 HTML
const SUCCESS_HTML: &str = r#"<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>LalaDog - Login Success</title></head>
<body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui;background:#f8fafc;">
  <div style="text-align:center;">
    <h1 style="color:#10b981;">&#10004; 登入成功</h1>
    <p style="color:#64748b;">您可以關閉此視窗，返回 LalaDog 應用程式。</p>
  </div>
</body>
</html>"#;

#[tauri::command]
pub async fn google_oauth_login(api_base: String) -> Result<LoginResult, String> {
    // 1. 產生 PKCE pair
    let code_verifier = generate_code_verifier();
    let code_challenge = generate_code_challenge(&code_verifier);

    // 2. 啟動 tiny_http callback server（在背景執行緒）
    let server = tiny_http::Server::http("127.0.0.1:8923")
        .map_err(|e| format!("Failed to start callback server: {}", e))?;

    // 3. 開啟系統瀏覽器前往 Google OAuth
    let auth_url = build_auth_url(&code_challenge);
    tauri_plugin_opener::open_url(&auth_url, None::<&str>)
        .map_err(|e| format!("Failed to open browser: {}", e))?;

    // 4. 等待 callback（最多 5 分鐘）
    let authorization_code = tokio::task::spawn_blocking(move || -> Result<String, String> {
        let timeout = std::time::Duration::from_secs(300);

        loop {
            let request = match server.recv_timeout(timeout) {
                Ok(Some(req)) => req,
                Ok(None) => return Err("Login timeout: no callback received within 5 minutes".to_string()),
                Err(_) => return Err("Callback server error".to_string()),
            };

            let url = request.url().to_string();

            if !url.starts_with("/callback") {
                let response = tiny_http::Response::from_string("Not Found")
                    .with_status_code(404);
                let _ = request.respond(response);
                continue;
            }

            if let Some(code) = extract_code_from_url(&url) {
                let response = tiny_http::Response::from_string(SUCCESS_HTML)
                    .with_header(
                        "Content-Type: text/html; charset=utf-8"
                            .parse::<tiny_http::Header>()
                            .unwrap(),
                    );
                let _ = request.respond(response);
                return Ok(code);
            } else {
                let error_html = r#"<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>LalaDog - Login Failed</title></head>
<body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui;background:#f8fafc;">
  <div style="text-align:center;">
    <h1 style="color:#ef4444;">&#10008; 登入失敗</h1>
    <p style="color:#64748b;">請關閉此視窗並重試。</p>
  </div>
</body></html>"#;
                let response = tiny_http::Response::from_string(error_html)
                    .with_header(
                        "Content-Type: text/html; charset=utf-8"
                            .parse::<tiny_http::Header>()
                            .unwrap(),
                    );
                let _ = request.respond(response);
                return Err("Google OAuth callback did not contain authorization code".to_string());
            }
        }
    })
    .await
    .map_err(|e| format!("Blocking task failed: {}", e))??;

    // 5. 用 authorization code + code_verifier 換取 id_token
    let verifier = code_verifier.clone();
    let id_token = tokio::task::spawn_blocking(move || {
        exchange_code_for_tokens(&authorization_code, &verifier)
    })
    .await
    .map_err(|e| format!("Token exchange task failed: {}", e))??;

    // 6. 用 id_token 呼叫 FastAPI 後端換取 JWT + user
    let backend_url = api_base;
    let token = id_token;
    let result = tokio::task::spawn_blocking(move || {
        call_backend_auth(&token, &backend_url)
    })
    .await
    .map_err(|e| format!("Backend auth task failed: {}", e))??;

    Ok(result)
}
