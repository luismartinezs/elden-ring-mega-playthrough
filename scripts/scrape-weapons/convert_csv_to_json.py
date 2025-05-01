import csv
import json
import os

# Define paths relative to the script's location
script_dir = os.path.dirname(os.path.abspath(__file__))
csv_file_path = os.path.join(script_dir, 'weapons.csv')
json_file_path = os.path.join(script_dir, 'weapons.json')

def safe_int(value, default=0):
    """Convert value to int, handling '-' or empty strings."""
    if value is None or value == '-' or value.strip() == '':
        return default
    try:
        return int(value)
    except (ValueError, TypeError):
        # Fallback or log error if needed
        print(f"Warning: Could not convert '{value}' to int, using default {default}.")
        return default

def safe_float(value, default=0.0):
    """Convert value to float, handling '-' or empty strings."""
    if value is None or value == '-' or value.strip() == '':
        return default
    try:
        return float(value)
    except (ValueError, TypeError):
        # Fallback or log error if needed
        print(f"Warning: Could not convert '{value}' to float, using default {default}.")
        return default

def safe_str_none(value):
    """Return None if value is '-' or empty, otherwise return the string."""
    if value is None or value == '-' or value.strip() == '':
        return None
    return value

def safe_fp_cost(value):
    """Convert FP cost, handling '-' or potential non-numeric entries"""
    if value is None or value == '-' or value.strip() == '':
        return None
    try:
        return int(value)
    except (ValueError, TypeError):
        # If it's not directly an int, return the original string or None if empty
        return safe_str_none(value)


def parse_bool(value):
    """Convert 'true'/'false' string to boolean."""
    return value.strip().lower() == 'true'

def parse_damage_types(value):
    """Split damage type string into a list."""
    if not value or value == '-':
        return []
    # Handle variations like "Slash / Pierce" or "Slash/Pierce"
    return [dt.strip() for dt in value.replace(' / ', '/').split('/')]

weapons_data = []

try:
    with open(csv_file_path, mode='r', encoding='utf-8') as infile:
        reader = csv.reader(infile)
        header = next(reader) # Read header row

        # Find column indices - more robust than assuming order
        try:
            col_indices = {name: i for i, name in enumerate(header)}
            required_cols = [
                "name", "category", "phyAtk", "magAtk", "fireAtk", "ligtAtk",
                "holyAtk", "critAtk", "sorAtk", "incAtk", "phyGuard", "magGuard",
                "fireGuard", "ligtGuard", "holyGuard", "boostGuard", "strScale",
                "dexScale", "intScale", "faiScale", "arcScale", "strReq", "dexReq",
                "intReq", "faiReq", "arcReq", "damageTypes", "weaponSkill", "fpCost",
                "weight", "passive", "poison", "hemorrhage", "frostbite", "scarletRot",
                "sleep", "madness", "deathBlight", "upgradeType", "url", "sote"
            ]
            for col in required_cols:
                if col not in col_indices:
                    raise ValueError(f"Missing required column in CSV: {col}")
        except ValueError as e:
            print(f"Error reading CSV header: {e}")
            exit(1)


        for row in reader:
            # Skip potentially empty rows or rows with wrong number of columns
            if not row or len(row) != len(header):
                print(f"Skipping malformed row: {row}")
                continue

            # Extract data using column indices
            weapon = {
                "name": row[col_indices["name"]],
                "category": row[col_indices["category"]],
                "url": row[col_indices["url"]],
                "sote": parse_bool(row[col_indices["sote"]]),
                "attack": {
                    "physical": safe_float(row[col_indices["phyAtk"]]),
                    "magic": safe_float(row[col_indices["magAtk"]]),
                    "fire": safe_float(row[col_indices["fireAtk"]]),
                    "lightning": safe_float(row[col_indices["ligtAtk"]]),
                    "holy": safe_float(row[col_indices["holyAtk"]]),
                    "critical": safe_int(row[col_indices["critAtk"]]),
                },
                "sorcery_scaling": safe_int(row[col_indices["sorAtk"]]),
                "incantation_scaling": safe_int(row[col_indices["incAtk"]]),
                "guard": {
                    "physical": safe_float(row[col_indices["phyGuard"]]),
                    "magic": safe_float(row[col_indices["magGuard"]]),
                    "fire": safe_float(row[col_indices["fireGuard"]]),
                    "lightning": safe_float(row[col_indices["ligtGuard"]]),
                    "holy": safe_float(row[col_indices["holyGuard"]]),
                    "boost": safe_int(row[col_indices["boostGuard"]]),
                },
                "scaling": {
                    "strength": safe_str_none(row[col_indices["strScale"]]),
                    "dexterity": safe_str_none(row[col_indices["dexScale"]]),
                    "intelligence": safe_str_none(row[col_indices["intScale"]]),
                    "faith": safe_str_none(row[col_indices["faiScale"]]),
                    "arcane": safe_str_none(row[col_indices["arcScale"]]),
                },
                "requirements": {
                    "strength": safe_int(row[col_indices["strReq"]]),
                    "dexterity": safe_int(row[col_indices["dexReq"]]),
                    "intelligence": safe_int(row[col_indices["intReq"]]),
                    "faith": safe_int(row[col_indices["faiReq"]]),
                    "arcane": safe_int(row[col_indices["arcReq"]]),
                },
                "damage_types": parse_damage_types(row[col_indices["damageTypes"]]),
                "weapon_skill": {
                     "name": safe_str_none(row[col_indices["weaponSkill"]]),
                     "fp_cost": safe_fp_cost(row[col_indices["fpCost"]])
                },
                "weight": safe_float(row[col_indices["weight"]]),
                "upgrade_type": row[col_indices["upgradeType"]],
                 # Handle potential "ERR" or other non-numeric values in status columns
                "passive_description": safe_str_none(row[col_indices["passive"]]),
                "status_buildup": {
                    "poison": safe_int(row[col_indices["poison"]]),
                    "hemorrhage": safe_int(row[col_indices["hemorrhage"]]),
                    "frostbite": safe_int(row[col_indices["frostbite"]]),
                    "scarlet_rot": safe_int(row[col_indices["scarletRot"]]),
                    "sleep": safe_int(row[col_indices["sleep"]]),
                    "madness": safe_int(row[col_indices["madness"]]),
                    "death_blight": safe_int(row[col_indices["deathBlight"]]),
                }
            }
            weapons_data.append(weapon)

except FileNotFoundError:
    print(f"Error: Input CSV file not found at {csv_file_path}")
    exit(1)
except Exception as e:
    print(f"An error occurred during CSV processing: {e}")
    exit(1)

# Write to JSON file
try:
    with open(json_file_path, 'w', encoding='utf-8') as outfile:
        json.dump(weapons_data, outfile, indent=2, ensure_ascii=False)
    print(f"Successfully converted CSV to JSON: {json_file_path}")
except IOError as e:
    print(f"Error writing JSON file: {e}")
except Exception as e:
    print(f"An unexpected error occurred during JSON writing: {e}")