# TODO: add the move config which working 
# TODO: add the copy all button 

import tkinter as tk
from tkinter import filedialog, messagebox, ttk, scrolledtext
import requests
import os
from pathlib import Path
import json
import subprocess
import tempfile
import time
import threading
import re
import base64
from urllib.parse import urlparse, parse_qs, unquote
import sys
import platform
import zipfile
import socket
import concurrent.futures
from queue import Queue

def get_backend_url():
    """
    Get the backend URL from environment variable or return default.
    """
    return os.environ.get('BACKEND_URL', 'http://209.38.203.71:5001')

class OptimizedV2RayTester:
    def __init__(self, root_tk=None):
        """
        Initializes the V2RayTester with optimizations for faster testing.
        """
        self.root_tk = root_tk
        self.log_callback = None
        self.v2ray_path = self.find_v2ray_executable()
        
        # Optimization: Reuse V2Ray processes with different ports
        self.process_pool = []
        self.max_concurrent_tests = 5  # Reduced from unlimited to prevent resource exhaustion
        self.base_socks_port = 10800  # Starting port for SOCKS proxies
        
    def set_log_callback(self, callback):
        """Set callback function for logging"""
        self.log_callback = callback
    
    def log(self, message):
        """Log message to callback if available"""
        if self.log_callback:
            self.log_callback(message)
        print(message)
    
    def find_v2ray_executable(self):
        """Find V2Ray executable in common locations or offer to download it."""
        executable_name = "v2ray.exe" if platform.system() == "Windows" else "v2ray"
        local_path = os.path.join("v2ray_core", executable_name)

        common_paths = [
            local_path,
            "v2ray",
            "./v2ray",
            "./v2ray.exe",
            "C:/Program Files/v2ray/v2ray.exe",
            "/usr/bin/v2ray",
            "/usr/local/bin/v2ray",
        ]
        
        for path in common_paths:
            try:
                result = subprocess.run([path, "version"], 
                                      capture_output=True, text=True, timeout=5,
                                      check=False)
                if result.returncode == 0 and ("V2Ray" in result.stdout or "Xray" in result.stdout):
                    self.log(f"Found V2Ray executable at: {path}")
                    return path
            except (subprocess.TimeoutExpired, FileNotFoundError, OSError):
                continue
        
        if self.root_tk:
             return self._prompt_and_download_v2ray()
        
        return None

    def _prompt_and_download_v2ray(self):
        """Ask user if they want to download V2Ray core and initiates download."""
        should_download = messagebox.askyesno(
            "V2Ray Not Found",
            "The V2Ray executable was not found on your system.\n\n"
            "Would you like to automatically download the latest V2Ray core?"
        )
        
        if should_download:
            messagebox.showinfo(
                "Download Starting", 
                "The download will start in the background. The app may be unresponsive for a moment."
            )
            self.root_tk.update_idletasks()

            downloaded_path = self._download_v2ray_core()

            if downloaded_path:
                messagebox.showinfo(
                    "Success", 
                    f"V2Ray downloaded successfully to the 'v2ray_core' folder.\n\nPath: {os.path.abspath(downloaded_path)}"
                )
                return downloaded_path
            else:
                messagebox.showerror(
                    "Download Failed", 
                    "Could not automatically download V2Ray core. Please install it manually and ensure it's in your system's PATH."
                )
        return None

    def _download_v2ray_core(self):
        """Downloads and extracts the latest V2Ray core for the current OS."""
        try:
            system = platform.system()
            machine = platform.machine().lower()

            os_map = {'Windows': 'windows', 'Linux': 'linux', 'Darwin': 'macos'}
            if system not in os_map:
                self.log(f"Unsupported OS: {system}")
                return None
            os_name = os_map[system]

            if 'amd64' in machine or 'x86_64' in machine:
                arch_name = '64'
            elif 'arm64' in machine or 'aarch64' in machine:
                arch_name = 'arm64-v8a'
            elif 'arm' in machine:
                 arch_name = 'arm32-v7a'
            else:
                arch_name = '32'
            
            self.log("Fetching latest V2Ray release info from GitHub...")
            api_url = "https://api.github.com/repos/v2fly/v2ray-core/releases/latest"
            response = requests.get(api_url, timeout=30)
            response.raise_for_status()
            release_data = response.json()
            
            asset_filename = f"v2ray-{os_name}-{arch_name}.zip"
            download_url = None
            for asset in release_data.get('assets', []):
                if asset.get('name') == asset_filename:
                    download_url = asset.get('browser_download_url')
                    break
            
            if not download_url:
                messagebox.showerror("Download Error", f"Could not find a compatible V2Ray version for your system ({asset_filename}).")
                return None

            download_dir = "v2ray_core"
            os.makedirs(download_dir, exist_ok=True)
            zip_path = os.path.join(download_dir, "v2ray.zip")
            
            self.log(f"Downloading {download_url}...")
            with requests.get(download_url, stream=True, timeout=60) as r:
                r.raise_for_status()
                with open(zip_path, 'wb') as f:
                    for chunk in r.iter_content(chunk_size=8192):
                        f.write(chunk)
            
            self.log(f"Extracting {zip_path}...")
            with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                zip_ref.extractall(download_dir)
            
            os.remove(zip_path)

            executable_name = "v2ray.exe" if system == "Windows" else "v2ray"
            executable_path = os.path.join(download_dir, executable_name)

            if os.path.exists(executable_path):
                if system != "Windows":
                    os.chmod(executable_path, 0o755)
                
                self.log(f"V2Ray executable is now at: {executable_path}")
                return executable_path
            
            self.log(f"Executable '{executable_name}' not found after extraction.")
            return None

        except Exception as e:
            messagebox.showerror("Download Error", f"An error occurred during download:\n{e}")
            self.log(f"An error occurred during V2Ray download: {e}")
            return None

    def parse_vmess_url(self, url):
        """Parse vmess:// URL to extract server info"""
        try:
            if not url.startswith("vmess://"):
                return None
            
            encoded_part = url[8:]
            decoded = base64.b64decode(encoded_part + "=" * (-len(encoded_part) % 4)).decode('utf-8')
            config = json.loads(decoded)
            
            return {
                'protocol': 'vmess',
                'address': config.get('add', ''),
                'port': int(config.get('port', 443)),
                'id': config.get('id', ''),
                'name': config.get('ps', 'Unknown')
            }
        except Exception as e:
            self.log(f"Error parsing vmess URL: {e}")
            return None
    
    def parse_vless_url(self, url):
        """Parse vless:// URL to extract server info"""
        try:
            if not url.startswith("vless://"):
                return None
            
            parsed = urlparse(url)
            query = parse_qs(parsed.query)
            
            name = "Unknown"
            if 'remarks' in query:
                name = unquote(query['remarks'][0])
            elif parsed.fragment:
                name = unquote(parsed.fragment)
            
            return {
                'protocol': 'vless',
                'address': parsed.hostname,
                'port': parsed.port or 80,
                'id': parsed.username,
                'name': name,
                'path': query.get('path', ['/'])[0],
                'type': query.get('type', ['tcp'])[0],
                'security': query.get('security', ['none'])[0],
                'encryption': query.get('encryption', ['none'])[0]
            }
        except Exception as e:
            self.log(f"Error parsing vless URL: {e}")
            return None
    
    def parse_config_text(self, config_text):
        """Parse V2Ray config text to extract server information"""
        try:
            vmess_urls = re.findall(r'vmess://[A-Za-z0-9+/=]+', config_text)
            if vmess_urls:
                return self.parse_vmess_url(vmess_urls[0])
            
            vless_urls = re.findall(r'vless://[^\s\n]+', config_text)
            if vless_urls:
                return self.parse_vless_url(vless_urls[0])

            if config_text.strip().startswith('{'):
                config = json.loads(config_text)
                outbounds = config.get('outbounds', [])
                if outbounds:
                    outbound = outbounds[0]
                    settings = outbound.get('settings', {})
                    vnext = settings.get('vnext', [{}])
                    if vnext:
                        vnext = vnext[0]
                        return {
                            'protocol': outbound.get('protocol', 'unknown'),
                            'address': vnext.get('address', ''),
                            'port': vnext.get('port', 443),
                            'name': 'V2Ray JSON Config'
                        }
            
            address_match = re.search(r'"address":\s*"([^"]+)"', config_text)
            port_match = re.search(r'"port":\s*(\d+)', config_text)
            
            if address_match and port_match:
                return {
                    'protocol': 'unknown',
                    'address': address_match.group(1),
                    'port': int(port_match.group(1)),
                    'name': 'Parsed Config'
                }
                
        except Exception as e:
            self.log(f"Error parsing config: {e}")
        
        return None
    
    def create_test_config_from_vless(self, server_info, socks_port):
        """Create V2Ray config from vless server info with custom SOCKS port"""
        config = {
            "log": {"loglevel": "error"},  # Reduced logging for speed
            "inbounds": [{
                "tag": "socks-in",
                "port": socks_port,
                "listen": "127.0.0.1",
                "protocol": "socks",
                "settings": {"auth": "noauth", "udp": False}  # Disable UDP for faster testing
            }],
            "outbounds": [{
                "tag": "proxy",
                "protocol": "vless",
                "settings": {
                    "vnext": [{
                        "address": server_info['address'],
                        "port": server_info['port'],
                        "users": [{
                            "id": server_info['id'],
                            "encryption": server_info.get('encryption', 'none')
                        }]
                    }]
                },
                "streamSettings": {
                    "network": server_info.get('type', 'tcp')
                }
            }]
        }
        
        if server_info.get('type') == 'ws':
            config["outbounds"][0]["streamSettings"]["wsSettings"] = {
                "path": server_info.get('path', '/')
            }
        
        return config
    
    def create_test_config_from_vmess(self, server_info, socks_port):
        """Create V2Ray config from vmess server info with custom SOCKS port"""
        config = {
            "log": {"loglevel": "error"},  # Reduced logging for speed
            "inbounds": [{
                "tag": "socks-in",
                "port": socks_port,
                "listen": "127.0.0.1",
                "protocol": "socks",
                "settings": {"auth": "noauth", "udp": False}  # Disable UDP for faster testing
            }],
            "outbounds": [{
                "tag": "proxy",
                "protocol": "vmess",
                "settings": {
                    "vnext": [{
                        "address": server_info['address'],
                        "port": server_info['port'],
                        "users": [{
                            "id": server_info['id'],
                            "security": "auto"
                        }]
                    }]
                }
            }]
        }
        
        return config
    
    def create_test_config(self, config_text, socks_port):
        """Create a temporary V2Ray config for testing with custom SOCKS port"""
        try:
            if config_text.strip().startswith('{'):
                base_config = json.loads(config_text)
                
                if 'inbounds' not in base_config:
                    base_config['inbounds'] = []
                
                # Replace existing SOCKS inbound with our custom port
                base_config['inbounds'] = [ib for ib in base_config['inbounds'] 
                                         if not (ib.get('protocol') == 'socks' and ib.get('port') == 1080)]
                
                base_config['inbounds'].append({
                    "tag": "socks-test",
                    "port": socks_port,
                    "listen": "127.0.0.1",
                    "protocol": "socks",
                    "settings": {"auth": "noauth", "udp": False}
                })
                
                # Optimize logging
                base_config['log'] = {"loglevel": "error"}
                
                return base_config
            else:
                server_info = self.parse_config_text(config_text)
                if not server_info:
                    return None
                
                if server_info['protocol'] == 'vless':
                    return self.create_test_config_from_vless(server_info, socks_port)
                elif server_info['protocol'] == 'vmess':
                    return self.create_test_config_from_vmess(server_info, socks_port)
                else:
                    return None
                
        except Exception as e:
            self.log(f"Error creating test config: {e}")
            return None
    
    def fast_connectivity_check(self, server_info, timeout=3):
        """Fast TCP connectivity check before full V2Ray test"""
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(timeout)
            start_time = time.time()
            result = sock.connect_ex((server_info['address'], server_info['port']))
            end_time = time.time()
            sock.close()
            
            if result == 0:
                latency = int((end_time - start_time) * 1000)
                return latency, True
            else:
                return -1, False
                
        except Exception:
            return -1, False
    
    def test_config_latency_optimized(self, config_text, timeout=8):
        """Optimized V2Ray config testing with faster startup and reduced timeouts"""
        if not self.v2ray_path:
            return -1, "V2Ray executable not found"
        
        server_info = self.parse_config_text(config_text)
        if not server_info:
            return -1, "Could not parse config"
        
        # Quick connectivity pre-check
        tcp_latency, is_reachable = self.fast_connectivity_check(server_info, timeout=3)
        if not is_reachable:
            return -1, "Server unreachable"
        
        # Find available port for this test
        socks_port = self.base_socks_port
        while socks_port < self.base_socks_port + 100:  # Try up to 100 ports
            try:
                test_sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                test_sock.bind(('127.0.0.1', socks_port))
                test_sock.close()
                break
            except OSError:
                socks_port += 1
        else:
            return -1, "No available ports"
        
        test_config = self.create_test_config(config_text, socks_port)
        if not test_config:
            return -1, "Could not create test config"
        
        process = None
        config_file = ''
        try:
            # Write config to temporary file
            with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
                json.dump(test_config, f, separators=(',', ':'))  # Compact JSON
                config_file = f.name
            
            # Start V2Ray process with minimal startup time
            cmd = [self.v2ray_path, "run", "-c", config_file]
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.DEVNULL,  # Ignore output for speed
                stderr=subprocess.DEVNULL,
                text=True
            )
            
            # Reduced startup wait time
            time.sleep(1.5)
            
            if process.poll() is not None:
                return -1, "V2Ray failed to start"
            
            # Test with reduced timeout
            proxies = {
                'http': f'socks5://127.0.0.1:{socks_port}',
                'https': f'socks5://127.0.0.1:{socks_port}'
            }
            
            start_time = time.time()
            try:
                # Use lightweight endpoint with shorter timeout
                response = requests.get("http://www.google.com/generate_204", 
                                      proxies=proxies, timeout=timeout//2)
                end_time = time.time()
                
                latency = int((end_time - start_time) * 1000)
                return latency, "Success"
                
            except requests.exceptions.RequestException:
                # If proxy test fails, return the TCP connection latency
                if tcp_latency > 0:
                    return tcp_latency, "Direct connection"
                else:
                    return -1, "Connection failed"
            
        except Exception as e:
            return -1, f"Test error: {str(e)[:20]}"
        finally:
            # Quick cleanup
            if process:
                try:
                    process.terminate()
                    try:
                        process.wait(timeout=2)
                    except subprocess.TimeoutExpired:
                        process.kill()
                except:
                    pass
            
            if os.path.exists(config_file):
                try:
                    os.unlink(config_file)
                except:
                    pass
    
    def test_multiple_configs_parallel(self, configs, progress_callback=None):
        """Test multiple configs in parallel with limited concurrency"""
        results = {}
        
        def test_single_config(config_data):
            config_id = config_data.get('title', 'Unknown')
            config_text = config_data.get('text', '')
            latency, status = self.test_config_latency_optimized(config_text)
            return config_id, latency, status
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=self.max_concurrent_tests) as executor:
            future_to_config = {
                executor.submit(test_single_config, config): config 
                for config in configs
            }
            
            completed = 0
            total = len(configs)
            
            for future in concurrent.futures.as_completed(future_to_config):
                config = future_to_config[future]
                try:
                    config_id, latency, status = future.result()
                    results[config_id] = (latency, status)
                except Exception as e:
                    config_id = config.get('title', 'Unknown')
                    results[config_id] = (-1, f"Error: {str(e)[:20]}")
                
                completed += 1
                if progress_callback:
                    progress_callback(completed, total)
        
        return results


class FileUploaderApp:
    def __init__(self, root):
        self.root = root
        self.root.title("File Uploader to Django Server")
        self.root.geometry("700x600")
        self.root.resizable(True, True)
        
        # Variables
        self.server_url = get_backend_url()
        # Pass the root window to the tester class so it can show message boxes
        self.v2ray_tester = OptimizedV2RayTester(root)
        self.v2ray_tester.set_log_callback(self.log_message)
        
        # Log window
        self.log_window = None
        
        # Create UI with tabs
        self.create_widgets()
        
    def log_message(self, message):
        """Log message to the log window if it exists"""
        if self.log_window and hasattr(self, 'log_text'):
            self.log_text.insert(tk.END, message + "\n")
            self.log_text.see(tk.END)
            self.log_window.update_idletasks()
    
    def show_log_window(self):
        """Show the log window"""
        if self.log_window is None or not self.log_window.winfo_exists():
            self.log_window = tk.Toplevel(self.root)
            self.log_window.title("V2Ray Test Logs")
            self.log_window.geometry("800x500")
            
            # Create log text widget with scrollbar
            log_frame = tk.Frame(self.log_window)
            log_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
            
            self.log_text = scrolledtext.ScrolledText(log_frame, font=("Consolas", 10))
            self.log_text.pack(fill=tk.BOTH, expand=True)
            
            # Clear button
            clear_btn = tk.Button(self.log_window, text="Clear Logs", 
                                command=lambda: self.log_text.delete(1.0, tk.END),
                                bg="#f44336", fg="white")
            clear_btn.pack(pady=5)
        else:
            self.log_window.lift()
        
    def create_widgets(self):
        url_frame = tk.Frame(self.root)
        url_frame.pack(fill=tk.X, padx=10, pady=(10, 5))
        
        tk.Label(url_frame, text="Server URL:", font=("Arial", 10)).pack(anchor=tk.W)
        self.url_entry = tk.Entry(url_frame, font=("Arial", 10))
        self.url_entry.insert(0, self.server_url)
        self.url_entry.pack(fill=tk.X, pady=(5, 0))
        
        self.notebook = ttk.Notebook(self.root)
        self.notebook.pack(fill=tk.BOTH, expand=True, padx=10, pady=(5, 10))
        
        self.receive_frame = tk.Frame(self.notebook)
        self.config_frame = tk.Frame(self.notebook)
        
        self.notebook.add(self.receive_frame, text="Receive")
        self.notebook.add(self.config_frame, text="Config")
        
        self.create_receive_tab()
        self.create_config_tab()
        
    def create_receive_tab(self):
        main_frame = tk.Frame(self.receive_frame, padx=20, pady=20)
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        title_label = tk.Label(main_frame, text="Received Files", 
                               font=("Arial", 16, "bold"))
        title_label.pack(pady=(0, 10))
        
        control_frame = tk.Frame(main_frame)
        control_frame.pack(fill=tk.X, pady=(0, 10))
        
        refresh_btn = tk.Button(control_frame, text="Refresh Data", 
                                command=self.load_receive_data,
                                font=("Arial", 10),
                                bg="#2196F3", fg="white")
        refresh_btn.pack(side=tk.LEFT, padx=(0, 10))
        
        self.download_btn = tk.Button(control_frame, text="Download Selected", 
                                      command=self.download_selected_file,
                                      font=("Arial", 10),
                                      bg="#FF9800", fg="white",
                                      state=tk.DISABLED)
        self.download_btn.pack(side=tk.LEFT)
        
        tree_frame = tk.Frame(main_frame)
        tree_frame.pack(fill=tk.BOTH, expand=True)
        
        scrollbar = tk.Scrollbar(tree_frame)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        
        self.tree = ttk.Treeview(tree_frame, columns=("ID", "Name", "Size", "Uploaded By", "Date"), 
                                 show="headings", yscrollcommand=scrollbar.set)
        scrollbar.config(command=self.tree.yview)
        
        self.tree.heading("ID", text="ID")
        self.tree.heading("Name", text="File Name")
        self.tree.heading("Size", text="Size (bytes)")
        self.tree.heading("Uploaded By", text="Uploaded By")
        self.tree.heading("Date", text="Upload Date")
        
        self.tree.column("ID", width=50)
        self.tree.column("Name", width=150)
        self.tree.column("Size", width=100)
        self.tree.column("Uploaded By", width=100)
        self.tree.column("Date", width=120)
        
        self.tree.pack(fill=tk.BOTH, expand=True)
        
        self.tree.bind("<<TreeviewSelect>>", self.on_tree_select)
        
        self.receive_status = tk.Label(main_frame, text="Click 'Refresh Data' to load files", 
                                       font=("Arial", 10), fg="blue")
        self.receive_status.pack(pady=(10, 0))
        
        self.download_status = tk.Label(main_frame, text="", font=("Arial", 10), fg="green")
        self.download_status.pack(pady=(5, 0))
        
    def create_config_tab(self):
        main_frame = tk.Frame(self.config_frame, padx=20, pady=20)
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        title_label = tk.Label(main_frame, text="V2Ray Configurations", 
                               font=("Arial", 16, "bold"))
        title_label.pack(pady=(0, 10))
        
        control_frame = tk.Frame(main_frame)
        control_frame.pack(fill=tk.X, pady=(0, 10))
        
        refresh_btn = tk.Button(control_frame, text="Refresh Configs", 
                                command=self.load_config_data,
                                font=("Arial", 10),
                                bg="#2196F3", fg="white")
        refresh_btn.pack(side=tk.LEFT, padx=(0, 10))
        
        test_all_btn = tk.Button(control_frame, text="Test All (Parallel)", 
                                 command=self.test_all_configs_parallel,
                                 font=("Arial", 10),
                                 bg="#FF9800", fg="white")
        test_all_btn.pack(side=tk.LEFT, padx=(0, 10))
        
        # Show Logs button
        logs_btn = tk.Button(control_frame, text="Show Logs", 
                            command=self.show_log_window,
                            font=("Arial", 10),
                            bg="#9C27B0", fg="white")
        logs_btn.pack(side=tk.LEFT, padx=(0, 10))
        
        v2ray_status = "✓ Found" if self.v2ray_tester.v2ray_path else "✗ Not Found"
        v2ray_color = "green" if self.v2ray_tester.v2ray_path else "red"
        status_label = tk.Label(control_frame, text=f"V2Ray: {v2ray_status}", 
                                font=("Arial", 9), fg=v2ray_color)
        status_label.pack(side=tk.RIGHT)
        
        canvas_frame = tk.Frame(main_frame)
        canvas_frame.pack(fill=tk.BOTH, expand=True)
        
        self.config_canvas = tk.Canvas(canvas_frame)
        scrollbar = tk.Scrollbar(canvas_frame, orient="vertical", command=self.config_canvas.yview)
        self.config_scrollable_frame = tk.Frame(self.config_canvas)
        
        self.config_scrollable_frame.bind(
            "<Configure>",
            lambda e: self.config_canvas.configure(
                scrollregion=self.config_canvas.bbox("all")
            )
        )
        
        self.config_canvas.create_window((0, 0), window=self.config_scrollable_frame, anchor="nw")
        self.config_canvas.configure(yscrollcommand=scrollbar.set)
        
        self.config_canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
        
        self.config_status = tk.Label(main_frame, text="Click 'Refresh Configs' to load configurations", 
                                      font=("Arial", 10), fg="blue")
        self.config_status.pack(pady=(10, 0))
        
    def on_tree_select(self, event):
        self.download_btn.config(state=tk.NORMAL if self.tree.selection() else tk.DISABLED)
            
    def copy_config_to_clipboard(self, config_text):
        self.root.clipboard_clear()
        self.root.clipboard_append(config_text)
        self.root.update()
        self.config_status.config(text="Configuration copied to clipboard!", fg="green")
            
    def load_config_data(self):
        server_url = self.url_entry.get().strip() or self.server_url
        api_url = f"{server_url.rstrip('/')}/tickets/api/config/"
        
        try:
            self.config_status.config(text="Loading configurations...", fg="blue")
            self.config_frame.update_idletasks()
            
            # Increase timeout to 30 seconds for better handling of network latency
            response = requests.get(api_url, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                
                for widget in self.config_scrollable_frame.winfo_children():
                    widget.destroy()
                
                configs = data.get("configs", [])
                
                for config in configs:
                    self.create_config_card(config)
                
                self.config_status.config(text=f"Loaded {len(configs)} configurations", fg="green")
            else:
                self.config_status.config(text=f"Error: Status code {response.status_code}", fg="red")
                
        except Exception as e:
            self.config_status.config(text=f"Error: {str(e)}", fg="red")
    
    def create_config_card(self, config):
        """Create a config card widget"""
        card_frame = tk.Frame(self.config_scrollable_frame, relief=tk.RAISED, bd=2, bg="white")
        card_frame.pack(fill=tk.X, padx=5, pady=5)
        
        title_frame = tk.Frame(card_frame, bg="white")
        title_frame.pack(fill=tk.X, padx=10, pady=(10, 5))
        
        title_label = tk.Label(title_frame, text=config.get("title", "Unknown"), 
                              font=("Arial", 12, "bold"), bg="white")
        title_label.pack(side=tk.LEFT)
        
        ping_label = tk.Label(title_frame, text="Ping: --", 
                             font=("Arial", 10), bg="white", fg="gray")
        ping_label.pack(side=tk.RIGHT, padx=(0, 10))
        ping_label.config_data = config
        
        test_btn = tk.Button(title_frame, text="Test", 
                            command=lambda c=config, p=ping_label: self.test_single_config(c, p),
                            font=("Arial", 8), bg="#FF9800", fg="white")
        test_btn.pack(side=tk.RIGHT, padx=(0, 5))
        
        copy_btn = tk.Button(title_frame, text="Copy", 
                            command=lambda c=config.get("text", ""): self.copy_config_to_clipboard(c),
                            font=("Arial", 8), bg="#4CAF50", fg="white")
        copy_btn.pack(side=tk.RIGHT, padx=(0, 5))
        
        # Show config preview (first 50 chars)
        preview_text = config.get("text", "")[:50] + "..." if len(config.get("text", "")) > 50 else config.get("text", "")
        preview_label = tk.Label(card_frame, text=preview_text, 
                                font=("Arial", 9), bg="white", fg="gray",
                                wraplength=400, justify=tk.LEFT)
        preview_label.pack(fill=tk.X, padx=10, pady=(0, 10))
    
    def test_single_config(self, config, ping_label):
        """Test a single V2Ray configuration in a separate thread."""
        def test_in_thread():
            ping_label.config(text="Testing...", fg="orange")
            self.root.update_idletasks()
            
            config_text = config.get("text", "")
            # Only log if log window is already open
            if self.log_window and hasattr(self, 'log_text'):
                self.log_message(f"\n{'='*60}")
                self.log_message(f"TESTING CONFIG: {config.get('title', 'Unknown')}")
                self.log_message(f"{'='*60}")
            
            latency, status = self.v2ray_tester.test_config_latency_optimized(config_text)
            
            if latency > 0:
                ping_label.config(text=f"Ping: {latency}ms", fg="green")
                # Only log if log window is already open
                if self.log_window and hasattr(self, 'log_text'):
                    self.log_message(f"✅ RESULT: SUCCESS - {latency}ms")
            else:
                ping_label.config(text=f"Failed: {status[:15]}", fg="red")
                # Only log if log window is already open
                if self.log_window and hasattr(self, 'log_text'):
                    self.log_message(f"❌ RESULT: FAILED - {status}")
                
        threading.Thread(target=test_in_thread, daemon=True).start()
            
    def show_config_detail(self, config):
        detail_window = tk.Toplevel(self.root)
        detail_window.title(f"Config - {config.get('title', 'Unknown')}")
        detail_window.geometry("600x400")
        
        main_frame = tk.Frame(detail_window)
        main_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        back_btn = tk.Button(main_frame, text="← Back", command=detail_window.destroy,
                             font=("Arial", 10), bg="#2196F3", fg="white")
        back_btn.pack(anchor=tk.W, pady=(0, 10))
        
        title_label = tk.Label(main_frame, text=config.get("title", "Unknown"), 
                               font=("Arial", 16, "bold"))
        title_label.pack(pady=(0, 10))
        
        text_frame = tk.Frame(main_frame)
        text_frame.pack(fill=tk.BOTH, expand=True)
        
        text_scrollbar_y = tk.Scrollbar(text_frame, orient=tk.VERTICAL)
        config_text_widget = tk.Text(text_frame, yscrollcommand=text_scrollbar_y.set,
                                     font=("Consolas", 9), wrap=tk.WORD)
        
        full_text = config.get("text", "")
        config_text_widget.insert(tk.END, full_text)
        config_text_widget.config(state=tk.DISABLED)
        
        text_scrollbar_y.config(command=config_text_widget.yview)
        text_scrollbar_y.pack(side=tk.RIGHT, fill=tk.Y)
        config_text_widget.pack(fill=tk.BOTH, expand=True)
        
        button_frame = tk.Frame(main_frame)
        button_frame.pack(fill=tk.X, pady=(10, 0))
        
        copy_btn = tk.Button(button_frame, text="Copy to Clipboard", 
                             command=lambda: self.copy_config_to_clipboard(full_text),
                             font=("Arial", 12), bg="#4CAF50", fg="white")
        copy_btn.pack(side=tk.RIGHT)

    def test_all_configs_parallel(self):
        """Test all visible configurations in parallel using the optimized method."""
        ping_labels = []
        configs = []
        
        # Collect configs and labels
        for card_frame in self.config_scrollable_frame.winfo_children():
            if isinstance(card_frame, tk.Frame):
                title_frame = card_frame.winfo_children()[0]
                for widget in title_frame.winfo_children():
                    if isinstance(widget, tk.Label) and hasattr(widget, 'config_data'):
                        ping_labels.append(widget)
                        configs.append(widget.config_data)

        if not configs:
            self.config_status.config(text="No configurations loaded to test.", fg="orange")
            return

        def progress_callback(completed, total):
            self.config_status.config(text=f"Testing... ({completed}/{total})", fg="blue")
            self.root.update_idletasks()

        def test_all_in_thread():
            total_count = len(configs)
            
            # Set all labels to "Testing..." initially
            for label in ping_labels:
                label.config(text="Testing...", fg="orange")
            self.root.update_idletasks()
            
            # Show log window automatically for parallel testing
            self.show_log_window()
            
            self.log_message(f"\n{'='*80}")
            self.log_message(f"STARTING PARALLEL TEST OF {total_count} CONFIGURATIONS")
            self.log_message(f"Max concurrent tests: {self.v2ray_tester.max_concurrent_tests}")
            self.log_message(f"{'='*80}")
            
            # Run parallel tests
            start_time = time.time()
            results = self.v2ray_tester.test_multiple_configs_parallel(configs, progress_callback)
            end_time = time.time()
            
            # Update results
            successful_tests = 0
            for i, config in enumerate(configs):
                config_title = config.get('title', 'Unknown')
                latency, status = results.get(config_title, (-1, "Unknown error"))
                
                if latency > 0:
                    ping_labels[i].config(text=f"Ping: {latency}ms", fg="green")
                    successful_tests += 1
                else:
                    ping_labels[i].config(text=f"Failed: {status[:15]}", fg="red")
            
            total_time = end_time - start_time
            
            self.config_status.config(
                text=f"Finished testing {total_count} configs in {total_time:.1f}s ({successful_tests} successful)", 
                fg="green"
            )
            
            self.log_message(f"\n{'='*80}")
            self.log_message(f"PARALLEL TEST COMPLETED")
            self.log_message(f"Total time: {total_time:.1f} seconds")
            self.log_message(f"Successful tests: {successful_tests}/{total_count}")
            self.log_message(f"Average time per config: {total_time/total_count:.1f}s")
            self.log_message(f"{'='*80}")
        
        threading.Thread(target=test_all_in_thread, daemon=True).start()

    def download_selected_file(self):
        selection = self.tree.selection()
        if not selection:
            messagebox.showwarning("Warning", "Please select a file to download")
            return
        
        item = self.tree.item(selection[0])
        values = item['values']
        file_name = values[1]
        file_url = values[5] if len(values) > 5 else None
        
        if not file_url:
            messagebox.showerror("Error", "File URL not available")
            return
        
        server_url = (self.url_entry.get().strip() or self.server_url).rstrip('/')
        full_url = server_url + file_url if not file_url.startswith('http') else file_url
        
        try:
            self.download_status.config(text=f"Downloading {file_name}...", fg="blue")
            self.receive_frame.update_idletasks()
            
            response = requests.get(full_url, timeout=30)
            
            if response.status_code == 200:
                save_path = filedialog.asksaveasfilename(initialfile=file_name)
                
                if save_path:
                    with open(save_path, 'wb') as f:
                        f.write(response.content)
                    self.download_status.config(text=f"File downloaded successfully!", fg="green")
                    messagebox.showinfo("Success", f"File saved to:\n{save_path}")
                else:
                    self.download_status.config(text="Download cancelled", fg="orange")
            else:
                self.download_status.config(text=f"Error: Status {response.status_code}", fg="red")
                messagebox.showerror("Error", f"Failed to download file. Status: {response.status_code}")
                
        except Exception as e:
            self.download_status.config(text=f"Error: {str(e)}", fg="red")
            messagebox.showerror("Error", f"Failed to download file: {str(e)}")
        
    def load_receive_data(self):
        server_url = self.url_entry.get().strip() or self.server_url
        api_url = f"{server_url.rstrip('/')}/tickets/api/files/"
        
        try:
            self.receive_status.config(text="Loading data...", fg="blue")
            self.receive_frame.update_idletasks()
            
            response = requests.get(api_url, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                self.tree.delete(*self.tree.get_children())
                
                files = data.get("files", [])
                for file_data in files:
                    upload_date = file_data.get("uploaded_at", "")
                    if upload_date:
                        upload_date = upload_date[:19].replace("T", " ")
                    
                    self.tree.insert("", "end", values=(
                        file_data.get("id", ""), file_data.get("name", ""),
                        file_data.get("size", ""), file_data.get("uploaded_by", ""),
                        upload_date, file_data.get("url", "")
                    ))
                
                self.receive_status.config(text=f"Loaded {len(files)} files", fg="green")
            else:
                self.receive_status.config(text=f"Error: Status code {response.status_code}", fg="red")
                
        except Exception as e:
            self.receive_status.config(text=f"Error: {str(e)}", fg="red")
        
def main():
    root = tk.Tk()
    app = FileUploaderApp(root)
    root.mainloop()

if __name__ == "__main__":
    main()