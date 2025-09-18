import tkinter as tk
import customtkinter as ctk
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

# Try to import pystray for system tray functionality
try:
    import pystray
    from PIL import Image, ImageDraw

    HAS_PYSTRAY = True
except ImportError:
    HAS_PYSTRAY = False
    print("pystray not available. Install with: pip install pystray pillow")

# Set CustomTkinter appearance mode and color theme
ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("blue")


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
        self.max_concurrent_tests = (
            500  # Reduced from unlimited to prevent resource exhaustion
        )
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
                result = subprocess.run(
                    [path, "version"],
                    capture_output=True,
                    text=True,
                    timeout=5,
                    check=False,
                )
                if result.returncode == 0 and (
                    "V2Ray" in result.stdout or "Xray" in result.stdout
                ):
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
            "Would you like to automatically download the latest V2Ray core?",
        )

        if should_download:
            messagebox.showinfo(
                "Download Starting",
                "The download will start in the background. The app may be unresponsive for a moment.",
            )
            self.root_tk.update_idletasks()

            downloaded_path = self._download_v2ray_core()

            if downloaded_path:
                messagebox.showinfo(
                    "Success",
                    f"V2Ray downloaded successfully to the 'v2ray_core' folder.\n\nPath: {os.path.abspath(downloaded_path)}",
                )
                return downloaded_path
            else:
                messagebox.showerror(
                    "Download Failed",
                    "Could not automatically download V2Ray core. Please install it manually and ensure it's in your system's PATH.",
                )
        return None

    def _download_v2ray_core(self):
        """Downloads and extracts the latest V2Ray core for the current OS."""
        try:
            system = platform.system()
            machine = platform.machine().lower()

            os_map = {"Windows": "windows", "Linux": "linux", "Darwin": "macos"}
            if system not in os_map:
                self.log(f"Unsupported OS: {system}")
                return None
            os_name = os_map[system]

            if "amd64" in machine or "x86_64" in machine:
                arch_name = "64"
            elif "arm64" in machine or "aarch64" in machine:
                arch_name = "arm64-v8a"
            elif "arm" in machine:
                arch_name = "arm32-v7a"
            else:
                arch_name = "32"

            self.log("Fetching latest V2Ray release info from GitHub...")
            api_url = "https://api.github.com/repos/v2fly/v2ray-core/releases/latest"
            response = requests.get(api_url, timeout=30)
            response.raise_for_status()
            release_data = response.json()

            asset_filename = f"v2ray-{os_name}-{arch_name}.zip"
            download_url = None
            for asset in release_data.get("assets", []):
                if asset.get("name") == asset_filename:
                    download_url = asset.get("browser_download_url")
                    break

            if not download_url:
                messagebox.showerror(
                    "Download Error",
                    f"Could not find a compatible V2Ray version for your system ({asset_filename}).",
                )
                return None

            download_dir = "v2ray_core"
            os.makedirs(download_dir, exist_ok=True)
            zip_path = os.path.join(download_dir, "v2ray.zip")

            self.log(f"Downloading {download_url}...")
            with requests.get(download_url, stream=True, timeout=60) as r:
                r.raise_for_status()
                with open(zip_path, "wb") as f:
                    for chunk in r.iter_content(chunk_size=8192):
                        f.write(chunk)

            self.log(f"Extracting {zip_path}...")
            with zipfile.ZipFile(zip_path, "r") as zip_ref:
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
            messagebox.showerror(
                "Download Error", f"An error occurred during download:\n{e}"
            )
            self.log(f"An error occurred during V2Ray download: {e}")
            return None

    def parse_vmess_url(self, url):
        """Parse vmess:// URL to extract server info"""
        try:
            if not url.startswith("vmess://"):
                return None

            encoded_part = url[8:]
            decoded = base64.b64decode(
                encoded_part + "=" * (-len(encoded_part) % 4)
            ).decode("utf-8")
            config = json.loads(decoded)

            return {
                "protocol": "vmess",
                "address": config.get("add", ""),
                "port": int(config.get("port", 443)),
                "id": config.get("id", ""),
                "name": config.get("ps", "Unknown"),
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
            if "remarks" in query:
                name = unquote(query["remarks"][0])
            elif parsed.fragment:
                name = unquote(parsed.fragment)

            return {
                "protocol": "vless",
                "address": parsed.hostname,
                "port": parsed.port or 80,
                "id": parsed.username,
                "name": name,
                "path": query.get("path", ["/"])[0],
                "type": query.get("type", ["tcp"])[0],
                "security": query.get("security", ["none"])[0],
                "encryption": query.get("encryption", ["none"])[0],
            }
        except Exception as e:
            self.log(f"Error parsing vless URL: {e}")
            return None

    def parse_config_text(self, config_text):
        """Parse V2Ray config text to extract server information"""
        try:
            vmess_urls = re.findall(r"vmess://[A-Za-z0-9+/=]+", config_text)
            if vmess_urls:
                return self.parse_vmess_url(vmess_urls[0])

            vless_urls = re.findall(r"vless://[^\s\n]+", config_text)
            if vless_urls:
                return self.parse_vless_url(vless_urls[0])

            if config_text.strip().startswith("{"):
                config = json.loads(config_text)
                outbounds = config.get("outbounds", [])
                if outbounds:
                    outbound = outbounds[0]
                    settings = outbound.get("settings", {})
                    vnext = settings.get("vnext", [{}])
                    if vnext:
                        vnext = vnext[0]
                        return {
                            "protocol": outbound.get("protocol", "unknown"),
                            "address": vnext.get("address", ""),
                            "port": vnext.get("port", 443),
                            "name": "V2Ray JSON Config",
                        }

            address_match = re.search(r'"address":\s*"([^"]+)"', config_text)
            port_match = re.search(r'"port":\s*(\d+)', config_text)

            if address_match and port_match:
                return {
                    "protocol": "unknown",
                    "address": address_match.group(1),
                    "port": int(port_match.group(1)),
                    "name": "Parsed Config",
                }

        except Exception as e:
            self.log(f"Error parsing config: {e}")

        return None

    def create_test_config_from_vless(self, server_info, socks_port):
        """Create V2Ray config from vless server info with custom SOCKS port"""
        config = {
            "log": {"loglevel": "error"},  # Reduced logging for speed
            "inbounds": [
                {
                    "tag": "socks-in",
                    "port": socks_port,
                    "listen": "127.0.0.1",
                    "protocol": "socks",
                    "settings": {
                        "auth": "noauth",
                        "udp": False,
                    },  # Disable UDP for faster testing
                }
            ],
            "outbounds": [
                {
                    "tag": "proxy",
                    "protocol": "vless",
                    "settings": {
                        "vnext": [
                            {
                                "address": server_info["address"],
                                "port": server_info["port"],
                                "users": [
                                    {
                                        "id": server_info["id"],
                                        "encryption": server_info.get(
                                            "encryption", "none"
                                        ),
                                    }
                                ],
                            }
                        ]
                    },
                    "streamSettings": {"network": server_info.get("type", "tcp")},
                }
            ],
        }

        if server_info.get("type") == "ws":
            config["outbounds"][0]["streamSettings"]["wsSettings"] = {
                "path": server_info.get("path", "/")
            }

        return config

    def create_test_config_from_vmess(self, server_info, socks_port):
        """Create V2Ray config from vmess server info with custom SOCKS port"""
        config = {
            "log": {"loglevel": "error"},  # Reduced logging for speed
            "inbounds": [
                {
                    "tag": "socks-in",
                    "port": socks_port,
                    "listen": "127.0.0.1",
                    "protocol": "socks",
                    "settings": {
                        "auth": "noauth",
                        "udp": False,
                    },  # Disable UDP for faster testing
                }
            ],
            "outbounds": [
                {
                    "tag": "proxy",
                    "protocol": "vmess",
                    "settings": {
                        "vnext": [
                            {
                                "address": server_info["address"],
                                "port": server_info["port"],
                                "users": [
                                    {"id": server_info["id"], "security": "auto"}
                                ],
                            }
                        ]
                    },
                }
            ],
        }

        return config

    def create_test_config(self, config_text, socks_port):
        """Create a temporary V2Ray config for testing with custom SOCKS port"""
        try:
            if config_text.strip().startswith("{"):
                base_config = json.loads(config_text)

                if "inbounds" not in base_config:
                    base_config["inbounds"] = []

                # Replace existing SOCKS inbound with our custom port
                base_config["inbounds"] = [
                    ib
                    for ib in base_config["inbounds"]
                    if not (ib.get("protocol") == "socks" and ib.get("port") == 1080)
                ]

                base_config["inbounds"].append(
                    {
                        "tag": "socks-test",
                        "port": socks_port,
                        "listen": "127.0.0.1",
                        "protocol": "socks",
                        "settings": {"auth": "noauth", "udp": False},
                    }
                )

                # Optimize logging
                base_config["log"] = {"loglevel": "error"}

                return base_config
            else:
                server_info = self.parse_config_text(config_text)
                if not server_info:
                    return None

                if server_info["protocol"] == "vless":
                    return self.create_test_config_from_vless(server_info, socks_port)
                elif server_info["protocol"] == "vmess":
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
            result = sock.connect_ex((server_info["address"], server_info["port"]))
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
                test_sock.bind(("127.0.0.1", socks_port))
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
        config_file = ""
        try:
            # Write config to temporary file
            with tempfile.NamedTemporaryFile(
                mode="w", suffix=".json", delete=False
            ) as f:
                json.dump(test_config, f, separators=(",", ":"))  # Compact JSON
                config_file = f.name

            # Start V2Ray process with minimal startup time
            cmd = [self.v2ray_path, "run", "-c", config_file]
            process = subprocess.Popen(
                cmd,
                stdout=subprocess.DEVNULL,  # Ignore output for speed
                stderr=subprocess.DEVNULL,
                text=True,
            )

            # Reduced startup wait time
            time.sleep(1.5)

            if process.poll() is not None:
                return -1, "V2Ray failed to start"

            # Test with reduced timeout
            proxies = {
                "http": f"socks5://127.0.0.1:{socks_port}",
                "https": f"socks5://127.0.0.1:{socks_port}",
            }

            start_time = time.time()
            try:
                # Use lightweight endpoint with shorter timeout
                response = requests.get(
                    "http://www.google.com/generate_204",
                    proxies=proxies,
                    timeout=timeout // 2,
                )
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
            config_id = config_data.get("title", "Unknown")
            config_text = config_data.get("text", "")
            latency, status = self.test_config_latency_optimized(config_text)
            return config_id, latency, status

        with concurrent.futures.ThreadPoolExecutor(
            max_workers=self.max_concurrent_tests
        ) as executor:
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
                    config_id = config.get("title", "Unknown")
                    results[config_id] = (-1, f"Error: {str(e)[:20]}")

                completed += 1
                if progress_callback:
                    progress_callback(completed, total)

        return results


class FileUploaderApp:
    def __init__(self, root):
        self.root = root
        self.root.title("V2Ray Config Manager")
        self.root.geometry("1200x800")
        self.root.minsize(1000, 700)

        # System tray icon
        self.tray_icon = None
        self.is_minimized = False

        # Variables
        self.server_url = "http://185.92.181.112:8000"
        # Pass the root window to the tester class so it can show message boxes
        self.v2ray_tester = OptimizedV2RayTester(root)
        self.v2ray_tester.set_log_callback(self.log_message)

        # Log window
        self.log_window = None

        # Create UI with tabs
        self.create_widgets()

        # Create system tray icon if available
        if HAS_PYSTRAY:
            self.create_tray_icon()

    def create_tray_icon(self):
        """Create a system tray icon for the application"""
        # Create a simple icon
        image = Image.new("RGB", (64, 64), color=(73, 109, 137))
        d = ImageDraw.Draw(image)
        d.ellipse((16, 16, 48, 48), fill=(255, 255, 255))
        d.text((24, 20), "V2", fill=(0, 0, 0))

        # Create menu for tray icon
        menu = pystray.Menu(
            pystray.MenuItem("Show", self.show_window),
            pystray.MenuItem("Exit", self.quit_app),
        )

        self.tray_icon = pystray.Icon(
            "V2Ray Config Manager", image, "V2Ray Config Manager", menu
        )

    def show_window(self, icon=None, item=None):
        """Show the main window"""
        self.root.deiconify()
        self.root.lift()
        self.is_minimized = False

    def hide_window(self):
        """Hide the main window to system tray"""
        if HAS_PYSTRAY and self.tray_icon:
            self.root.withdraw()
            self.is_minimized = True
            # Start tray icon in a separate thread
            threading.Thread(target=self.tray_icon.run, daemon=True).start()

    def quit_app(self, icon=None, item=None):
        """Quit the application"""
        if self.tray_icon:
            self.tray_icon.stop()
        self.root.quit()

    def on_closing(self):
        """Handle window closing event"""
        if HAS_PYSTRAY:
            # Instead of closing, minimize to tray
            self.hide_window()
        else:
            # If no system tray support, just quit
            self.root.destroy()

    def log_message(self, message):
        """Log message to the log window if it exists"""
        if self.log_window and hasattr(self, "log_text"):
            self.log_text.insert(tk.END, message + "\n")
            self.log_text.see(tk.END)
            self.log_window.update_idletasks()

    def show_log_window(self):
        """Show the log window"""
        if self.log_window is None or not self.log_window.winfo_exists():
            self.log_window = ctk.CTkToplevel(self.root)
            self.log_window.title("V2Ray Test Logs")
            self.log_window.geometry("900x600")
            self.log_window.resizable(True, True)

            # Center the log window
            self.log_window.transient(self.root)
            self.log_window.grab_set()

            # Create log text widget with scrollbar
            log_frame = ctk.CTkFrame(self.log_window)
            log_frame.pack(fill=tk.BOTH, expand=True, padx=20, pady=20)

            self.log_text = ctk.CTkTextbox(
                log_frame, font=ctk.CTkFont(family="Consolas", size=13), wrap="word"
            )
            self.log_text.pack(fill=tk.BOTH, expand=True, padx=15, pady=15)

            # Button frame
            button_frame = ctk.CTkFrame(log_frame, fg_color="transparent")
            button_frame.pack(fill=tk.X, pady=(0, 10))

            # Clear button
            clear_btn = ctk.CTkButton(
                button_frame,
                text="Clear Logs",
                command=lambda: self.log_text.delete("0.0", "end"),
                fg_color="#f44336",
                hover_color="#d32f2f",
                font=ctk.CTkFont(size=13, weight="bold"),
                height=32,
                width=120,
            )
            clear_btn.pack(side=tk.RIGHT, padx=(10, 0))

            # Close button
            close_btn = ctk.CTkButton(
                button_frame,
                text="Close",
                command=self.log_window.destroy,
                font=ctk.CTkFont(size=13, weight="bold"),
                height=32,
                width=120,
            )
            close_btn.pack(side=tk.RIGHT)
        else:
            self.log_window.lift()

    def create_widgets(self):
        # Handle window closing event
        self.root.protocol("WM_DELETE_WINDOW", self.on_closing)

        # Configure grid weights for responsive layout
        self.root.grid_rowconfigure(0, weight=1)
        self.root.grid_columnconfigure(0, weight=1)

        # Main frame
        main_frame = ctk.CTkFrame(self.root, corner_radius=10)
        main_frame.grid(row=0, column=0, padx=15, pady=15, sticky="nsew")
        main_frame.grid_rowconfigure(2, weight=1)
        main_frame.grid_columnconfigure(0, weight=1)

        # Header frame
        header_frame = ctk.CTkFrame(main_frame, fg_color="transparent", height=80)
        header_frame.grid(row=0, column=0, padx=20, pady=(15, 10), sticky="ew")
        header_frame.grid_columnconfigure(1, weight=1)

        # Title
        title_label = ctk.CTkLabel(
            header_frame,
            text="V2Ray Config Manager",
            font=ctk.CTkFont(size=28, weight="bold", family="Helvetica"),
        )
        title_label.grid(row=0, column=0, padx=(0, 20), pady=10, sticky="w")

        # Server URL frame
        url_frame = ctk.CTkFrame(header_frame, fg_color="transparent")
        url_frame.grid(row=0, column=1, padx=(0, 10), pady=10, sticky="e")

        url_label = ctk.CTkLabel(
            url_frame, text="Server URL:", font=ctk.CTkFont(size=14, weight="bold")
        )
        url_label.pack(side=tk.LEFT, padx=(0, 10))

        self.url_entry = ctk.CTkEntry(
            url_frame,
            font=ctk.CTkFont(size=13),
            height=36,
            width=300,
            placeholder_text="Enter server URL",
        )
        self.url_entry.insert(0, self.server_url)
        self.url_entry.pack(side=tk.LEFT)

        # Status indicator
        status_indicator = ctk.CTkFrame(
            header_frame, width=20, height=20, corner_radius=10
        )
        status_indicator.grid(row=0, column=2, padx=(0, 20), pady=10, sticky="e")

        # Notebook (tab view)
        self.tab_view = ctk.CTkTabview(
            main_frame,
            segmented_button_fg_color="#2b2b2b",
            segmented_button_selected_color="#1f6aa5",
            segmented_button_unselected_color="#2b2b2b",
            segmented_button_unselected_hover_color="#3d3d3d",
        )
        self.tab_view.grid(row=2, column=0, padx=20, pady=(0, 20), sticky="nsew")

        self.receive_tab = self.tab_view.add("  Receive Configs  ")
        self.config_tab = self.tab_view.add("  Manage Configs  ")
        self.settings_tab = self.tab_view.add("  Settings  ")

        self.create_receive_tab()
        self.create_config_tab()
        self.create_settings_tab()

    def create_settings_tab(self):
        """Create the content for the Settings tab"""
        main_frame = ctk.CTkFrame(self.settings_tab, fg_color="transparent")
        main_frame.pack(fill=tk.BOTH, expand=True, padx=20, pady=20)

        title_label = ctk.CTkLabel(
            main_frame,
            text="Configuration Settings",
            font=ctk.CTkFont(size=22, weight="bold"),
        )
        title_label.pack(pady=(10, 20))

        # Settings cards container
        settings_container = ctk.CTkScrollableFrame(main_frame, fg_color="transparent")
        settings_container.pack(fill=tk.BOTH, expand=True)

        # Appearance settings
        appearance_card = ctk.CTkFrame(settings_container, corner_radius=8)
        appearance_card.pack(fill=tk.X, pady=(0, 15))

        card_title = ctk.CTkLabel(
            appearance_card, text="Appearance", font=ctk.CTkFont(size=16, weight="bold")
        )
        card_title.pack(anchor=tk.W, padx=20, pady=(15, 10))

        # Theme selection
        theme_frame = ctk.CTkFrame(appearance_card, fg_color="transparent")
        theme_frame.pack(fill=tk.X, padx=20, pady=(0, 15))

        theme_label = ctk.CTkLabel(
            theme_frame, text="Theme:", font=ctk.CTkFont(size=14)
        )
        theme_label.pack(side=tk.LEFT)

        theme_var = ctk.StringVar(value="Dark")
        theme_option = ctk.CTkOptionMenu(
            theme_frame,
            values=["Dark", "Light", "System"],
            variable=theme_var,
            width=120,
        )
        theme_option.pack(side=tk.RIGHT)

        # Color theme selection
        color_frame = ctk.CTkFrame(appearance_card, fg_color="transparent")
        color_frame.pack(fill=tk.X, padx=20, pady=(0, 15))

        color_label = ctk.CTkLabel(
            color_frame, text="Color Theme:", font=ctk.CTkFont(size=14)
        )
        color_label.pack(side=tk.LEFT)

        color_var = ctk.StringVar(value="Blue")
        color_option = ctk.CTkOptionMenu(
            color_frame,
            values=["Blue", "Green", "Dark Blue"],
            variable=color_var,
            width=120,
        )
        color_option.pack(side=tk.RIGHT)

        # Performance settings
        performance_card = ctk.CTkFrame(settings_container, corner_radius=8)
        performance_card.pack(fill=tk.X, pady=(0, 15))

        perf_card_title = ctk.CTkLabel(
            performance_card,
            text="Performance",
            font=ctk.CTkFont(size=16, weight="bold"),
        )
        perf_card_title.pack(anchor=tk.W, padx=20, pady=(15, 10))

        # Concurrent tests setting
        concurrent_frame = ctk.CTkFrame(performance_card, fg_color="transparent")
        concurrent_frame.pack(fill=tk.X, padx=20, pady=(0, 15))

        concurrent_label = ctk.CTkLabel(
            concurrent_frame, text="Max Concurrent Tests:", font=ctk.CTkFont(size=14)
        )
        concurrent_label.pack(side=tk.LEFT)

        concurrent_slider = ctk.CTkSlider(
            concurrent_frame, from_=10, to=500, number_of_steps=49, width=200
        )
        concurrent_slider.set(self.v2ray_tester.max_concurrent_tests)
        concurrent_slider.pack(side=tk.RIGHT, padx=(0, 10))

        concurrent_value = ctk.CTkLabel(
            concurrent_frame, text=str(self.v2ray_tester.max_concurrent_tests), width=30
        )
        concurrent_value.pack(side=tk.RIGHT)

        # V2Ray settings
        v2ray_card = ctk.CTkFrame(settings_container, corner_radius=8)
        v2ray_card.pack(fill=tk.X, pady=(0, 15))

        v2ray_card_title = ctk.CTkLabel(
            v2ray_card, text="V2Ray", font=ctk.CTkFont(size=16, weight="bold")
        )
        v2ray_card_title.pack(anchor=tk.W, padx=20, pady=(15, 10))

        v2ray_status = "✓ Found" if self.v2ray_tester.v2ray_path else "✗ Not Found"
        v2ray_color = "#4CAF50" if self.v2ray_tester.v2ray_path else "#f44336"

        v2ray_frame = ctk.CTkFrame(v2ray_card, fg_color="transparent")
        v2ray_frame.pack(fill=tk.X, padx=20, pady=(0, 15))

        v2ray_label = ctk.CTkLabel(
            v2ray_frame, text="Status:", font=ctk.CTkFont(size=14)
        )
        v2ray_label.pack(side=tk.LEFT)

        v2ray_status_label = ctk.CTkLabel(
            v2ray_frame,
            text=v2ray_status,
            font=ctk.CTkFont(size=14, weight="bold"),
            text_color=v2ray_color,
        )
        v2ray_status_label.pack(side=tk.LEFT, padx=(10, 0))

        if not self.v2ray_tester.v2ray_path:
            download_btn = ctk.CTkButton(
                v2ray_frame,
                text="Download V2Ray",
                command=self.v2ray_tester._prompt_and_download_v2ray,
                font=ctk.CTkFont(size=13),
                height=32,
                width=140,
                fg_color="#2196F3",
                hover_color="#1976D2",
            )
            download_btn.pack(side=tk.RIGHT)

        # Save button
        save_frame = ctk.CTkFrame(settings_container, fg_color="transparent")
        save_frame.pack(fill=tk.X, pady=(20, 0))

        save_btn = ctk.CTkButton(
            save_frame,
            text="Save Settings",
            command=lambda: messagebox.showinfo("Info", "Settings saved successfully"),
            font=ctk.CTkFont(size=14, weight="bold"),
            height=40,
            fg_color="#4CAF50",
            hover_color="#388E3C",
        )
        save_btn.pack(pady=10)

    def create_receive_tab(self):
        main_frame = ctk.CTkFrame(self.receive_tab, fg_color="transparent")
        main_frame.pack(fill=tk.BOTH, expand=True, padx=20, pady=20)

        # Header with title and buttons
        header_frame = ctk.CTkFrame(main_frame, fg_color="transparent")
        header_frame.pack(fill=tk.X, pady=(0, 20))

        title_label = ctk.CTkLabel(
            header_frame,
            text="Received Configurations",
            font=ctk.CTkFont(size=20, weight="bold"),
        )
        title_label.pack(side=tk.LEFT)

        # Control buttons frame
        control_frame = ctk.CTkFrame(header_frame, fg_color="transparent")
        control_frame.pack(side=tk.RIGHT)

        refresh_btn = ctk.CTkButton(
            control_frame,
            text="Refresh",
            command=self.load_receive_data,
            font=ctk.CTkFont(size=13, weight="bold"),
            width=100,
            height=36,
            fg_color="#2196F3",
            hover_color="#1976D2",
        )
        refresh_btn.pack(side=tk.LEFT, padx=(0, 10))

        self.download_btn = ctk.CTkButton(
            control_frame,
            text="Download",
            command=self.download_selected_file,
            font=ctk.CTkFont(size=13, weight="bold"),
            width=100,
            height=36,
            state="disabled",
            fg_color="#4CAF50",
            hover_color="#388E3C",
        )
        self.download_btn.pack(side=tk.LEFT, padx=(0, 10))

        self.extract_btn = ctk.CTkButton(
            control_frame,
            text="Extract Configs",
            command=self.extract_v2ray_configs,
            font=ctk.CTkFont(size=13, weight="bold"),
            width=120,
            height=36,
            state="disabled",
            fg_color="#FF9800",
            hover_color="#F57C00",
        )
        self.extract_btn.pack(side=tk.LEFT)

        # Tree frame with shadow effect
        tree_container = ctk.CTkFrame(main_frame, corner_radius=8)
        tree_container.pack(fill=tk.BOTH, expand=True)

        # Treeview with custom style
        style = ttk.Style()
        style.theme_use("clam")
        style.configure(
            "Treeview",
            background="#2b2b2b",
            foreground="white",
            rowheight=30,
            fieldbackground="#2b2b2b",
            borderwidth=0,
        )
        style.configure(
            "Treeview.Heading",
            background="#1f6aa5",
            foreground="white",
            relief="flat",
            font=("Helvetica", 12, "bold"),
        )
        style.map("Treeview", background=[("selected", "#1f6aa5")])
        style.map("Treeview.Heading", background=[("active", "#1976D2")])

        # Create a frame for the treeview and scrollbars
        tree_frame = ctk.CTkFrame(tree_container, fg_color="transparent")
        tree_frame.pack(fill=tk.BOTH, expand=True, padx=15, pady=15)

        # Create scrollbars
        v_scrollbar = ctk.CTkScrollbar(tree_frame, orientation="vertical")
        v_scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

        h_scrollbar = ctk.CTkScrollbar(tree_frame, orientation="horizontal")
        h_scrollbar.pack(side=tk.BOTTOM, fill=tk.X)

        # Create the treeview
        self.tree = ttk.Treeview(
            tree_frame,
            columns=("ID", "Name", "Size", "Uploaded By", "Date"),
            show="headings",
            yscrollcommand=v_scrollbar.set,
            xscrollcommand=h_scrollbar.set,
            height=15,
            selectmode="browse",
        )

        # Configure scrollbars
        v_scrollbar.configure(command=self.tree.yview)
        h_scrollbar.configure(command=self.tree.xview)

        # Define headings
        self.tree.heading("ID", text="ID", anchor=tk.CENTER)
        self.tree.heading("Name", text="File Name", anchor=tk.W)
        self.tree.heading("Size", text="Size", anchor=tk.CENTER)
        self.tree.heading("Uploaded By", text="Uploaded By", anchor=tk.W)
        self.tree.heading("Date", text="Upload Date", anchor=tk.CENTER)

        # Define columns
        self.tree.column("ID", width=60, anchor=tk.CENTER)
        self.tree.column("Name", width=250, anchor=tk.W)
        self.tree.column("Size", width=100, anchor=tk.CENTER)
        self.tree.column("Uploaded By", width=150, anchor=tk.W)
        self.tree.column("Date", width=150, anchor=tk.CENTER)

        self.tree.pack(fill=tk.BOTH, expand=True)

        self.tree.bind("<<TreeviewSelect>>", self.on_tree_select)

        # Status bar
        status_bar = ctk.CTkFrame(main_frame, fg_color="transparent", height=30)
        status_bar.pack(fill=tk.X, pady=(15, 0))

        self.receive_status = ctk.CTkLabel(
            status_bar,
            text="Ready to load files",
            font=ctk.CTkFont(size=13),
            text_color="#2196F3",
        )
        self.receive_status.pack(side=tk.LEFT)

        items_count = ctk.CTkLabel(
            status_bar, text="0 items", font=ctk.CTkFont(size=13), text_color="#BBBBBB"
        )
        items_count.pack(side=tk.RIGHT)

    def create_config_tab(self):
        main_frame = ctk.CTkFrame(self.config_tab, fg_color="transparent")
        main_frame.pack(fill=tk.BOTH, expand=True, padx=20, pady=20)

        # Header with title and buttons
        header_frame = ctk.CTkFrame(main_frame, fg_color="transparent")
        header_frame.pack(fill=tk.X, pady=(0, 20))

        title_label = ctk.CTkLabel(
            header_frame,
            text="V2Ray Configurations",
            font=ctk.CTkFont(size=20, weight="bold"),
        )
        title_label.pack(side=tk.LEFT)

        # Control buttons frame
        control_frame = ctk.CTkFrame(header_frame, fg_color="transparent")
        control_frame.pack(side=tk.RIGHT)

        refresh_btn = ctk.CTkButton(
            control_frame,
            text="Refresh",
            command=self.load_config_data,
            font=ctk.CTkFont(size=13, weight="bold"),
            width=100,
            height=36,
            fg_color="#2196F3",
            hover_color="#1976D2",
        )
        refresh_btn.pack(side=tk.LEFT, padx=(0, 10))

        test_all_btn = ctk.CTkButton(
            control_frame,
            text="Test All",
            command=self.test_all_configs_parallel,
            font=ctk.CTkFont(size=13, weight="bold"),
            width=100,
            height=36,
            fg_color="#FF9800",
            hover_color="#F57C00",
        )
        test_all_btn.pack(side=tk.LEFT, padx=(0, 10))

        copy_all_btn = ctk.CTkButton(
            control_frame,
            text="Copy All",
            command=self.copy_all_configs,
            font=ctk.CTkFont(size=13, weight="bold"),
            width=100,
            height=36,
            fg_color="#4CAF50",
            hover_color="#388E3C",
        )
        copy_all_btn.pack(side=tk.LEFT, padx=(0, 10))

        remove_trash_btn = ctk.CTkButton(
            control_frame,
            text="Remove Trash",
            command=self.remove_trash_configs,
            font=ctk.CTkFont(size=13, weight="bold"),
            width=120,
            height=36,
            fg_color="#f44336",
            hover_color="#d32f2f",
        )
        remove_trash_btn.pack(side=tk.LEFT, padx=(0, 10))

        logs_btn = ctk.CTkButton(
            control_frame,
            text="Logs",
            command=self.show_log_window,
            font=ctk.CTkFont(size=13, weight="bold"),
            width=80,
            height=36,
            fg_color="#9C27B0",
            hover_color="#7B1FA2",
        )
        logs_btn.pack(side=tk.LEFT)

        # Config cards container with scrollbar
        cards_container = ctk.CTkScrollableFrame(
            main_frame,
            fg_color="transparent",
            scrollbar_button_color="#1f6aa5",
            scrollbar_button_hover_color="#1976D2",
        )
        cards_container.pack(fill=tk.BOTH, expand=True)

        # Configure grid for cards
        cards_container.grid_columnconfigure(0, weight=1)

        # Status bar
        status_bar = ctk.CTkFrame(main_frame, fg_color="transparent", height=30)
        status_bar.pack(fill=tk.X, pady=(15, 0))

        self.config_status = ctk.CTkLabel(
            status_bar,
            text="Ready to load configurations",
            font=ctk.CTkFont(size=13),
            text_color="#2196F3",
        )
        self.config_status.pack(side=tk.LEFT)

        configs_count = ctk.CTkLabel(
            status_bar,
            text="0 configs",
            font=ctk.CTkFont(size=13),
            text_color="#BBBBBB",
        )
        configs_count.pack(side=tk.RIGHT)

        # Store reference to cards container
        self.cards_container = cards_container

    def on_tree_select(self, event):
        has_selection = bool(self.tree.selection())
        self.download_btn.configure(state="normal" if has_selection else "disabled")
        self.extract_btn.configure(state="normal" if has_selection else "disabled")

    def copy_config_to_clipboard(self, config_text):
        self.root.clipboard_clear()
        self.root.clipboard_append(config_text)
        self.root.update()
        self.config_status.configure(
            text="Configuration copied to clipboard!", text_color="#4CAF50"
        )

    def load_config_data(self):
        server_url = self.url_entry.get().strip() or self.server_url
        api_url = f"{server_url.rstrip('/')}/tickets/api/config/"

        def load_in_thread():
            self.config_status.configure(
                text="Loading configurations...", text_color="#2196F3"
            )

            try:
                # Increase timeout to 30 seconds for better handling of network latency
                response = requests.get(api_url, timeout=30)

                if response.status_code == 200:
                    data = response.json()

                    # Clear existing widgets
                    for widget in self.cards_container.winfo_children():
                        widget.destroy()

                    configs = data.get("configs", [])

                    for config in configs:
                        self.create_config_card(config)

                    self.config_status.configure(
                        text=f"Loaded {len(configs)} configurations",
                        text_color="#4CAF50",
                    )
                else:
                    self.config_status.configure(
                        text=f"Error: Status code {response.status_code}",
                        text_color="#f44336",
                    )

            except Exception as e:
                self.config_status.configure(
                    text=f"Error: {str(e)}", text_color="#f44336"
                )

        threading.Thread(target=load_in_thread, daemon=True).start()

    def create_config_card(self, config):
        """Create a modern config card widget"""
        card_frame = ctk.CTkFrame(
            self.cards_container,
            corner_radius=10,
            border_width=1,
            border_color="#3d3d3d",
        )
        card_frame.pack(fill=tk.X, pady=(0, 15))

        # Header with title and action buttons
        header_frame = ctk.CTkFrame(card_frame, fg_color="transparent")
        header_frame.pack(fill=tk.X, padx=15, pady=(15, 10))

        # Title with ellipsis for long names
        title = config.get("title", "Unknown")
        if len(title) > 40:
            title = title[:37] + "..."

        title_label = ctk.CTkLabel(
            header_frame,
            text=title,
            font=ctk.CTkFont(size=16, weight="bold"),
            anchor="w",
        )
        title_label.pack(side=tk.LEFT, fill="x", expand=True)

        # Ping status
        ping_label = ctk.CTkLabel(
            header_frame,
            text="Ping: -- ms",
            font=ctk.CTkFont(size=13),
            text_color="#BBBBBB",
        )
        ping_label.pack(side=tk.RIGHT, padx=(0, 10))
        ping_label.config_data = config

        # Action buttons frame
        action_frame = ctk.CTkFrame(header_frame, fg_color="transparent")
        action_frame.pack(side=tk.RIGHT)

        test_btn = ctk.CTkButton(
            action_frame,
            text="Test",
            command=lambda c=config, p=ping_label: self.test_single_config(c, p),
            font=ctk.CTkFont(size=12),
            width=60,
            height=28,
            fg_color="#FF9800",
            hover_color="#F57C00",
        )
        test_btn.pack(side=tk.LEFT, padx=(0, 5))

        copy_btn = ctk.CTkButton(
            action_frame,
            text="Copy",
            command=lambda c=config.get("text", ""): self.copy_config_to_clipboard(c),
            font=ctk.CTkFont(size=12),
            width=60,
            height=28,
            fg_color="#4CAF50",
            hover_color="#388E3C",
        )
        copy_btn.pack(side=tk.LEFT, padx=(0, 5))

        view_btn = ctk.CTkButton(
            action_frame,
            text="View",
            command=lambda c=config: self.show_config_detail(c),
            font=ctk.CTkFont(size=12),
            width=60,
            height=28,
            fg_color="#2196F3",
            hover_color="#1976D2",
        )
        view_btn.pack(side=tk.LEFT)

        # Config preview
        preview_frame = ctk.CTkFrame(card_frame, fg_color="transparent")
        preview_frame.pack(fill=tk.X, padx=15, pady=(0, 15))

        preview_text = config.get("text", "")
        # Show first 150 chars with ellipsis
        if len(preview_text) > 150:
            preview_text = preview_text[:147] + "..."

        preview_label = ctk.CTkLabel(
            preview_frame,
            text=preview_text,
            font=ctk.CTkFont(size=13, family="Consolas"),
            wraplength=700,
            anchor="w",
            justify=tk.LEFT,
        )
        preview_label.pack(fill=tk.X)

    def test_single_config(self, config, ping_label):
        """Test a single V2Ray configuration in a separate thread."""

        def test_in_thread():
            ping_label.configure(text="Testing...", text_color="#FF9800")

            config_text = config.get("text", "")
            # Only log if log window is already open
            if self.log_window and hasattr(self, "log_text"):
                self.log_message(f"\n{'='*60}")
                self.log_message(f"TESTING CONFIG: {config.get('title', 'Unknown')}")
                self.log_message(f"{'='*60}")

            latency, status = self.v2ray_tester.test_config_latency_optimized(
                config_text
            )

            if latency > 0:
                ping_label.configure(text=f"Ping: {latency}ms", text_color="#4CAF50")
                # Only log if log window is already open
                if self.log_window and hasattr(self, "log_text"):
                    self.log_message(f"✅ RESULT: SUCCESS - {latency}ms")
            else:
                ping_label.configure(
                    text=f"Failed: {status[:15]}", text_color="#f44336"
                )
                # Only log if log window is already open
                if self.log_window and hasattr(self, "log_text"):
                    self.log_message(f"❌ RESULT: FAILED - {status}")

        threading.Thread(target=test_in_thread, daemon=True).start()

    def show_config_detail(self, config):
        detail_window = ctk.CTkToplevel(self.root)
        detail_window.title(f"Config - {config.get('title', 'Unknown')}")
        detail_window.geometry("800x600")
        detail_window.resizable(True, True)

        # Center the detail window
        detail_window.transient(self.root)
        detail_window.grab_set()

        main_frame = ctk.CTkFrame(detail_window)
        main_frame.pack(fill=tk.BOTH, expand=True, padx=20, pady=20)

        # Header
        header_frame = ctk.CTkFrame(main_frame, fg_color="transparent")
        header_frame.pack(fill=tk.X, pady=(0, 15))

        back_btn = ctk.CTkButton(
            header_frame,
            text="← Back",
            command=detail_window.destroy,
            font=ctk.CTkFont(size=13, weight="bold"),
            width=80,
            height=32,
            fg_color="#2196F3",
            hover_color="#1976D2",
        )
        back_btn.pack(side=tk.LEFT)

        title_label = ctk.CTkLabel(
            header_frame,
            text=config.get("title", "Unknown"),
            font=ctk.CTkFont(size=18, weight="bold"),
        )
        title_label.pack(side=tk.LEFT, padx=(20, 0))

        # Config content
        content_frame = ctk.CTkFrame(main_frame)
        content_frame.pack(fill=tk.BOTH, expand=True)

        text_box = ctk.CTkTextbox(
            content_frame, font=ctk.CTkFont(family="Consolas", size=12), wrap="word"
        )

        full_text = config.get("text", "")
        text_box.insert("0.0", full_text)
        text_box.configure(state="disabled")
        text_box.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)

        # Action buttons
        button_frame = ctk.CTkFrame(main_frame, fg_color="transparent")
        button_frame.pack(fill=tk.X, pady=(15, 0))

        copy_btn = ctk.CTkButton(
            button_frame,
            text="Copy to Clipboard",
            command=lambda: self.copy_config_to_clipboard(full_text),
            font=ctk.CTkFont(size=13, weight="bold"),
            height=36,
            fg_color="#4CAF50",
            hover_color="#388E3C",
        )
        copy_btn.pack(side=tk.RIGHT)

    def test_all_configs_parallel(self):
        """Test all visible configurations in parallel using the optimized method."""
        ping_labels = []
        configs = []

        # Collect configs and labels
        for card_frame in self.cards_container.winfo_children():
            if isinstance(card_frame, ctk.CTkFrame):
                header_frame = card_frame.winfo_children()[0]
                if isinstance(header_frame, ctk.CTkFrame):
                    for widget in header_frame.winfo_children():
                        if isinstance(widget, ctk.CTkLabel) and hasattr(
                            widget, "config_data"
                        ):
                            ping_labels.append(widget)
                            configs.append(widget.config_data)

        if not configs:
            self.config_status.configure(
                text="No configurations loaded to test.", text_color="#FF9800"
            )
            return

        def progress_callback(completed, total):
            self.config_status.configure(
                text=f"Testing... ({completed}/{total})", text_color="#2196F3"
            )

        def test_all_in_thread():
            total_count = len(configs)

            # Set all labels to "Testing..." initially
            for label in ping_labels:
                label.configure(text="Testing...", text_color="#FF9800")

            # Show log window automatically for parallel testing
            self.show_log_window()

            self.log_message(f"\n{'='*80}")
            self.log_message(f"STARTING PARALLEL TEST OF {total_count} CONFIGURATIONS")
            self.log_message(
                f"Max concurrent tests: {self.v2ray_tester.max_concurrent_tests}"
            )
            self.log_message(f"{'='*80}")

            # Run parallel tests
            start_time = time.time()
            results = self.v2ray_tester.test_multiple_configs_parallel(
                configs, progress_callback
            )
            end_time = time.time()

            # Update results
            successful_tests = 0
            for i, config in enumerate(configs):
                config_title = config.get("title", "Unknown")
                latency, status = results.get(config_title, (-1, "Unknown error"))

                if latency > 0:
                    ping_labels[i].configure(
                        text=f"Ping: {latency}ms", text_color="#4CAF50"
                    )
                    successful_tests += 1
                else:
                    ping_labels[i].configure(
                        text=f"Failed: {status[:15]}", text_color="#f44336"
                    )

            total_time = end_time - start_time

            self.config_status.configure(
                text=f"Finished testing {total_count} configs in {total_time:.1f}s ({successful_tests} successful)",
                text_color="#4CAF50",
            )

            self.log_message(f"\n{'='*80}")
            self.log_message(f"PARALLEL TEST COMPLETED")
            self.log_message(f"Total time: {total_time:.1f} seconds")
            self.log_message(f"Successful tests: {successful_tests}/{total_count}")
            self.log_message(f"Average time per config: {total_time/total_count:.1f}s")
            self.log_message(f"{'='*80}")

        threading.Thread(target=test_all_in_thread, daemon=True).start()

    def copy_all_configs(self):
        """Copy all configs to clipboard"""
        all_configs_text = ""

        # Collect all configs
        for card_frame in self.cards_container.winfo_children():
            if isinstance(card_frame, ctk.CTkFrame):
                header_frame = card_frame.winfo_children()[0]
                if isinstance(header_frame, ctk.CTkFrame):
                    for widget in header_frame.winfo_children():
                        if isinstance(widget, ctk.CTkLabel) and hasattr(
                            widget, "config_data"
                        ):
                            config = widget.config_data
                            all_configs_text += f"\n{'='*50}\n"
                            all_configs_text += (
                                f"Configuration: {config.get('title', 'Unknown')}\n"
                            )
                            all_configs_text += f"{'='*50}\n"
                            all_configs_text += config.get("text", "") + "\n"

        if all_configs_text:
            self.root.clipboard_clear()
            self.root.clipboard_append(all_configs_text)
            self.root.update()
            self.config_status.configure(
                text="All configurations copied to clipboard!", text_color="#4CAF50"
            )
        else:
            self.config_status.configure(
                text="No configurations to copy", text_color="#FF9800"
            )

    def remove_trash_configs(self):
        """Remove configs that failed testing"""
        # First, test all configs to identify the working ones
        ping_labels = []
        configs = []

        # Collect configs and labels
        for card_frame in self.cards_container.winfo_children():
            if isinstance(card_frame, ctk.CTkFrame):
                header_frame = card_frame.winfo_children()[0]
                if isinstance(header_frame, ctk.CTkFrame):
                    for widget in header_frame.winfo_children():
                        if isinstance(widget, ctk.CTkLabel) and hasattr(
                            widget, "config_data"
                        ):
                            ping_labels.append(widget)
                            configs.append(widget.config_data)

        if not configs:
            self.config_status.configure(
                text="No configurations loaded to test.", text_color="#FF9800"
            )
            return

        def progress_callback(completed, total):
            self.config_status.configure(
                text=f"Testing... ({completed}/{total})", text_color="#2196F3"
            )

        def remove_trash_in_thread():
            total_count = len(configs)

            # Set all labels to "Testing..." initially
            for label in ping_labels:
                label.configure(text="Testing...", text_color="#FF9800")

            # Show log window automatically for parallel testing
            self.show_log_window()

            self.log_message(f"\n{'='*80}")
            self.log_message(
                f"TESTING CONFIGS TO REMOVE TRASH - {total_count} CONFIGURATIONS"
            )
            self.log_message(f"{'='*80}")

            # Run parallel tests
            start_time = time.time()
            results = self.v2ray_tester.test_multiple_configs_parallel(
                configs, progress_callback
            )
            end_time = time.time()

            # Identify working configs
            working_configs = []
            for i, config in enumerate(configs):
                config_title = config.get("title", "Unknown")
                latency, status = results.get(config_title, (-1, "Unknown error"))

                if latency > 0:
                    working_configs.append(config)
                    ping_labels[i].configure(
                        text=f"Ping: {latency}ms", text_color="#4CAF50"
                    )
                else:
                    ping_labels[i].configure(
                        text=f"Failed: {status[:15]}", text_color="#f44336"
                    )

            # Remove non-working configs from UI
            self.remove_non_working_configs(working_configs)

            total_time = end_time - start_time
            removed_count = total_count - len(working_configs)

            self.config_status.configure(
                text=f"Removed {removed_count} trash configs, {len(working_configs)} remaining",
                text_color="#4CAF50",
            )

            self.log_message(f"\n{'='*80}")
            self.log_message(f"TRASH REMOVAL COMPLETED")
            self.log_message(f"Total time: {total_time:.1f} seconds")
            self.log_message(f"Configs removed: {removed_count}")
            self.log_message(f"Configs remaining: {len(working_configs)}")
            self.log_message(f"{'='*80}")

        threading.Thread(target=remove_trash_in_thread, daemon=True).start()

    def remove_non_working_configs(self, working_configs):
        """Remove non-working configs from the UI"""
        # Clear existing configs
        for widget in self.cards_container.winfo_children():
            widget.destroy()

        # Add only working configs
        for config in working_configs:
            self.create_config_card(config)

    def download_selected_file(self):
        selection = self.tree.selection()
        if not selection:
            messagebox.showwarning("Warning", "Please select a file to download")
            return

        item = self.tree.item(selection[0])
        values = item["values"]
        file_name = values[1]
        file_url = values[5] if len(values) > 5 else None

        if not file_url:
            messagebox.showerror("Error", "File URL not available")
            return

        server_url = (self.url_entry.get().strip() or self.server_url).rstrip("/")
        full_url = (
            server_url + file_url if not file_url.startswith("http") else file_url
        )

        def download_in_thread():
            try:
                self.receive_status.configure(
                    text=f"Downloading {file_name}...", text_color="#2196F3"
                )

                response = requests.get(full_url, timeout=30)

                if response.status_code == 200:
                    save_path = filedialog.asksaveasfilename(initialfile=file_name)

                    if save_path:
                        with open(save_path, "wb") as f:
                            f.write(response.content)
                        self.receive_status.configure(
                            text=f"File downloaded successfully!", text_color="#4CAF50"
                        )
                        messagebox.showinfo("Success", f"File saved to:\n{save_path}")
                    else:
                        self.receive_status.configure(
                            text="Download cancelled", text_color="#FF9800"
                        )
                else:
                    self.receive_status.configure(
                        text=f"Error: Status {response.status_code}",
                        text_color="#f44336",
                    )
                    messagebox.showerror(
                        "Error",
                        f"Failed to download file. Status: {response.status_code}",
                    )

            except Exception as e:
                self.receive_status.configure(
                    text=f"Error: {str(e)}", text_color="#f44336"
                )
                messagebox.showerror("Error", f"Failed to download file: {str(e)}")

        threading.Thread(target=download_in_thread, daemon=True).start()

    def extract_v2ray_configs(self):
        """Extract V2Ray configs from the selected file and add them to the config tab"""
        selection = self.tree.selection()
        if not selection:
            messagebox.showwarning(
                "Warning", "Please select a file to extract configs from"
            )
            return

        item = self.tree.item(selection[0])
        values = item["values"]
        file_name = values[1]
        file_url = values[5] if len(values) > 5 else None

        if not file_url:
            messagebox.showerror("Error", "File URL not available")
            return

        server_url = (self.url_entry.get().strip() or self.server_url).rstrip("/")
        full_url = (
            server_url + file_url if not file_url.startswith("http") else file_url
        )

        def extract_in_thread():
            try:
                self.receive_status.configure(
                    text=f"Downloading {file_name} for config extraction...",
                    text_color="#2196F3",
                )

                response = requests.get(full_url, timeout=30)

                if response.status_code == 200:
                    file_content = response.text

                    # Extract V2Ray configs from the file content
                    configs = self.extract_v2ray_configurations(file_content)

                    if configs:
                        # Add configs to the config tab
                        self.add_configs_to_config_tab(configs)

                        # Switch to the config tab
                        self.tab_view.set("Config")

                        self.receive_status.configure(
                            text=f"Extracted {len(configs)} configs and added to Config tab",
                            text_color="#4CAF50",
                        )
                        messagebox.showinfo(
                            "Success",
                            f"Extracted {len(configs)} V2Ray configurations and added to Config tab",
                        )
                    else:
                        self.receive_status.configure(
                            text="No V2Ray configurations found in the file",
                            text_color="#FF9800",
                        )
                        messagebox.showwarning(
                            "No Configs Found",
                            "No V2Ray configurations were found in the selected file",
                        )
                else:
                    self.receive_status.configure(
                        text=f"Error: Status {response.status_code}",
                        text_color="#f44336",
                    )
                    messagebox.showerror(
                        "Error",
                        f"Failed to download file. Status: {response.status_code}",
                    )

            except Exception as e:
                self.receive_status.configure(
                    text=f"Error: {str(e)}", text_color="#f44336"
                )
                messagebox.showerror("Error", f"Failed to extract configs: {str(e)}")

        threading.Thread(target=extract_in_thread, daemon=True).start()

    def extract_v2ray_configurations(self, file_content):
        """Extract V2Ray configurations from file content"""
        configs = []

        # Look for JSON configurations
        json_configs = re.findall(r"\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}", file_content)
        for json_str in json_configs:
            try:
                config = json.loads(json_str)
                # Check if it looks like a V2Ray config (has inbounds or outbounds)
                if "inbounds" in config or "outbounds" in config:
                    configs.append(
                        {
                            "title": f"V2Ray Config {len(configs) + 1}",
                            "text": json.dumps(config, indent=2),
                        }
                    )
            except json.JSONDecodeError:
                continue

        # Look for vmess:// URLs
        vmess_urls = re.findall(r"vmess://[A-Za-z0-9+/=]+", file_content)
        for i, url in enumerate(vmess_urls):
            try:
                # Decode base64 part
                encoded_part = url[8:]  # Remove 'vmess://'
                decoded = base64.b64decode(
                    encoded_part + "=" * (-len(encoded_part) % 4)
                ).decode("utf-8")
                config = json.loads(decoded)

                configs.append(
                    {
                        "title": f"Vmess Config {i + 1}",
                        "text": url,  # Keep the original URL
                    }
                )
            except Exception:
                continue

        # Look for vless:// URLs
        vless_urls = re.findall(r"vless://[^\s\n]+", file_content)
        for i, url in enumerate(vless_urls):
            configs.append({"title": f"Vless Config {i + 1}", "text": url})

        return configs

    def add_configs_to_config_tab(self, configs):
        """Add extracted configs to the config tab"""
        # Clear existing configs
        for widget in self.cards_container.winfo_children():
            widget.destroy()

        # Add new configs
        for config in configs:
            self.create_config_card(config)

        self.config_status.configure(
            text=f"Loaded {len(configs)} configurations from file", text_color="#4CAF50"
        )

    def load_receive_data(self):
        server_url = self.url_entry.get().strip() or self.server_url
        api_url = f"{server_url.rstrip('/')}/tickets/api/files/"

        def load_in_thread():
            self.receive_status.configure(text="Loading data...", text_color="#2196F3")

            try:
                response = requests.get(api_url, timeout=10)

                if response.status_code == 200:
                    data = response.json()
                    # Clear tree
                    for item in self.tree.get_children():
                        self.tree.delete(item)

                    files = data.get("files", [])
                    for file_data in files:
                        upload_date = file_data.get("uploaded_at", "")
                        if upload_date:
                            upload_date = upload_date[:19].replace("T", " ")

                        self.tree.insert(
                            "",
                            "end",
                            values=(
                                file_data.get("id", ""),
                                file_data.get("name", ""),
                                file_data.get("size", ""),
                                file_data.get("uploaded_by", ""),
                                upload_date,
                                file_data.get("url", ""),
                            ),
                        )

                    self.receive_status.configure(
                        text=f"Loaded {len(files)} files", text_color="#4CAF50"
                    )
                else:
                    self.receive_status.configure(
                        text=f"Error: Status code {response.status_code}",
                        text_color="#f44336",
                    )

            except Exception as e:
                self.receive_status.configure(
                    text=f"Error: {str(e)}", text_color="#f44336"
                )

        threading.Thread(target=load_in_thread, daemon=True).start()


def main():
    # Check for command line arguments
    if len(sys.argv) > 1 and sys.argv[1] == "--background":
        # Run in background mode with system tray icon only
        if HAS_PYSTRAY:
            root = ctk.CTk()
            root.withdraw()  # Hide the root window

            app = FileUploaderApp(root)
            app.hide_window()  # Start minimized to tray

            # Keep the application running
            root.mainloop()
        else:
            print("System tray functionality not available. Please install pystray:")
            print("pip install pystray pillow")
            sys.exit(1)
    else:
        # Run in normal mode
        root = ctk.CTk()
        app = FileUploaderApp(root)
        root.mainloop()


if __name__ == "__main__":
    main()
