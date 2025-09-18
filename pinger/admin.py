# TODO : add the button which will export the configs which working from the .txt file to the v2ray config tab in the admin pannle 

import tkinter as tk
from tkinter import filedialog, messagebox, ttk, simpledialog
import requests
import os
from pathlib import Path
import json
import tempfile
import shutil

class AdminApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Admin Panel for Django Server")
        self.root.geometry("800x600")  # Increased size to accommodate the new layout
        self.root.resizable(True, True)  # Make it resizable
        
        # Variables
        self.selected_file = None
        self.server_url = "http://185.92.181.112:8000/"  # Updated with the correct server URL
        
        # Create UI with tabs
        self.create_widgets()
        
    def create_widgets(self):
        url_frame = tk.Frame(self.root)
        url_frame.pack(fill=tk.X, padx=10, pady=(10, 5))
        
        tk.Label(url_frame, text="Server URL:", font=("Arial", 10)).pack(anchor=tk.W)
        self.url_entry = tk.Entry(url_frame, font=("Arial", 10))
        self.url_entry.insert(0, self.server_url)
        self.url_entry.pack(fill=tk.X, pady=(5, 0))
        
        self.notebook = ttk.Notebook(self.root)
        self.notebook.pack(fill=tk.BOTH, expand=True, padx=10, pady=(5, 10))
        
        self.send_frame = tk.Frame(self.notebook)
        self.config_frame = tk.Frame(self.notebook)  # Config tab for V2Ray configs
        
        self.notebook.add(self.send_frame, text="Send")
        self.notebook.add(self.config_frame, text="V2Ray Configs")  # Adding the config tab
        
        self.create_send_tab()
        self.create_config_tab()  # Creating the config tab
        
    def create_send_tab(self):
        main_frame = tk.Frame(self.send_frame, padx=20, pady=20)
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        title_label = tk.Label(main_frame, text="Django File Uploader", 
                              font=("Arial", 16, "bold"))
        title_label.pack(pady=(0, 20))
        
        file_frame = tk.Frame(main_frame)
        file_frame.pack(fill=tk.X, pady=(0, 10))
        
        tk.Label(file_frame, text="Selected File:", font=("Arial", 10)).pack(anchor=tk.W)
        
        file_display_frame = tk.Frame(file_frame)
        file_display_frame.pack(fill=tk.X, pady=(5, 0))
        
        self.file_label = tk.Label(file_display_frame, text="No file selected", 
                                  font=("Arial", 9), fg="gray", anchor=tk.W)
        self.file_label.pack(side=tk.LEFT, fill=tk.X, expand=True)
        
        select_btn = tk.Button(file_display_frame, text="Browse...", 
                              command=self.select_file, font=("Arial", 9))
        select_btn.pack(side=tk.RIGHT)
        
        info_frame = tk.Frame(main_frame)
        info_frame.pack(fill=tk.X, pady=(0, 10))
        
        self.file_info = tk.Label(info_frame, text="", font=("Arial", 9), fg="blue")
        self.file_info.pack()
        
        self.upload_btn = tk.Button(main_frame, text="Upload File", 
                                   command=self.upload_file, 
                                   font=("Arial", 12, "bold"),
                                   bg="#4CAF50", fg="white",
                                   state=tk.DISABLED,
                                   height=2)
        self.upload_btn.pack(pady=(0, 10), fill=tk.X)
        
        # New section for downloading and uploading Telegram files
        telegram_frame = tk.LabelFrame(main_frame, text="Telegram V2Ray Config Handler", padx=10, pady=10)
        telegram_frame.pack(fill=tk.X, pady=(0, 10))
        
        tk.Label(telegram_frame, text="Download and upload V2Ray config files sent via Telegram", 
                font=("Arial", 9)).pack(anchor=tk.W)
        
        self.download_upload_btn = tk.Button(telegram_frame, text="Process Telegram Config File", 
                                            command=self.download_and_upload_telegram_file,
                                            font=("Arial", 12, "bold"),
                                            bg="#2196F3", fg="white",
                                            height=2)
        self.download_upload_btn.pack(fill=tk.X, pady=(10, 0))
        
        status_frame = tk.Frame(main_frame)
        status_frame.pack(fill=tk.X, pady=(0, 10))
        
        tk.Label(status_frame, text="Status:", font=("Arial", 10)).pack(anchor=tk.W)
        self.status_text = tk.Text(status_frame, height=5, font=("Arial", 9))
        self.status_text.pack(fill=tk.X, pady=(5, 0))
        
        # Clear button
        clear_btn = tk.Button(main_frame, text="Clear Status", 
                             command=self.clear_status, 
                             font=("Arial", 9),
                             bg="#f44336", fg="white")
        clear_btn.pack(pady=(0, 10))
        
    def create_config_tab(self):
        main_frame = tk.Frame(self.config_frame, padx=20, pady=20)
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        title_label = tk.Label(main_frame, text="V2Ray Configurations", 
                              font=("Arial", 16, "bold"))
        title_label.pack(pady=(0, 10))
        
        # Form for creating new V2Ray config
        form_frame = tk.LabelFrame(main_frame, text="Create New Configuration", padx=10, pady=10)
        form_frame.pack(fill=tk.X, pady=(0, 10))
        
        tk.Label(form_frame, text="Title:", font=("Arial", 10)).pack(anchor=tk.W)
        self.title_entry = tk.Entry(form_frame, font=("Arial", 10))
        self.title_entry.pack(fill=tk.X, pady=(0, 10))
        
        tk.Label(form_frame, text="Text:", font=("Arial", 10)).pack(anchor=tk.W)
        self.text_text = tk.Text(form_frame, height=6, font=("Arial", 10))
        self.text_text.pack(fill=tk.X, pady=(0, 10))
        
        status_frame = tk.Frame(form_frame)
        status_frame.pack(fill=tk.X, pady=(0, 10))
        
        tk.Label(status_frame, text="Status:", font=("Arial", 10)).pack(side=tk.LEFT)
        self.status_var = tk.StringVar(value="off")
        tk.Radiobutton(status_frame, text="On", variable=self.status_var, value="on", font=("Arial", 10)).pack(side=tk.LEFT, padx=(10, 5))
        tk.Radiobutton(status_frame, text="Off", variable=self.status_var, value="off", font=("Arial", 10)).pack(side=tk.LEFT, padx=(5, 0))
        
        create_btn = tk.Button(form_frame, text="Create Configuration", 
                              command=self.create_config,
                              font=("Arial", 12, "bold"),
                              bg="#4CAF50", fg="white",
                              height=2)
        create_btn.pack(fill=tk.X, pady=(10, 0))
        
        # Notebook for configs and files
        config_notebook = ttk.Notebook(main_frame)
        config_notebook.pack(fill=tk.BOTH, expand=True, pady=(10, 0))
        
        configs_frame = tk.Frame(config_notebook)
        files_frame = tk.Frame(config_notebook)
        
        # Changing the order - putting "Uploaded Files" first
        config_notebook.add(files_frame, text="Uploaded Files")
        config_notebook.add(configs_frame, text="V2Ray Configs")
        
        # V2Ray Configs section
        self.create_v2ray_configs_section(configs_frame)
        
        # Uploaded Files section
        self.create_uploaded_files_section(files_frame)
        
    def create_v2ray_configs_section(self, parent):
        """Create the section for managing V2Ray configurations"""
        list_frame = tk.LabelFrame(parent, text="Existing Configurations", padx=10, pady=10)
        list_frame.pack(fill=tk.BOTH, expand=True)
        
        control_frame = tk.Frame(list_frame)
        control_frame.pack(fill=tk.X, pady=(0, 10))
        
        refresh_btn = tk.Button(control_frame, text="Refresh Configs", 
                               command=self.load_configs,
                               font=("Arial", 10),
                               bg="#2196F3", fg="white")
        refresh_btn.pack(side=tk.LEFT, padx=(0, 10))
        
        self.delete_selected_configs_btn = tk.Button(control_frame, text="Delete Selected Configs", 
                                          command=self.delete_selected_configs,
                                          font=("Arial", 10),
                                          bg="#f44336", fg="white",
                                          state=tk.DISABLED)
        self.delete_selected_configs_btn.pack(side=tk.LEFT)
        
        # Treeview for configs with checkboxes
        tree_frame = tk.Frame(list_frame)
        tree_frame.pack(fill=tk.BOTH, expand=True)
        
        scrollbar = tk.Scrollbar(tree_frame)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        
        # Add an extra column for checkboxes
        self.config_tree = ttk.Treeview(tree_frame, columns=("ID", "Title", "Status", "Created"), 
                                       show="headings", yscrollcommand=scrollbar.set, selectmode="extended")
        scrollbar.config(command=self.config_tree.yview)
        
        self.config_tree.heading("ID", text="ID")
        self.config_tree.heading("Title", text="Title")
        self.config_tree.heading("Status", text="Status")
        self.config_tree.heading("Created", text="Created")
        
        self.config_tree.column("ID", width=50)
        self.config_tree.column("Title", width=200)
        self.config_tree.column("Status", width=100)
        self.config_tree.column("Created", width=150)
        
        self.config_tree.pack(fill=tk.BOTH, expand=True)
        
        self.config_tree.bind("<<TreeviewSelect>>", self.on_config_tree_select)
        
        # Add checkbox functionality
        self.config_checkboxes = {}
        
        self.config_status = tk.Label(list_frame, text="Click 'Refresh Configs' to load configurations", 
                                     font=("Arial", 10), fg="blue")
        self.config_status.pack(pady=(10, 0))
        
    def create_uploaded_files_section(self, parent):
        """Create the section for managing uploaded files"""
        list_frame = tk.LabelFrame(parent, text="Uploaded Files", padx=10, pady=10)
        list_frame.pack(fill=tk.BOTH, expand=True)
        
        control_frame = tk.Frame(list_frame)
        control_frame.pack(fill=tk.X, pady=(0, 10))
        
        refresh_btn = tk.Button(control_frame, text="Refresh Files", 
                               command=self.load_files,
                               font=("Arial", 10),
                               bg="#2196F3", fg="white")
        refresh_btn.pack(side=tk.LEFT, padx=(0, 10))
        
        self.delete_selected_files_btn = tk.Button(control_frame, text="Delete Selected Files", 
                                        command=self.delete_selected_files,
                                        font=("Arial", 10),
                                        bg="#f44336", fg="white",
                                        state=tk.DISABLED)
        self.delete_selected_files_btn.pack(side=tk.LEFT)
        
        # Treeview for files
        tree_frame = tk.Frame(list_frame)
        tree_frame.pack(fill=tk.BOTH, expand=True)
        
        scrollbar = tk.Scrollbar(tree_frame)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        
        # Add an extra column for checkboxes
        self.files_tree = ttk.Treeview(tree_frame, columns=("ID", "Name", "Size", "Uploaded By", "Date"), 
                                      show="headings", yscrollcommand=scrollbar.set, selectmode="extended")
        scrollbar.config(command=self.files_tree.yview)
        
        self.files_tree.heading("ID", text="ID")
        self.files_tree.heading("Name", text="File Name")
        self.files_tree.heading("Size", text="Size (bytes)")
        self.files_tree.heading("Uploaded By", text="Uploaded By")
        self.files_tree.heading("Date", text="Upload Date")
        
        self.files_tree.column("ID", width=50)
        self.files_tree.column("Name", width=150)
        self.files_tree.column("Size", width=100)
        self.files_tree.column("Uploaded By", width=100)
        self.files_tree.column("Date", width=120)
        
        self.files_tree.pack(fill=tk.BOTH, expand=True)
        
        self.files_tree.bind("<<TreeviewSelect>>", self.on_files_tree_select)
        
        # Add checkbox functionality
        self.files_checkboxes = {}
        
        self.files_status = tk.Label(list_frame, text="Click 'Refresh Files' to load files", 
                                    font=("Arial", 10), fg="blue")
        self.files_status.pack(pady=(10, 0))
        
    def on_config_tree_select(self, event):
        selection = self.config_tree.selection()
        if selection:
            self.delete_selected_configs_btn.config(state=tk.NORMAL)
        else:
            self.delete_selected_configs_btn.config(state=tk.DISABLED)
            
    def on_files_tree_select(self, event):
        selection = self.files_tree.selection()
        if selection:
            self.delete_selected_files_btn.config(state=tk.NORMAL)
        else:
            self.delete_selected_files_btn.config(state=tk.DISABLED)
            
    def delete_selected_configs(self):
        """Delete multiple selected configurations"""
        selection = self.config_tree.selection()
        if not selection:
            messagebox.showwarning("Warning", "Please select at least one configuration to delete")
            return
            
        # Ask for password before deletion
        password = self.ask_for_password()
        if not password:
            return  # User cancelled
            
        # Confirm deletion
        count = len(selection)
        confirm = messagebox.askyesno("Confirm Delete", f"Are you sure you want to delete {count} configuration(s)?")
        if not confirm:
            return
            
        # Delete each selected configuration
        success_count = 0
        fail_count = 0
        
        for item in selection:
            values = self.config_tree.item(item)['values']
            config_id = values[0]
            
            if self.delete_single_config(config_id, password):
                success_count += 1
            else:
                fail_count += 1
                
        # Refresh the list
        self.load_configs()
        self.delete_selected_configs_btn.config(state=tk.DISABLED)
        
        # Show result
        messagebox.showinfo("Delete Results", f"Successfully deleted: {success_count}\nFailed to delete: {fail_count}")
            
    def delete_selected_files(self):
        """Delete multiple selected files"""
        selection = self.files_tree.selection()
        if not selection:
            messagebox.showwarning("Warning", "Please select at least one file to delete")
            return
            
        # Ask for password before deletion
        password = self.ask_for_password()
        if not password:
            return  # User cancelled
            
        # Confirm deletion
        count = len(selection)
        confirm = messagebox.askyesno("Confirm Delete", f"Are you sure you want to delete {count} file(s)?")
        if not confirm:
            return
            
        # Delete each selected file
        success_count = 0
        fail_count = 0
        
        for item in selection:
            values = self.files_tree.item(item)['values']
            file_id = values[0]
            file_name = values[1]
            
            if self.delete_single_file(file_id, password):
                success_count += 1
            else:
                fail_count += 1
                
        # Refresh the list
        self.load_files()
        self.delete_selected_files_btn.config(state=tk.DISABLED)
        
        # Show result
        messagebox.showinfo("Delete Results", f"Successfully deleted: {success_count}\nFailed to delete: {fail_count}")
            
    def delete_single_config(self, config_id, password):
        """Delete a single configuration with the given password"""
        server_url = self.url_entry.get().strip()
        if not server_url:
            server_url = self.server_url
            
        if not server_url.endswith('/'):
            server_url += '/'
            
        api_url = server_url + f"tickets/api/config/{config_id}/"
        
        try:
            # Include password in the request headers
            headers = {'X-Admin-Password': password}
            response = requests.delete(api_url, headers=headers, timeout=30)
            
            if response.status_code == 200:
                return True
            elif response.status_code == 401:
                messagebox.showerror("Authentication Error", "Invalid password. Deletion failed.")
                return False
            else:
                try:
                    result = response.json()
                    messagebox.showerror("Error", f"Failed to delete configuration: {result.get('message', 'Unknown error')}")
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
            
        if not server_url.endswith('/'):
            server_url += '/'
            
        api_url = server_url + f"tickets/api/files/{file_id}/"
        
        try:
            # Include password in the request headers
            headers = {'X-Admin-Password': password}
            response = requests.delete(api_url, headers=headers, timeout=30)
            
            if response.status_code == 200:
                return True
            elif response.status_code == 401:
                messagebox.showerror("Authentication Error", "Invalid password. Deletion failed.")
                return False
            else:
                try:
                    result = response.json()
                    messagebox.showerror("Error", f"Failed to delete file: {result.get('message', 'Unknown error')}")
                except:
                    pass
                return False
                    
        except Exception as e:
            messagebox.showerror("Error", f"Failed to delete file: {str(e)}")
            return False
            
    def select_file(self):
        file_path = filedialog.askopenfilename(
            title="Select a file to upload",
            filetypes=[
                ("Text files", "*.txt"),
                ("All files", "*.*")
            ]
        )
        
        if file_path:
            self.selected_file = file_path
            filename = os.path.basename(file_path)
            self.file_label.config(text=filename, fg="black")
            
            file_size = os.path.getsize(file_path)
            self.file_info.config(text=f"Size: {file_size} bytes")
            
            self.upload_btn.config(state=tk.NORMAL)
            
            self.update_status(f"Selected file: {filename}")
        else:
            self.selected_file = None
            self.file_label.config(text="No file selected", fg="gray")
            self.file_info.config(text="")
            self.upload_btn.config(state=tk.DISABLED)
            
    def update_status(self, message):
        self.status_text.insert(tk.END, message + "\n")
        self.status_text.see(tk.END)
        self.root.update_idletasks()
        
    def clear_status(self):
        self.status_text.delete(1.0, tk.END)
        
    def upload_file(self):
        if not self.selected_file:
            messagebox.showerror("Error", "Please select a file first")
            return
            
        server_url = self.url_entry.get().strip()
        if not server_url:
            messagebox.showerror("Error", "Please enter a server URL")
            return
            
        if not server_url.endswith('/'):
            server_url += '/'
            
        upload_url = server_url + "tickets/api/upload/"
        
        try:
            self.update_status(f"Uploading to: {upload_url}")
            
            with open(self.selected_file, 'rb') as f:
                files = {'file': (os.path.basename(self.selected_file), f, 'text/plain')}
                response = requests.post(upload_url, files=files, timeout=30)
                
            if response.status_code == 200:
                result = response.json()
                self.update_status(f"Upload successful!")
                self.update_status(f"File ID: {result.get('file_id')}")
                self.update_status(f"File Name: {result.get('file_name')}")
                messagebox.showinfo("Success", "File uploaded successfully!")
            else:
                try:
                    result = response.json()
                    self.update_status(f"Upload failed: {result.get('message', 'Unknown error')}")
                except:
                    self.update_status(f"Upload failed with status: {response.status_code}")
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
        file_url = tk.simpledialog.askstring("Telegram File URL", 
                                           "Enter the Telegram file URL or path:")
        if not file_url:
            return
            
        server_url = self.url_entry.get().strip()
        if not server_url:
            messagebox.showerror("Error", "Please enter a server URL")
            return
            
        if not server_url.endswith('/'):
            server_url += '/'
            
        upload_url = server_url + "tickets/api/upload/"
        
        try:
            self.update_status(f"Processing Telegram file: {file_url}")
            
            # Create a temporary file to store the downloaded content
            temp_file_path = None
            with tempfile.NamedTemporaryFile(mode='w+', suffix='.txt', delete=False) as temp_file:
                temp_file_path = temp_file.name
                
                # If it's a URL, download the file content
                if file_url.startswith('http'):
                    response = requests.get(file_url, timeout=30)
                    response.raise_for_status()
                    temp_file.write(response.text)
                    temp_file.flush()
                else:
                    # If it's a local path, copy the file content
                    with open(file_url, 'r') as source_file:
                        shutil.copyfileobj(source_file, temp_file)
                    temp_file.flush()
                
                # Upload the file to Django backend
                self.update_status(f"Uploading to: {upload_url}")
                
                with open(temp_file_path, 'rb') as f:
                    files = {'file': ('v2ray_configs.txt', f, 'text/plain')}
                    response = requests.post(upload_url, files=files, timeout=30)
                    
                if response.status_code == 200:
                    result = response.json()
                    self.update_status(f"Upload successful!")
                    self.update_status(f"File ID: {result.get('file_id')}")
                    self.update_status(f"File Name: {result.get('file_name')}")
                    messagebox.showinfo("Success", "Telegram config file uploaded successfully!")
                else:
                    try:
                        result = response.json()
                        self.update_status(f"Upload failed: {result.get('message', 'Unknown error')}")
                    except:
                        self.update_status(f"Upload failed with status: {response.status_code}")
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
        text = self.text_text.get("1.0", tk.END).strip()
        status = self.status_var.get()
        
        if not title:
            messagebox.showerror("Error", "Please enter a title")
            return
            
        if not text:
            messagebox.showerror("Error", "Please enter the configuration text")
            return
            
        if not server_url.endswith('/'):
            server_url += '/'
            
        api_url = server_url + "tickets/api/config/"
        
        try:
            data = {
                "title": title,
                "text": text,
                "status": status
            }
            
            response = requests.post(api_url, json=data, timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                messagebox.showinfo("Success", "Configuration created successfully!")
                self.title_entry.delete(0, tk.END)
                self.text_text.delete("1.0", tk.END)
                self.status_var.set("off")
                self.load_configs()
            else:
                try:
                    result = response.json()
                    messagebox.showerror("Error", f"Failed to create configuration: {result.get('message', 'Unknown error')}")
                except:
                    messagebox.showerror("Error", f"Failed to create configuration. Status code: {response.status_code}")
                    
        except Exception as e:
            messagebox.showerror("Error", f"Failed to create configuration: {str(e)}")
            
    def load_configs(self):
        server_url = self.url_entry.get().strip()
        if not server_url:
            server_url = self.server_url
            
        if not server_url.endswith('/'):
            server_url += '/'
            
        api_url = server_url + "tickets/api/config/"
        
        try:
            self.config_status.config(text="Loading configurations...", fg="blue")
            self.config_frame.update_idletasks()
            
            response = requests.get(api_url, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                
                # Clear the tree
                for item in self.config_tree.get_children():
                    self.config_tree.delete(item)
                
                configs = data.get("configs", [])
                for config in configs:
                    created_date = config.get("created_at", "")[:19].replace("T", " ") if config.get("created_at") else ""
                    
                    self.config_tree.insert("", "end", values=(
                        config.get("id", ""),
                        config.get("title", ""),
                        config.get("status", ""),
                        created_date
                    ))
                
                self.config_status.config(text=f"Loaded {len(configs)} configurations")
                self.delete_selected_configs_btn.config(state=tk.DISABLED)  # Reset delete button state
            else:
                self.config_status.config(text=f"Error: Status code {response.status_code}")
                
        except Exception as e:
            self.config_status.config(text=f"Error: {str(e)}")
            
    def load_files(self):
        """Load uploaded files from the server"""
        server_url = self.url_entry.get().strip()
        if not server_url:
            server_url = self.server_url
            
        if not server_url.endswith('/'):
            server_url += '/'
            
        api_url = server_url + "tickets/api/files/"
        
        try:
            self.files_status.config(text="Loading files...", fg="blue")
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
                    
                    self.files_tree.insert("", "end", values=(
                        file_data.get("id", ""), file_data.get("name", ""),
                        file_data.get("size", ""), file_data.get("uploaded_by", ""),
                        upload_date
                    ))
                
                self.files_status.config(text=f"Loaded {len(files)} files")
                self.delete_selected_files_btn.config(state=tk.DISABLED)  # Reset delete button state
            else:
                self.files_status.config(text=f"Error: Status code {response.status_code}")
                
        except Exception as e:
            self.files_status.config(text=f"Error: {str(e)}")
            
    def ask_for_password(self):
        """Prompt the user for admin password"""
        password = tk.simpledialog.askstring("Admin Authentication", "Enter admin password:", show='*')
        return password

def main():
    root = tk.Tk()
    app = AdminApp(root)
    root.mainloop()

if __name__ == "__main__":
    main()