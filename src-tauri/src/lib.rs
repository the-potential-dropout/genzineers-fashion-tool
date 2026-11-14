// Copyright (c) 2026 Genzineers (genzineers.com). All rights reserved.
// Licensed under the Genzineers Source-Available License. See LICENSE.
use std::process::Command;

/// Convert a Blender .blend file to GLB using a locally installed Blender
/// (headless). Returns the GLB bytes.
#[tauri::command]
fn convert_blend(data: Vec<u8>) -> Result<Vec<u8>, String> {
    let dir = std::env::temp_dir().join(format!("gft-blend-{}", std::process::id()));
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let input = dir.join("in.blend");
    let output = dir.join("out.glb");
    std::fs::write(&input, data).map_err(|e| e.to_string())?;
    let candidates: Vec<String> = if cfg!(target_os = "windows") {
        let mut v = vec!["blender".to_string()];
        if let Ok(pf) = std::env::var("ProgramFiles") {
            if let Ok(entries) = std::fs::read_dir(std::path::Path::new(&pf).join("Blender Foundation")) {
                for e in entries.flatten() { v.push(e.path().join("blender.exe").to_string_lossy().to_string()); }
            }
        }
        v
    } else if cfg!(target_os = "macos") {
        vec!["/Applications/Blender.app/Contents/MacOS/Blender".into(), "blender".into()]
    } else {
        vec!["blender".into()]
    };
    let script = format!("import bpy; bpy.ops.export_scene.gltf(filepath=r'{}', export_format='GLB')", output.to_string_lossy());
    for exe in candidates {
        let ok = Command::new(&exe).args(["-b", &input.to_string_lossy(), "--python-expr", &script]).output();
        if let Ok(out) = ok {
            if out.status.success() && output.exists() {
                let bytes = std::fs::read(&output).map_err(|e| e.to_string())?;
                let _ = std::fs::remove_dir_all(&dir);
                return Ok(bytes);
            }
        }
    }
    let _ = std::fs::remove_dir_all(&dir);
    Err("Blender was not found. Install Blender (blender.org) or export your model as .glb from Blender and import that.".into())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![convert_blend])
        .run(tauri::generate_context!())
        .expect("error while running Genzineers Fashion Tool");
}
