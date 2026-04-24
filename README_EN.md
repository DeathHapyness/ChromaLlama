# ChromaLlama

![ChromaLlama Banner](static/js/img/Gemini_Generated_Image_9vbp7y9vbp7y9vbp.png)

<div align="center">

**Languages:** [🇧🇷 Português](README.md) | 🇺🇸 **English**

</div>

> ⚠️ **Project under development** — currently in testing phase. Features may change or exhibit instability/bugs.

Your new personal AI assistant focused on Linux and coding, running completely local via Ollama and fully Open-Source. It combines open-source language models, semantic search in PDF documents, persistent conversation history with Redis, and web search via DuckDuckGo.

---

## Features

- **Chat with Memory** — Conversation history persisted per session in Redis.
- **RAG with PDFs** — Upload documentations and manuals; the assistant uses them as a knowledge base.
- **Web Search** — Fallback to DuckDuckGo when real-time information is needed.
- **Automatic Model Selection** — Chooses the most suitable model based on the query type.
- **AMD GPU Acceleration** — ROCm support for running models on the GPU.
- **Web Interface** — Frontend in HTML/JS integrated with Flask.

---

## Architecture

```text
Frontend (HTML/JS)
       │
       ▼
Flask (app.py)
       │
       ├── /ai           → Direct LLM chat + Redis history
       ├── /ask_pdf      → RAG with Zilliz/Chroma + Redis history
       ├── /pdf          → PDF upload and indexing
       └── /search_web   → DuckDuckGo Search
       │
       ├── Redis         → Session-based conversation history
       ├── Zilliz/Chroma → Vector database for documents
       └── Ollama        → Local LLM server

```

---

## Models Used

| Model | Usage |
|---|---|
| `qwen2.5-coder:7b` | Technical questions about Linux, Bash, code, and terminal |
| `mistral:7b` | General inquiries and conversation |

The selection is automatic, based on keywords found in the user's query.

---

## Hardware Requirements

| Component | Recommended Minimum |
|---|---|
| RAM | 16 GB |
| VRAM | 8 GB |
| GPU | AMD with ROCm support (RX 6000+ series) or NVIDIA with CUDA |
| CPU | Any modern x86-64 |

>The project was developed and tested with a Ryzen 5 5600, RX 6600 XT 8GB, and 32GB of RAM.

---

### Software Requirements

- Linux (Tested on Linux Mint 22 / Ubuntu 24.04)
-  Python 3.12+
-   Ollama installed
-    Redis installed and running
-    ROCm (for AMD) or CUDA (for NVIDIA)

---

## Installation

### Clone the repository
```Bash

git clone [https://github.com/your-user/chromallama.git](https://github.com/your-user/chromallama.git)
cd chromallama
```
### 2. Create and activate virtual environment
```Bash

python3 -m venv .venv
source .venv/bin/activate
```
### 3. Install dependencies
```Bash

pip install flask langchain langchain-community chromadb fastembed pdfplumber ddgs redis
```
### 4. Install Ollama
```Bash

curl -fsSL [https://ollama.com/install.sh](https://ollama.com/install.sh) | sh
```
### 5. Pull the models
```Bash

ollama pull qwen2.5-coder:7b
ollama pull mistral:7b
```
### 6. Create necessary directories
```Bash

mkdir -p pdf db
```
## AMD GPU Configuration (ROCm)

If you have an AMD RX 6000 series GPU or higher, follow these steps:

    Download the AMD installer:
    Bash

wget [https://repo.radeon.com/amdgpu-install/7.2.1/ubuntu/noble/amdgpu-install_7.2.1.70201-1_all.deb](https://repo.radeon.com/amdgpu-install/7.2.1/ubuntu/noble/amdgpu-install_7.2.1.70201-1_all.deb)
sudo dpkg -i amdgpu-install_7.2.1.70201-1_all.deb

### Install ROCm:
```Bash

sudo amdgpu-install --usecase=rocm --no-dkms

Add user to groups:
```
```Bash

sudo usermod -a -G render,video $USER

Set environment variable for Ollama:
```
```Bash

sudo mkdir -p /etc/systemd/system/ollama.service.d
sudo nano /etc/systemd/system/ollama.service.d/override.conf

Paste:
Plaintext

[Service]
Environment="HSA_OVERRIDE_GFX_VERSION=10.3.0"

Restart service:
```
Bash

    sudo systemctl daemon-reload
    sudo systemctl restart ollama
```
```
--- 

## 🗄️ Redis Configuration

Bash

sudo apt install redis-server
redis-cli ping # Should return PONG

---

## ⚡ Usage
Start the application
```
Bash

source .venv/bin/activate
python3 app.py

Access http://localhost:8080 in your browser.
📡 API Routes

    POST /ai: Direct chat with the model.

    POST /pdf: Upload PDF for indexing.

    POST /ask_pdf: Query based on indexed documents.

    POST /search_web: DuckDuckGo web search fallback.
```
---

## 📂 Folder Structure
```
Plaintext

chromallama/
├── app.py              # Main Flask backend
├── apphistori.py       # Document upload history 
├── indexar_datasets.py # Script for indexing initial assets 
├── pdf/                # User-uploaded PDFs
├── static/
│   ├──  css/           # Stylesheets
│   ├──  img/           # Assets/Logo
│   └──  js/            # Frontend logic
├── templates/
│   └── index.html      # Web interface
├── palavras.json       # Keyword mapping
└── requirements.txt
```

---

## 🗺️ Roadmap

    [X] Smart routing between modes.

    [X] ChromaDB isolation by topic.

    [ ] MongoDB integration for session management.

    [ ] Docker support.

    [ ] Model refinement using Unsloth.