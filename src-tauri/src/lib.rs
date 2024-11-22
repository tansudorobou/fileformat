// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

// use tauri::path::BaseDirectory;
// use tauri::Manager;
use dirs;
use regex::Regex;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::fs;
use std::io::Write;
use std::path::Path;
use std::sync::{Mutex, OnceLock};

#[derive(Serialize)]
struct FileFormatResponse {
    format: Value,
    keys: Vec<String>,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(untagged)]
enum SelectionValue {
    Single(String),
    Multiple(Vec<String>),
}

#[derive(Serialize, Deserialize, Debug)]
struct ConfigJsonFormat {
    rule: String,
    selection: Option<HashMap<String, SelectionValue>>,
}

#[derive(Default, Debug)]
struct SavedFile {
    file_path: String,
}

// ファイルの保存先を保持するMutex
static SAVED_FILE: OnceLock<Mutex<SavedFile>> = OnceLock::new();

#[tauri::command]
fn get_file_format(file_path: String) -> Result<Value, String> {
    // ファイルパスの取得
    let path = Path::new(&file_path);

    // SAVED_FILEにファイルパスを保存
    let mut saved_file = SAVED_FILE
        .get_or_init(|| Mutex::new(SavedFile::default()))
        .lock()
        .unwrap();
    saved_file.file_path = file_path.clone();

    // ファイルの拡張子チェック
    if path.extension().and_then(|ext| ext.to_str()) != Some("json") {
        return Err("ファイルの拡張子が正しくありません".to_string());
    }

    // ファイルの読み込み
    let file = std::fs::File::open(&path).map_err(|_| "ファイルが指定されてません".to_string())?;

    // ファイルのデシリアライズ
    let config: ConfigJsonFormat = serde_json::from_reader(file)
        .map_err(|_| "設定ファイルの読み込みに失敗しました".to_string())?;

    // ruleからキーを抽出
    let rule = config.rule.as_str();

    // 正規表現で{}で囲まれた部分を抽出
    let re = Regex::new(r"\{(\w+)\}").map_err(|_| "設定ファイルが正しくありません".to_string())?;

    // キーを抽出
    let keys: Vec<String> = re
        .captures_iter(rule)
        .map(|cap| cap[1].to_string())
        .collect();

    // レスポンスの作成
    let response = FileFormatResponse {
        format: serde_json::to_value(config)
            .map_err(|_| "formatの生成に失敗しました".to_string())?,
        keys,
    };

    // レスポンスを返す
    Ok(serde_json::to_value(response).map_err(|_| "レスポンスに失敗しました".to_string())?)
}

#[tauri::command]
fn save_file(selection: Value, file_data: Vec<u8>, saved_desktop_flag: bool) -> Result<(), String> {
    // ルールを取得
    let rule = selection["rule"]
        .as_str()
        .ok_or("ルールが正しくありません")?;

    // 正規表現で{}で囲まれた部分を抽出
    let re = Regex::new(r"\{(\w+)\}").map_err(|_| "ルールの抽出に失敗しました".to_string())?;
    let mut file_name = rule.to_string();

    // キーを抽出して置換
    for cap in re.captures_iter(rule) {
        let key = &cap[1];
        let value = selection[key]
            .as_str()
            .ok_or("ルールの値を置換することが出来ませんでした")?;
        file_name = file_name.replace(&format!("{{{}}}", key), value);
    }

    // 拡張子を追加
    file_name = file_name
        + "."
        + selection["extension"]
            .as_str()
            .ok_or("拡張子が設定されていないようです")?;

    // 保存先のパスを設定
    let destination = if saved_desktop_flag {
        // ユーザーのデスクトップパスを取得
        let desktop_path = dirs::desktop_dir().ok_or("デスクトップのパスが取得できません")?;
        desktop_path.join(&file_name)
    } else {
        // ファイルの保存先を取得
        let saved_file = SAVED_FILE
            .get_or_init(|| Mutex::new(SavedFile::default()))
            .lock()
            .unwrap();

        let file_path = Path::new(&saved_file.file_path);
        let file_dir = file_path
            .parent()
            .map(|p| p.to_path_buf())
            .unwrap_or_else(|| {
                // ユーザーのデスクトップパスを取得
                dirs::desktop_dir().expect("デスクトップのパスが取得できません")
            });
        file_dir.join(&file_name)
    };

    // ファイル名が重複する場合はエラーメッセージを返す
    if destination.exists() {
        return Err(format!("このファイルは既に存在します\n{}", file_name));
    }

    // ファイルの書き込み
    let mut file = fs::File::create(&destination).map_err(|e| e.to_string())?;

    // ファイルデータの書き込み
    file.write_all(&file_data).map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![get_file_format, save_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
