import customtkinter as ctk
from tkinter import filedialog, messagebox, ttk
import requests
import os
from pathlib import Path
import json
import tempfile
import shutil
import threading

# Set appearance mode and color theme
ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("blue")


class AdminApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Admin Panel for Django Server")
        self.root.geometry("1000x700")
        self.root.minsize(900, 600)

        # Variables
        self.selected_file = None
        self.server_url = "http://185.92.181.112:8000/"

        # Create UI with tabs
        self.create_widgets()

    def create_widgets(self):
        # Main container
        main_container = ctk.CTkFrame(self.root, corner_radius=10)
        main_container.pack(fill="both", expand=True, padx=15, pady=15)

        # Header
        header_frame = ctk.CTkFrame(main_container, fg_color="transparent", height=70)
        header_frame.pack(fill="x", padx=20, pady=(10, 5))

        title_label = ctk.CTkLabel(
            header_frame,
            text="Admin Panel for Django Server",
            font=ctk.CTkFont(size=24, weight="bold"),
        )
        title_label.pack(side="left", pady=10)

        # Server URL frame
        url_frame = ctk.CTkFrame(header_frame, fg_color="transparent")
        url_frame.pack(side="right", pady=10)

        url_label = ctk.CTkLabel(
            url_frame, text="Server URL:", font=ctk.CTkFont(size=12, weight="bold")
        )
        url_label.pack(side="left", padx=(0, 10))

        self.url_entry = ctk.CTkEntry(
            url_frame,
            width=300,
            font=ctk.CTkFont(size=12),
            placeholder_text="Enter server URL",
        )
        self.url_entry.insert(0, self.server_url)
        self.url_entry.pack(side="left")

        # Tab view
        self.tab_view = ctk.CTkTabview(main_container)
        self.tab_view.pack(fill="both", expand=True, padx=20, pady=(0, 20))

        # Create tabs
        self.send_tab = self.tab_view.add("Send Files")
        self.config_tab = self.tab_view.add("V2Ray Configs")

        # Create tab contents
        self.create_send_tab()
        self.create_config_tab()

    def create_send_tab(self):
        # Main frame
        main_frame = ctk.CTkFrame(self.send_tab, fg_color="transparent")
        main_frame.pack(fill="both", expand=True, padx=20, pady=20)

        # Title
        title_label = ctk.CTkLabel(
            main_frame, text="File Uploader", font=ctk.CTkFont(size=20, weight="bold")
        )
        title_label.pack(pady=(0, 20))

        # File selection frame
        file_frame = ctk.CTkFrame(main_frame, corner_radius=8)
        file_frame.pack(fill="x", pady=(0, 15))

        file_label = ctk.CTkLabel(
            file_frame, text="Selected File:", font=ctk.CTkFont(size=14, weight="bold")
        )
        file_label.pack(anchor="w", padx=15, pady=(15, 5))

        file_display_frame = ctk.CTkFrame(file_frame, fg_color="transparent")
        file_display_frame.pack(fill="x", padx=15, pady=(0, 15))

        self.file_label = ctk.CTkLabel(
            file_display_frame,
            text="No file selected",
            font=ctk.CTkFont(size=12),
            text_color="gray",
        )
        self.file_label.pack(side="left", fill="x", expand=True)

        select_btn = ctk.CTkButton(
            file_display_frame,
            text="Browse...",
            command=self.select_file,
            font=ctk.CTkFont(size=12),
            width=100,
            height=32,
        )
        select_btn.pack(side="right")

        self.file_info = ctk.CTkLabel(
            file_frame, text="", font=ctk.CTkFont(size=12), text_color="#2196F3"
        )
        self.file_info.pack(anchor="w", padx=15, pady=(0, 15))

        # Upload button
        self.upload_btn = ctk.CTkButton(
            main_frame,
            text="Upload File",
            command=self.upload_file,
            font=ctk.CTkFont(size=14, weight="bold"),
            height=40,
            state="disabled",
            fg_color="#4CAF50",
            hover_color="#388E3C",
        )
        self.upload_btn.pack(fill="x", pady=(0, 15))

        # Telegram section
        telegram_frame = ctk.CTkFrame(main_frame, corner_radius=8)
        telegram_frame.pack(fill="x", pady=(0, 15))

        telegram_title = ctk.CTkLabel(
            telegram_frame,
            text="Telegram V2Ray Config Handler",
            font=ctk.CTkFont(size=14, weight="bold"),
        )
        telegram_title.pack(anchor="w", padx=15, pady=(15, 5))

        telegram_desc = ctk.CTkLabel(
            telegram_frame,
            text="Download and upload V2Ray config files sent via Telegram",
            font=ctk.CTkFont(size=12),
        )
        telegram_desc.pack(anchor="w", padx=15, pady=(0, 10))

        self.download_upload_btn = ctk.CTkButton(
            telegram_frame,
            text="Process Telegram Config File",
            command=self.download_and_upload_telegram_file,
            font=ctk.CTkFont(size=12, weight="bold"),
            height=36,
            fg_color="#2196F3",
            hover_color="#1976D2",
        )
        self.download_upload_btn.pack(fill="x", padx=15, pady=(0, 15))

        # Status frame
        status_frame = ctk.CTkFrame(main_frame, corner_radius=8)
        status_frame.pack(fill="both", expand=True)

        status_label = ctk.CTkLabel(
            status_frame, text="Status:", font=ctk.CTkFont(size=14, weight="bold")
        )
        status_label.pack(anchor="w", padx=15, pady=(15, 5))

        # Status text with scrollbar
        text_frame = ctk.CTkFrame(status_frame, fg_color="transparent")
        text_frame.pack(fill="both", expand=True, padx=15, pady=(0, 15))

        self.status_text = ctk.CTkTextbox(
            text_frame, font=ctk.CTkFont(size=12), wrap="word"
        )
        self.status_text.pack(fill="both", expand=True, side="left")

        scrollbar = ctk.CTkScrollbar(text_frame, command=self.status_text.yview)
        scrollbar.pack(fill="y", side="right")
        self.status_text.configure(yscrollcommand=scrollbar.set)

        # Clear button
        clear_btn = ctk.CTkButton(
            status_frame,
            text="Clear Status",
            command=self.clear_status,
            font=ctk.CTkFont(size=12),
            height=32,
            fg_color="#f44336",
            hover_color="#d32f2f",
        )
        clear_btn.pack(anchor="e", padx=15, pady=(0, 15))

    def create_config_tab(self):
        # Main frame
        main_frame = ctk.CTkFrame(self.config_tab, fg_color="transparent")
        main_frame.pack(fill="both", expand=True, padx=20, pady=20)

        # Title
        title_label = ctk.CTkLabel(
            main_frame,
            text="V2Ray Configurations",
            font=ctk.CTkFont(size=20, weight="bold"),
        )
        title_label.pack(pady=(0, 20))

        # Create config form
        form_frame = ctk.CTkFrame(main_frame, corner_radius=8)
        form_frame.pack(fill="x", pady=(0, 15))

        form_title = ctk.CTkLabel(
            form_frame,
            text="Create New Configuration",
            font=ctk.CTkFont(size=14, weight="bold"),
        )
        form_title.pack(anchor="w", padx=15, pady=(15, 10))

        # Title input
        title_label = ctk.CTkLabel(form_frame, text="Title:", font=ctk.CTkFont(size=12))
        title_label.pack(anchor="w", padx=15, pady=(0, 5))

        self.title_entry = ctk.CTkEntry(
            form_frame,
            font=ctk.CTkFont(size=12),
            height=32,
            placeholder_text="Enter configuration title",
        )
        self.title_entry.pack(fill="x", padx=15, pady=(0, 10))

        # Text input
        text_label = ctk.CTkLabel(form_frame, text="Text:", font=ctk.CTkFont(size=12))
        text_label.pack(anchor="w", padx=15, pady=(0, 5))

        self.text_text = ctk.CTkTextbox(
            form_frame, font=ctk.CTkFont(size=12), height=120
        )
        self.text_text.pack(fill="x", padx=15, pady=(0, 10))

        # Status selection
        status_frame = ctk.CTkFrame(form_frame, fg_color="transparent")
        status_frame.pack(fill="x", padx=15, pady=(0, 10))

        status_label = ctk.CTkLabel(
            status_frame, text="Status:", font=ctk.CTkFont(size=12)
        )
        status_label.pack(side="left")

        self.status_var = ctk.StringVar(value="off")
        on_radio = ctk.CTkRadioButton(
            status_frame,
            text="On",
            variable=self.status_var,
            value="on",
            font=ctk.CTkFont(size=12),
        )
        on_radio.pack(side="left", padx=(20, 10))

        off_radio = ctk.CTkRadioButton(
            status_frame,
            text="Off",
            variable=self.status_var,
            value="off",
            font=ctk.CTkFont(size=12),
        )
        off_radio.pack(side="left")

        # Create button
        create_btn = ctk.CTkButton(
            form_frame,
            text="Create Configuration",
            command=self.create_config,
            font=ctk.CTkFont(size=12, weight="bold"),
            height=36,
            fg_color="#4CAF50",
            hover_color="#388E3C",
        )
        create_btn.pack(fill="x", padx=15, pady=(0, 15))

        # Config notebook
        config_notebook = ctk.CTkTabview(main_frame)
        config_notebook.pack(fill="both", expand=True)

        # Create tabs
        files_tab = config_notebook.add("Uploaded Files")
        configs_tab = config_notebook.add("V2Ray Configs")

        # Create tab contents
        self.create_uploaded_files_section(files_tab)
        self.create_v2ray_configs_section(configs_tab)

    def create_v2ray_configs_section(self, parent):
        # Main frame
        main_frame = ctk.CTkFrame(parent, fg_color="transparent")
        main_frame.pack(fill="both", expand=True, padx=10, pady=10)

        # Control frame
        control_frame = ctk.CTkFrame(main_frame, fg_color="transparent")
        control_frame.pack(fill="x", pady=(0, 10))

        refresh_btn = ctk.CTkButton(
            control_frame,
            text="Refresh Configs",
            command=self.load_configs,
            font=ctk.CTkFont(size=12),
            width=140,
            height=32,
            fg_color="#2196F3",
            hover_color="#1976D2",
        )
        refresh_btn.pack(side="left", padx=(0, 10))

        self.delete_selected_configs_btn = ctk.CTkButton(
            control_frame,
            text="Delete Selected",
            command=self.delete_selected_configs,
            font=ctk.CTkFont(size=12),
            width=140,
            height=32,
            fg_color="#f44336",
            hover_color="#d32f2f",
            state="disabled",
        )
        self.delete_selected_configs_btn.pack(side="left")

        # Treeview frame
        tree_frame = ctk.CTkFrame(main_frame, corner_radius=8)
        tree_frame.pack(fill="both", expand=True)

        # Create treeview with scrollbars
        tree_container = ctk.CTkFrame(tree_frame, fg_color="transparent")
        tree_container.pack(fill="both", expand=True, padx=10, pady=10)

        # Vertical scrollbar
        v_scrollbar = ctk.CTkScrollbar(tree_container, orientation="vertical")
        v_scrollbar.pack(side="right", fill="y")

        # Horizontal scrollbar
        h_scrollbar = ctk.CTkScrollbar(tree_container, orientation="horizontal")
        h_scrollbar.pack(side="bottom", fill="x")

        # Treeview
        self.config_tree = ttk.Treeview(
            tree_container,
            columns=("ID", "Title", "Status", "Created"),
            show="headings",
            yscrollcommand=v_scrollbar.set,
            xscrollcommand=h_scrollbar.set,
            selectmode="extended",
            height=15,
        )

        # Configure scrollbars
        v_scrollbar.configure(command=self.config_tree.yview)
        h_scrollbar.configure(command=self.config_tree.xview)

        # Configure columns
        self.config_tree.heading("ID", text="ID")
        self.config_tree.heading("Title", text="Title")
        self.config_tree.heading("Status", text="Status")
        self.config_tree.heading("Created", text="Created")

        self.config_tree.column("ID", width=50, anchor="center")
        self.config_tree.column("Title", width=200, anchor="w")
        self.config_tree.column("Status", width=80, anchor="center")
        self.config_tree.column("Created", width=150, anchor="center")

        self.config_tree.pack(fill="both", expand=True)

        # Bind selection event
        self.config_tree.bind("<<TreeviewSelect>>", self.on_config_tree_select)

        # Status label
        self.config_status = ctk.CTkLabel(
            main_frame,
            text="Click 'Refresh Configs' to load configurations",
            font=ctk.CTkFont(size=12),
            text_color="#2196F3",
        )
        self.config_status.pack(pady=(10, 0))

    def create_uploaded_files_section(self, parent):
        # Main frame
        main_frame = ctk.CTkFrame(parent, fg_color="transparent")
        main_frame.pack(fill="both", expand=True, padx=10, pady=10)

        # Control frame
        control_frame = ctk.CTkFrame(main_frame, fg_color="transparent")
        control_frame.pack(fill="x", pady=(0, 10))

        refresh_btn = ctk.CTkButton(
            control_frame,
            text="Refresh Files",
            command=self.load_files,
            font=ctk.CTkFont(size=12),
            width=120,
            height=32,
            fg_color="#2196F3",
            hover_color="#1976D2",
        )
        refresh_btn.pack(side="left", padx=(0, 10))

        self.delete_selected_files_btn = ctk.CTkButton(
            control_frame,
            text="Delete Selected",
            command=self.delete_selected_files,
            font=ctk.CTkFont(size=12),
            width=120,
            height=32,
            fg_color="#f44336",
            hover_color="#d32f2f",
            state="disabled",
        )
        self.delete_selected_files_btn.pack(side="left")

        # Add Export Working Configs button
        self.export_configs_btn = ctk.CTkButton(
            control_frame,
            text="Export Working Configs",
            command=self.export_working_configs,
            font=ctk.CTkFont(size=12),
            width=160,
            height=32,
            fg_color="#FF9800",
            hover_color="#F57C00",
        )
        self.export_configs_btn.pack(side="right")

        # Treeview frame
        tree_frame = ctk.CTkFrame(main_frame, corner_radius=8)
        tree_frame.pack(fill="both", expand=True)

        # Create treeview with scrollbars
        tree_container = ctk.CTkFrame(tree_frame, fg_color="transparent")
        tree_container.pack(fill="both", expand=True, padx=10, pady=10)

        # Vertical scrollbar
        v_scrollbar = ctk.CTkScrollbar(tree_container, orientation="vertical")
        v_scrollbar.pack(side="right", fill="y")

        # Horizontal scrollbar
        h_scrollbar = ctk.CTkScrollbar(tree_container, orientation="horizontal")
        h_scrollbar.pack(side="bottom", fill="x")

        # Treeview
        self.files_tree = ttk.Treeview(
            tree_container,
            columns=("ID", "Name", "Size", "Uploaded By", "Date"),
            show="headings",
            yscrollcommand=v_scrollbar.set,
            xscrollcommand=h_scrollbar.set,
            selectmode="extended",
            height=15,
        )

        # Configure scrollbars
        v_scrollbar.configure(command=self.files_tree.yview)
        h_scrollbar.configure(command=self.files_tree.xview)

        # Configure columns
        self.files_tree.heading("ID", text="ID")
        self.files_tree.heading("Name", text="File Name")
        self.files_tree.heading("Size", text="Size (bytes)")
        self.files_tree.heading("Uploaded By", text="Uploaded By")
        self.files_tree.heading("Date", text="Upload Date")

        self.files_tree.column("ID", width=50, anchor="center")
        self.files_tree.column("Name", width=200, anchor="w")
        self.files_tree.column("Size", width=100, anchor="center")
        self.files_tree.column("Uploaded By", width=120, anchor="w")
        self.files_tree.column("Date", width=150, anchor="center")

        self.files_tree.pack(fill="both", expand=True)

        # Bind selection event
        self.files_tree.bind("<<TreeviewSelect>>", self.on_files_tree_select)

        # Status label
        self.files_status = ctk.CTkLabel(
            main_frame,
            text="Click 'Refresh Files' to load files",
            font=ctk.CTkFont(size=12),
            text_color="#2196F3",
        )
        self.files_status.pack(pady=(10, 0))

    def on_config_tree_select(self, event):
        selection = self.config_tree.selection()
        if selection:
            self.delete_selected_configs_btn.configure(state="normal")
        else:
            self.delete_selected_configs_btn.configure(state="disabled")

    def on_files_tree_select(self, event):
        selection = self.files_tree.selection()
        if selection:
            self.delete_selected_files_btn.configure(state="normal")
        else:
            self.delete_selected_files_btn.configure(state="disabled")

    def export_working_configs(self):
        """Export working configs from a .txt file to the V2Ray config tab"""
        # Ask user to select a file
        file_path = filedialog.askopenfilename(
            title="Select a file with working configs",
            filetypes=[("Text files", "*.txt"), ("All files", "*.*")],
        )

        if not file_path:
            return

        try:
            # Read the file
            with open(file_path, "r") as f:
                content = f.read()

            # Parse configs (assuming each config is separated by a specific pattern)
            # This is a simple implementation - you might need to adjust based on your file format
            configs = []
            lines = content.split("\n")
            current_config = []

            for line in lines:
                if line.strip() and not line.startswith("#"):
                    if line.startswith("vmess://") or line.startswith("vless://"):
                        if current_config:
                            configs.append("\n".join(current_config))
                            current_config = []
                        configs.append(line)
                    else:
                        current_config.append(line)

            if current_config:
                configs.append("\n".join(current_config))

            # Add configs to the UI
            for i, config_text in enumerate(configs):
                if config_text.strip():
                    # Create a title for the config
                    title = f"Imported Config {i+1}"

                    # Add to the config creation form
                    self.title_entry.delete(0, "end")
                    self.title_entry.insert(0, title)

                    self.text_text.delete("1.0", "end")
                    self.text_text.insert("1.0", config_text)

                    # Create the config
                    self.create_config()

            messagebox.showinfo(
                "Success",
                f"Exported {len(configs)} configurations to the V2Ray config tab",
            )

        except Exception as e:
            messagebox.showerror("Error", f"Failed to export configs: {str(e)}")

    def delete_selected_configs(self):
        """Delete multiple selected configurations"""
        selection = self.config_tree.selection()
        if not selection:
            messagebox.showwarning(
                "Warning", "Please select at least one configuration to delete"
            )
            return

        # Ask for password before deletion
        password = self.ask_for_password()
        if not password:
            return  # User cancelled

        # Confirm deletion
        count = len(selection)
        confirm = messagebox.askyesno(
            "Confirm Delete",
            f"Are you sure you want to delete {count} configuration(s)?",
        )
        if not confirm:
            return

        # Delete each selected configuration
        success_count = 0
        fail_count = 0

        for item in selection:
            values = self.config_tree.item(item)["values"]
            config_id = values[0]

            if self.delete_single_config(config_id, password):
                success_count += 1
            else:
                fail_count += 1

        # Refresh the list
        self.load_configs()
        self.delete_selected_configs_btn.configure(state="disabled")

        # Show result
        messagebox.showinfo(
            "Delete Results",
            f"Successfully deleted: {success_count}\nFailed to delete: {fail_count}",
        )

    def delete_selected_files(self):
        """Delete multiple selected files"""
        selection = self.files_tree.selection()
        if not selection:
            messagebox.showwarning(
                "Warning", "Please select at least one file to delete"
            )
            return

        # Ask for password before deletion
        password = self.ask_for_password()
        if not password:
            return  # User cancelled

        # Confirm deletion
        count = len(selection)
        confirm = messagebox.askyesno(
            "Confirm Delete", f"Are you sure you want to delete {count} file(s)?"
        )
        if not confirm:
            return

        # Delete each selected file
        success_count = 0
        fail_count = 0

        for item in selection:
            values = self.files_tree.item(item)["values"]
            file_id = values[0]
            file_name = values[1]

            if self.delete_single_file(file_id, password):
                success_count += 1
            else:
                fail_count += 1

        # Refresh the list
        self.load_files()
        self.delete_selected_files_btn.configure(state="disabled")

        # Show result
        messagebox.showinfo(
            "Delete Results",
            f"Successfully deleted: {success_count}\nFailed to delete: {fail_count}",
        )

    def delete_single_config(self, config_id, password):
        """Delete a single configuration with the given password"""
        server_url = self.url_entry.get().strip()
        if not server_url:
            server_url = self.server_url

        if not server_url.endswith("/"):
            server_url += "/"

        api_url = server_url + f"tickets/api/config/{config_id}/"

        try:
            # Include password in the request headers
            headers = {"X-Admin-Password": password}
            response = requests.delete(api_url, headers=headers, timeout=30)

            if response.status_code == 200:
                return True
            elif response.status_code == 401:
                messagebox.showerror(
                    "Authentication Error", "Invalid password. Deletion failed."
                )
                return False
            else:
                try:
                    result = response.json()
                    messagebox.showerror(
                        "Error",
                        f"Failed to delete configuration: {result.get('message', 'Unknown error')}",
                    )
                except:
                    pass
                return False

        except Exception as e:
            messagebox.showerror("Error", f"Failed to delete configuration: {str(e)}")
            return False

    def delete_single_file(self, file_id, password):
        """Delete a single file with the given password"""
        server_url = self.url_entry.get().strip()
        if not server_url:
            server_url = self.server_url

        if not server_url.endswith("/"):
            server_url += "/"

        api_url = server_url + f"tickets/api/files/{file_id}/"

        try:
            # Include password in the request headers
            headers = {"X-Admin-Password": password}
            response = requests.delete(api_url, headers=headers, timeout=30)

            if response.status_code == 200:
                return True
            elif response.status_code == 401:
                messagebox.showerror(
                    "Authentication Error", "Invalid password. Deletion failed."
                )
                return False
            else:
                try:
                    result = response.json()
                    messagebox.showerror(
                        "Error",
                        f"Failed to delete file: {result.get('message', 'Unknown error')}",
                    )
                except:
                    pass
                return False

        except Exception as e:
            messagebox.showerror("Error", f"Failed to delete file: {str(e)}")
            return False

    def select_file(self):
        file_path = filedialog.askopenfilename(
            title="Select a file to upload",
            filetypes=[("Text files", "*.txt"), ("All files", "*.*")],
        )

        if file_path:
            self.selected_file = file_path
            filename = os.path.basename(file_path)
            self.file_label.configure(text=filename, text_color="white")

            file_size = os.path.getsize(file_path)
            self.file_info.configure(text=f"Size: {file_size} bytes")

            self.upload_btn.configure(state="normal")

            self.update_status(f"Selected file: {filename}")
        else:
            self.selected_file = None
            self.file_label.configure(text="No file selected", text_color="gray")
            self.file_info.configure(text="")
            self.upload_btn.configure(state="disabled")

    def update_status(self, message):
        self.status_text.insert("end", message + "\n")
        self.status_text.see("end")
        self.root.update_idletasks()

    def clear_status(self):
        self.status_text.delete("1.0", "end")

    def upload_file(self):
        if not self.selected_file:
            messagebox.showerror("Error", "Please select a file first")
            return

        server_url = self.url_entry.get().strip()
        if not server_url:
            messagebox.showerror("Error", "Please enter a server URL")
            return

        if not server_url.endswith("/"):
            server_url += "/"

        upload_url = server_url + "tickets/api/upload/"

        try:
            self.update_status(f"Uploading to: {upload_url}")

            with open(self.selected_file, "rb") as f:
                files = {
                    "file": (os.path.basename(self.selected_file), f, "text/plain")
                }
                response = requests.post(upload_url, files=files, timeout=30)

            if response.status_code == 200:
                result = response.json()
                self.update_status(f"Upload successful!")
                self.update_status(f"File ID: {result.get('file_id')}")
                self.update_status(f"File Name: {result.get('file_name')}")
                self.update_status(
                    f"You can view this file at: {server_url}tickets/api/files/{result.get('file_id')}/"
                )
                self.update_status(
                    f"You can view all files at: {server_url}tickets/api/files/"
                )
                messagebox.showinfo(
                    "Success",
                    "File uploaded successfully!\n\n"
                    f"File ID: {result.get('file_id')}\n"
                    f"File Name: {result.get('file_name')}\n\n"
                    f"View all files at:\n{server_url}tickets/api/files/",
                )
            else:
                try:
                    result = response.json()
                    self.update_status(
                        f"Upload failed: {result.get('message', 'Unknown error')}"
                    )
                except:
                    self.update_status(
                        f"Upload failed with status: {response.status_code}"
                    )
                    self.update_status(f"Response: {response.text}")
                messagebox.showerror("Error", f"Upload failed")

        except Exception as e:
            self.update_status(f"Error: {str(e)}")
            messagebox.showerror("Error", f"Failed to upload file: {str(e)}")

    def download_and_upload_telegram_file(self):
        """
        Download a config file that was sent via Telegram and upload it to Django backend
        """
        # Ask for the file URL or path from Telegram
        file_url = ctk.CTkInputDialog(
            text="Enter the Telegram file URL or path:", title="Telegram File URL"
        ).get_input()

        if not file_url:
            return

        server_url = self.url_entry.get().strip()
        if not server_url:
            messagebox.showerror("Error", "Please enter a server URL")
            return

        if not server_url.endswith("/"):
            server_url += "/"

        upload_url = server_url + "tickets/api/upload/"

        try:
            self.update_status(f"Processing Telegram file: {file_url}")

            # Create a temporary file to store the downloaded content
            temp_file_path = None
            with tempfile.NamedTemporaryFile(
                mode="w+", suffix=".txt", delete=False
            ) as temp_file:
                temp_file_path = temp_file.name

                # If it's a URL, download the file content
                if file_url.startswith("http"):
                    response = requests.get(file_url, timeout=30)
                    response.raise_for_status()
                    temp_file.write(response.text)
                    temp_file.flush()
                else:
                    # If it's a local path, copy the file content
                    with open(file_url, "r") as source_file:
                        shutil.copyfileobj(source_file, temp_file)
                    temp_file.flush()

                # Upload the file to Django backend
                self.update_status(f"Uploading to: {upload_url}")

                with open(temp_file_path, "rb") as f:
                    files = {"file": ("v2ray_configs.txt", f, "text/plain")}
                    response = requests.post(upload_url, files=files, timeout=30)

                if response.status_code == 200:
                    result = response.json()
                    self.update_status(f"Upload successful!")
                    self.update_status(f"File ID: {result.get('file_id')}")
                    self.update_status(f"File Name: {result.get('file_name')}")
                    self.update_status(
                        f"You can view this file at: {server_url}tickets/api/files/{result.get('file_id')}/"
                    )
                    self.update_status(
                        f"You can view all files at: {server_url}tickets/api/files/"
                    )
                    messagebox.showinfo(
                        "Success",
                        "Telegram config file uploaded successfully!\n\n"
                        f"File ID: {result.get('file_id')}\n"
                        f"File Name: {result.get('file_name')}\n\n"
                        f"View all files at:\n{server_url}tickets/api/files/",
                    )
                else:
                    try:
                        result = response.json()
                        self.update_status(
                            f"Upload failed: {result.get('message', 'Unknown error')}"
                        )
                    except:
                        self.update_status(
                            f"Upload failed with status: {response.status_code}"
                        )
                        self.update_status(f"Response: {response.text}")
                    messagebox.showerror("Error", f"Upload failed")

            # Clean up temporary file
            if temp_file_path and os.path.exists(temp_file_path):
                os.unlink(temp_file_path)

        except Exception as e:
            self.update_status(f"Error: {str(e)}")
            messagebox.showerror("Error", f"Failed to process Telegram file: {str(e)}")

    def create_config(self):
        server_url = self.url_entry.get().strip()
        if not server_url:
            messagebox.showerror("Error", "Please enter a server URL")
            return

        title = self.title_entry.get().strip()
        text = self.text_text.get("1.0", "end").strip()
        status = self.status_var.get()

        if not title:
            messagebox.showerror("Error", "Please enter a title")
            return

        if not text:
            messagebox.showerror("Error", "Please enter the configuration text")
            return

        if not server_url.endswith("/"):
            server_url += "/"

        api_url = server_url + "tickets/api/config/"

        try:
            data = {"title": title, "text": text, "status": status}

            response = requests.post(api_url, json=data, timeout=30)

            if response.status_code == 200:
                result = response.json()
                messagebox.showinfo("Success", "Configuration created successfully!")
                self.title_entry.delete(0, "end")
                self.text_text.delete("1.0", "end")
                self.status_var.set("off")
                self.load_configs()
            else:
                try:
                    result = response.json()
                    messagebox.showerror(
                        "Error",
                        f"Failed to create configuration: {result.get('message', 'Unknown error')}",
                    )
                except:
                    messagebox.showerror(
                        "Error",
                        f"Failed to create configuration. Status code: {response.status_code}",
                    )

        except Exception as e:
            messagebox.showerror("Error", f"Failed to create configuration: {str(e)}")

    def load_configs(self):
        server_url = self.url_entry.get().strip()
        if not server_url:
            server_url = self.server_url

        if not server_url.endswith("/"):
            server_url += "/"

        api_url = server_url + "tickets/api/config/"

        def load_in_thread():
            try:
                self.config_status.configure(
                    text="Loading configurations...", text_color="#2196F3"
                )
                self.config_frame.update_idletasks()

                response = requests.get(api_url, timeout=30)

                if response.status_code == 200:
                    data = response.json()

                    # Clear the tree
                    for item in self.config_tree.get_children():
                        self.config_tree.delete(item)

                    configs = data.get("configs", [])
                    for config in configs:
                        created_date = (
                            config.get("created_at", "")[:19].replace("T", " ")
                            if config.get("created_at")
                            else ""
                        )

                        self.config_tree.insert(
                            "",
                            "end",
                            values=(
                                config.get("id", ""),
                                config.get("title", ""),
                                config.get("status", ""),
                                created_date,
                            ),
                        )

                    self.config_status.configure(
                        text=f"Loaded {len(configs)} configurations",
                        text_color="#4CAF50",
                    )
                    self.delete_selected_configs_btn.configure(state="disabled")
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

    def load_files(self):
        """Load uploaded files from the server"""
        server_url = self.url_entry.get().strip()
        if not server_url:
            server_url = self.server_url

        if not server_url.endswith("/"):
            server_url += "/"

        api_url = server_url + "tickets/api/files/"

        def load_in_thread():
            try:
                self.files_status.configure(
                    text="Loading files...", text_color="#2196F3"
                )
                self.config_frame.update_idletasks()

                response = requests.get(api_url, timeout=30)

                if response.status_code == 200:
                    data = response.json()

                    # Clear the tree
                    for item in self.files_tree.get_children():
                        self.files_tree.delete(item)

                    files = data.get("files", [])
                    for file_data in files:
                        upload_date = file_data.get("uploaded_at", "")
                        if upload_date:
                            upload_date = upload_date[:19].replace("T", " ")

                        self.files_tree.insert(
                            "",
                            "end",
                            values=(
                                file_data.get("id", ""),
                                file_data.get("name", ""),
                                file_data.get("size", ""),
                                file_data.get("uploaded_by", ""),
                                upload_date,
                            ),
                        )

                    self.files_status.configure(
                        text=f"Loaded {len(files)} files", text_color="#4CAF50"
                    )
                    self.delete_selected_files_btn.configure(state="disabled")
                else:
                    self.files_status.configure(
                        text=f"Error: Status code {response.status_code}",
                        text_color="#f44336",
                    )

            except Exception as e:
                self.files_status.configure(
                    text=f"Error: {str(e)}", text_color="#f44336"
                )

        threading.Thread(target=load_in_thread, daemon=True).start()

    def ask_for_password(self):
        """Prompt the user for admin password"""
        password = ctk.CTkInputDialog(
            text="Enter admin password:", title="Admin Authentication"
        ).get_input()

        return password


def main():
    root = ctk.CTk()
    app = AdminApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()
