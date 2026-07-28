"""
Script to analyze Python and TypeScript imports across the Sherpa monorepo
and generate a clean docs/IMPORT_MAP.md dependency reference.
"""
import os
import re

def generate_import_map():
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    backend_dir = os.path.join(base_dir, "backend", "app")
    output_file = os.path.join(base_dir, "docs", "IMPORT_MAP.md")

    modules = {}

    if os.path.exists(backend_dir):
        for root, _, files in os.walk(backend_dir):
            for file in files:
                if file.endswith(".py") and not file.startswith("__"):
                    rel_path = os.path.relpath(os.path.join(root, file), base_dir)
                    filepath = os.path.join(root, file)
                    imports = []
                    with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                        for line in f:
                            match = re.match(r"^(?:from|import)\s+app\.([a-zA-Z0-9_\.]+)", line.strip())
                            if match:
                                imports.append(f"app.{match.group(1)}")
                    if imports:
                        modules[rel_path] = sorted(list(set(imports)))

    with open(output_file, "w", encoding="utf-8") as f:
        f.write("# Backend Import & Dependency Map\n\n")
        f.write("Auto-generated reference showing internal app dependencies across backend modules.\n\n")
        for mod, imp_list in sorted(modules.items()):
            f.write(f"### `{mod}`\n")
            for imp in imp_list:
                f.write(f"- Imports `backend/{imp.replace('.', '/')}`\n")
            f.write("\n")

if __name__ == "__main__":
    generate_import_map()
