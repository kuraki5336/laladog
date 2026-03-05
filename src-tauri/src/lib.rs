mod commands;
mod db;

use tauri_plugin_sql::{Migration, MigrationKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create initial tables",
            sql: db::MIGRATION_SQL,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "add workspaces table and workspace_id column",
            sql: db::MIGRATION_V2_SQL,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "add team_id to workspaces for team collaboration",
            sql: db::MIGRATION_V3_SQL,
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:laladog.db", migrations)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            commands::http::send_http_request,
            commands::oauth::google_oauth_login,
            commands::api::api_request
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
