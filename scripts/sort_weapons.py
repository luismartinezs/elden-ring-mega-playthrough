import re

def get_sort_key(line):
    match = re.search(r'\((\d+)\)$', line)
    if match:
        return int(match.group(1))
    # Handle lines without the expected pattern, placing them at the beginning or end
    # Here, we place them at the beginning by returning -1
    return -1

def sort_weapon_file(filepath="weapon_requirements.md"):
    try:
        with open(filepath, 'r') as f:
            lines = f.readlines()
    except FileNotFoundError:
        print(f"Error: File not found at {filepath}")
        return

    # Filter out empty lines before sorting
    non_empty_lines = [line for line in lines if line.strip()]

    # Sort the non-empty lines
    sorted_lines = sorted(non_empty_lines, key=get_sort_key)

    try:
        with open(filepath, 'w') as f:
            f.writelines(sorted_lines)
        print(f"Successfully sorted {filepath}")
    except IOError:
        print(f"Error: Could not write to file {filepath}")

if __name__ == "__main__":
    sort_weapon_file()