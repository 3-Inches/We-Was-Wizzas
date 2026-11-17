"""Regenerate every JSON data file under app/src/data/generated from the markdown corpus.

Usage:  python3 -I tools/extract/run_all.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))  # so that it also runs with -I

import extract_abilities
import extract_covlab
import extract_diseases
import extract_spells
import extract_vf
import extract_vf_refs
import extract_magic_qualities
import extract_mysteries
import extract_bestiary

if __name__ == "__main__":
    extract_vf.main()
    extract_vf_refs.main()
    extract_magic_qualities.main()
    extract_abilities.main()
    extract_spells.main()
    extract_covlab.lab_data()
    extract_covlab.hooks_boons()
    extract_covlab.shape_material()
    extract_covlab.weapons()
    extract_diseases.main()
    extract_mysteries.main()
    extract_bestiary.main()
