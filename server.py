#!/usr/bin/env python3
"""
Simple HTTP server for local testing of Better Prompt application.
This helps avoid CORS issues when testing locally.
"""

import http.server
import socketserver
import webbrowser
import os
import sys
from typing import Dict

PORT = 8000

# ----------------- helpers -----------------

def load_env() -> Dict[str, str]:
    """Load a simple KEY=VALUE .env file from project root.
    Lines starting with # are ignored. Quotes around values are trimmed.
    """
    env_path = os.path.join(os.getcwd(), ".env")
    data: Dict[str, str] = {}
    if not os.path.exists(env_path):
        print("ℹ️  .env not found. Using values in config.js (if any).")
        return data
    try:
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                if '=' not in line:
                    continue
                key, value = line.split('=', 1)
                key = key.strip()
                value = value.strip().strip('\"').strip("'")
                data[key] = value
        print("✅ Loaded environment from .env")
    except Exception as e:
        print(f"⚠️  Failed to read .env: {e}")
    return data


def write_runtime_config(env: Dict[str, str]) -> None:
    """Write config.runtime.js so frontend can read API values from .env when available."""
    api_key = env.get("API_KEY")
    api_url = env.get("API_URL")
    if not api_key and not api_url:
        # Nothing to write
        return
    runtime_path = os.path.join(os.getcwd(), "config.runtime.js")
    js = ["// Auto-generated from .env on dev server start\n",
          "window.CONFIG = Object.assign(window.CONFIG || {}, {\n"]
    if api_key:
        js.append(f"  API_KEY: '{api_key.replace('\\', r'\\').replace("'", r"\\'")}',\n")
    if api_url:
        js.append(f"  API_URL: '{api_url.replace('\\', r'\\').replace("'", r"\\'")}',\n")
    js.append("});\n")
    try:
        with open(runtime_path, "w", encoding="utf-8") as f:
            f.writelines(js)
        print(f"✅ Wrote runtime config: {runtime_path}")
    except Exception as e:
        print(f"⚠️  Failed to write runtime config: {e}")


class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add CORS headers to allow local testing
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, api-key')
        super().end_headers()

    def do_OPTIONS(self):
        # Handle preflight requests
        self.send_response(200)
        self.end_headers()


def main():
    # Change to the directory containing this script
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    # Generate runtime config from .env if present
    write_runtime_config(load_env())
    
    with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
        print(f"🚀 Better Prompt server running at http://localhost:{PORT}")
        print(f"📁 Serving files from: {os.getcwd()}")
        print("🌐 Opening browser...")
        print("⏹️  Press Ctrl+C to stop the server")
        
        # Open browser automatically
        webbrowser.open(f'http://localhost:{PORT}')
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n🛑 Server stopped")
            sys.exit(0)


if __name__ == "__main__":
    main()
