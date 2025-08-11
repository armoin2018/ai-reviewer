# Diff Directory

This directory contains patch/diff files for version control and rollback capabilities.

## Structure

```
diff/
├── README.md (this file)
├── patches/           # Version-specific patch files
│   ├── 2025.08.11-00001.patch
│   ├── 2025.08.11-00002.patch
│   └── ...
├── rollbacks/         # Rollback scripts
│   ├── rollback-2025.08.11-00001.sh
│   └── ...
└── snapshots/         # Full snapshots for major versions
    ├── baseline-2025.08.11.tar.gz
    └── ...
```

## Usage

### Creating a Patch
```bash
# Create patch for current changes
git diff > diff/patches/$(date +%Y.%m.%d-%05d).patch
```

### Applying a Patch
```bash
# Apply a specific patch
git apply diff/patches/2025.08.11-00001.patch
```

### Creating Rollback Scripts
Rollback scripts should:
1. Restore files to previous state
2. Update HISTORY.md with rollback entry
3. Reset version tracking appropriately

## Version Format
- Patch files: `YYYY.MM.DD-#####.patch`
- Rollback scripts: `rollback-YYYY.MM.DD-#####.sh`
- Snapshots: `baseline-YYYY.MM.DD.tar.gz`

This system enables:
- Point-in-time recovery
- Change replay capabilities
- Version rollback for testing
- Incremental change tracking