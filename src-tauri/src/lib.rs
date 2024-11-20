// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

// use tauri::path::BaseDirectory;
// use tauri::Manager;
use dirs;
use regex::Regex;
use serde::Serialize;
use serde_json::Value;
use std::fs;
use std::io::Write;
use std::path::Path;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn rename_file(file_path: String, selection: Value) -> Result<(), String> {
    // ルールを取得
    let rule = selection["rule"].as_str().ok_or("Invalid rule format")?;

    // 正規表現で{}で囲まれた部分を抽出
    let re = Regex::new(r"\{(\w+)\}").map_err(|e| e.to_string())?;
    let mut new_name = rule.to_string();

    for cap in re.captures_iter(rule) {
        let key = &cap[1];
        let value = selection[key]
            .as_str()
            .ok_or(format!("Invalid format for key: {}", key))?;
        new_name = new_name.replace(&format!("{{{}}}", key), value);
    }

    new_name = new_name + "." + selection["extends"].as_str().ok_or("Invalid rule format")?;

    let path = Path::new(&file_path);
    let new_path = path.with_file_name(new_name);
    fs::rename(&path, &new_path).map_err(|e| e.to_string())?;
    Ok(())
}

#[derive(Serialize)]
struct FileFormatResponse {
    format: Value,
    name: String,
    extension: String,
    keys: Vec<String>,
}

#[tauri::command]
fn get_file_format(file_path: String) -> Result<Value, String> {
    let path = Path::new(&file_path);
    let dir = path.parent().ok_or("Invalid file path")?;
    let resource_path = dir.join("fileformat.json");

    let file = std::fs::File::open(&resource_path).map_err(|e| e.to_string())?;
    let config: Value = serde_json::from_reader(file).map_err(|e| e.to_string())?;

    let file_name = path
        .file_stem()
        .and_then(|s| s.to_str())
        .ok_or("Invalid file name")?
        .to_string();
    let extension = path
        .extension()
        .and_then(|s| s.to_str())
        .ok_or("Invalid file extension")?
        .to_string();

    // ruleからキーを抽出
    let rule = config["rule"].as_str().ok_or("Invalid rule format")?;
    let re = Regex::new(r"\{(\w+)\}").map_err(|e| e.to_string())?;
    let keys: Vec<String> = re
        .captures_iter(rule)
        .map(|cap| cap[1].to_string())
        .collect();

    let response = FileFormatResponse {
        format: config,
        name: file_name,
        extension,
        keys,
    };

    Ok(serde_json::to_value(response).map_err(|e| e.to_string())?)
}

#[tauri::command]
fn save_file(file_name: String, file_data: Vec<u8>) -> Result<(), String> {
    let desktop_path = dirs::desktop_dir().ok_or("Could not get desktop directory")?;
    let destination = desktop_path.join(file_name);
    let mut file = std::fs::File::create(&destination).map_err(|e| e.to_string())?;
    file.write_all(&file_data).map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            rename_file,
            get_file_format,
            save_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
