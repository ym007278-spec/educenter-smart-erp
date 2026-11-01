#!/usr/bin/env python3
"""
EduCenter Smart ERP - Source Code Packaging Script
Creates a clean, production-ready .zip archive of the complete project
excluding temporary build artifacts, node_modules, and cache files.
"""

import os
import zipfile
import sys

def package_project(output_filename="educenter-erp-source.zip"):
    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    output_path = os.path.join(project_root, output_filename)
    public_path = os.path.join(project_root, "public", output_filename)

    exclude_dirs = {
        "node_modules",
        "dist",
        ".git",
        "__pycache__",
        ".pytest_cache",
        ".turbo",
        ".next",
        ".aistudio"
    }

    exclude_files = {
        output_filename,
        ".DS_Store",
        "npm-debug.log",
        "yarn-error.log"
    }

    print(f"📦 Packaging EduCenter ERP from: {project_root}")
    total_files = 0

    with zipfile.ZipFile(output_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(project_root):
            dirs[:] = [d for d in dirs if d not in exclude_dirs]
            for file in files:
                if file not in exclude_files and not file.endswith(".pyc"):
                    full_path = os.path.join(root, file)
                    rel_path = os.path.relpath(full_path, project_root)
                    zf.write(full_path, rel_path)
                    total_files += 1

    file_size_mb = os.path.getsize(output_path) / (1024 * 1024)
    print(f"✅ Created: {output_path}")
    print(f"📁 Total Files Archived: {total_files}")
    print(f"📊 Archive Size: {file_size_mb:.2f} MB")

    # Mirror to public directory for direct browser download
    os.makedirs(os.path.dirname(public_path), exist_ok=True)
    import shutil
    shutil.copyfile(output_path, public_path)
    print(f"🚀 Download Link Available at: /educenter-erp-source.zip")

if __name__ == "__main__":
    package_project()
