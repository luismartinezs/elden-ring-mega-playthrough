import re
import os
import shutil

# Get the directory where the script is located
script_dir = os.path.dirname(os.path.abspath(__file__))

# Define the default input filepath relative to the script directory
default_input_filename = "weapon_requirements.md"
default_input_filepath = os.path.join(script_dir, default_input_filename)

def recalculate_totals(input_filepath=default_input_filepath):
    """
    Reads the input markdown file, recalculates the total stat requirements for each weapon,
    and updates the file in place.
    """
    temp_filepath = input_filepath + ".tmp"
    updated_lines = []
    pattern = re.compile(r"(- \[ \] [^\(]+)\((\d+|-)[\/](\d+|-)[\/](\d+|-)[\/](\d+|-)[\/](\d+|-)\) \(\d+\)")

    try:
        with open(input_filepath, 'r') as infile:
            for line in infile:
                match = pattern.match(line.strip())
                if match:
                    prefix = match.group(1)
                    stats_str = match.groups()[1:] # Get STR, DEX, INT, FAI, ARC as strings

                    total = 0
                    stat_values = []
                    for s in stats_str:
                        if s == '-':
                            stat_values.append('-')
                            continue
                        try:
                            val = int(s)
                            stat_values.append(str(val))
                            total += 0 if val <= 10 else val - 10
                        except ValueError:
                            # Keep the original if conversion fails, though pattern should prevent this
                            stat_values.append(s)

                    # Reconstruct the stats part, handling potential '-'
                    stats_part = "/".join(stat_values)

                    updated_line = f"{prefix}({stats_part}) ({total})\n"
                    updated_lines.append(updated_line)
                else:
                    # Keep lines that don't match the pattern as they are
                    updated_lines.append(line)

        # Write updated content to a temporary file
        with open(temp_filepath, 'w') as outfile:
            outfile.writelines(updated_lines)

        # Replace the original file with the temporary file
        shutil.move(temp_filepath, input_filepath)
        print(f"Successfully updated totals in {input_filepath}")

    except FileNotFoundError:
        print(f"Error: Input file not found at {input_filepath}")
    except Exception as e:
        print(f"An error occurred: {e}")
        # Clean up the temporary file if it exists
        if os.path.exists(temp_filepath):
            os.remove(temp_filepath)

if __name__ == "__main__":
    recalculate_totals()