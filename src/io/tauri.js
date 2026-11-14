// Copyright (c) 2026 Genzineers (genzineers.com). All rights reserved.
// Thin wrapper so web builds never need the Tauri package.
export async function invoke(cmd, args) {
  const t = window.__TAURI_INTERNALS__;
  if (!t) throw new Error('Desktop-only feature');
  return t.invoke(cmd, args);
}
