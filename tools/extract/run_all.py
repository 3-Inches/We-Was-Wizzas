"""Regenerate every JSON data file under app/src/data/generated from the markdown corpus.

Usage:  python3 tools/extract/run_all.py
"""
import extract_abilities
import extract_covlab
import extract_spells
import extract_vf

if __name__ == "__main__":
    extract_vf.main()
    extract_abilities.main()
    extract_spells.main()
    extract_covlab.lab_data()
    extract_covlab.hooks_boons()
    extract_covlab.shape_material()
    extract_covlab.weapons()
