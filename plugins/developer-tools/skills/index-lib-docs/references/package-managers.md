# パッケージマネージャー検出ガイド

各言語/エコシステムのパッケージマネージャーを検出し、依存関係を抽出する方法。

## Node.js / JavaScript / TypeScript

### 検出ファイル

| ファイル | パッケージマネージャー |
|----------|------------------------|
| `package-lock.json` | npm |
| `yarn.lock` | yarn |
| `pnpm-lock.yaml` | pnpm |
| `bun.lockb` | bun |

### 依存関係抽出（名前とバージョン範囲）

**package.json から:**
```bash
# production dependencies（名前とバージョン範囲）
jq -r '.dependencies | to_entries[] | "\(.key) \(.value)"' package.json 2>/dev/null

# dev dependencies（名前とバージョン範囲）
jq -r '.devDependencies | to_entries[] | "\(.key) \(.value)"' package.json 2>/dev/null

# peer dependencies（名前とバージョン範囲）
jq -r '.peerDependencies | to_entries[] | "\(.key) \(.value)"' package.json 2>/dev/null
```

**Note:** lock fileからの正確なバージョン取得は不要。ドキュメント参照用途ではpackage.jsonのバージョン範囲（`^18.2.0`等）で十分であり、パッケージマネージャー間のlock fileフォーマット差異を気にする必要がない。

---

## Python

### 検出ファイル

| ファイル | ツール |
|----------|--------|
| `requirements.txt` | pip |
| `pyproject.toml` | poetry / pip |
| `Pipfile` | pipenv |
| `setup.py` | setuptools |

### 依存関係抽出

**requirements.txt:**
```bash
# コメントと空行を除外、パッケージ名のみ抽出
grep -v '^#' requirements.txt | grep -v '^\s*$' | \
  sed 's/\[.*\]//' | \
  cut -d'=' -f1 | cut -d'>' -f1 | cut -d'<' -f1 | cut -d'~' -f1 | \
  tr -d ' '
```

**pyproject.toml (PEP 621形式):**
```bash
# [project.dependencies] セクションから抽出
# 複雑なので Python スクリプトを使うのが確実
python3 -c "
import tomllib
with open('pyproject.toml', 'rb') as f:
    data = tomllib.load(f)
deps = data.get('project', {}).get('dependencies', [])
for dep in deps:
    print(dep.split('>')[0].split('<')[0].split('=')[0].split('[')[0].strip())
"
```

**pyproject.toml (Poetry形式):**
```bash
# [tool.poetry.dependencies] セクションから抽出
python3 -c "
import tomllib
with open('pyproject.toml', 'rb') as f:
    data = tomllib.load(f)
deps = data.get('tool', {}).get('poetry', {}).get('dependencies', {})
for name in deps.keys():
    if name != 'python':
        print(name)
"
```

---

## Rust

### 検出ファイル

| ファイル | ツール |
|----------|--------|
| `Cargo.toml` | cargo |
| `Cargo.lock` | cargo |

### 依存関係抽出

**Cargo.toml:**
```bash
# [dependencies] セクションから抽出
# TOML形式なのでgrepで簡易抽出
awk '/^\[dependencies\]/,/^\[/' Cargo.toml | grep -E '^\w+' | cut -d'=' -f1 | tr -d ' '

# より正確にはtomljで解析
python3 -c "
import tomllib
with open('Cargo.toml', 'rb') as f:
    data = tomllib.load(f)
for dep in data.get('dependencies', {}).keys():
    print(dep)
"
```

**Cargo.lock からバージョン取得:**
```bash
# パッケージ名とバージョンのペアを抽出
grep -A2 '^\[\[package\]\]' Cargo.lock | grep -E '^name|^version' | paste - - | \
  awk '{print $3, $6}' | tr -d '"'
```

---

## Go

### 検出ファイル

| ファイル | ツール |
|----------|--------|
| `go.mod` | go modules |
| `go.sum` | go modules |

### 依存関係抽出

**go.mod:**
```bash
# require ブロックから抽出
awk '/^require \(/,/^\)/' go.mod | grep -v '^require\|^)' | awk '{print $1}'

# 単一行のrequire
grep '^require ' go.mod | awk '{print $2}'
```

**go.sum からバージョン取得:**
```bash
# モジュール名とバージョンを抽出
awk '{print $1, $2}' go.sum | sort -u | grep -v '/go.mod'
```

---

## 共通ユーティリティ

### jqがない場合の代替

```bash
# Node.js を使ってJSONをパース
node -e "
const pkg = require('./package.json');
Object.keys(pkg.dependencies || {}).forEach(d => console.log(d));
"
```

### ファイル存在チェック

```bash
detect_package_manager() {
  local dir="${1:-.}"

  if [ -f "$dir/package.json" ]; then
    if [ -f "$dir/pnpm-lock.yaml" ]; then
      echo "pnpm"
    elif [ -f "$dir/yarn.lock" ]; then
      echo "yarn"
    elif [ -f "$dir/bun.lockb" ]; then
      echo "bun"
    else
      echo "npm"
    fi
  elif [ -f "$dir/pyproject.toml" ]; then
    echo "python"
  elif [ -f "$dir/requirements.txt" ]; then
    echo "pip"
  elif [ -f "$dir/Cargo.toml" ]; then
    echo "cargo"
  elif [ -f "$dir/go.mod" ]; then
    echo "go"
  else
    echo "unknown"
  fi
}
```

---

## 対応優先度

| 優先度 | エコシステム | 理由 |
|--------|--------------|------|
| 高 | Node.js | 最も一般的、npmレジストリAPIが充実 |
| 高 | Python | 広く使われている、PyPIにAPIあり |
| 中 | Rust | crates.ioにAPIあり |
| 中 | Go | pkg.go.devにドキュメントあり |
| 低 | その他 | 必要に応じて追加 |
