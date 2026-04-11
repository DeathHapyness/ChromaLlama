
![ChromaLlama Banner](static/js/img/Gemini_Generated_Image_9vbp7y9vbp7y9vbp.png)

Sua nova assistente de IA pessoal focado em Linux e código, rodando completamente local via Ollama e totalmente Open-SourceS. Combina modelos de linguagem open source, busca semântica em documentos PDF, histórico de conversa persistente com Redis e busca na web via DuckDuckGo.


---

## Funcionalidades

- **Chat com memória** — histórico de conversa persistido por sessão no Redis
- **RAG com PDFs** — envie documentações e manuais, o assistente usa como base de conhecimento
- **Busca na web** — fallback para DuckDuckGo quando necessário
- **Seleção automática de modelo** — escolhe o modelo mais adequado dependendo do tipo de pergunta
- **Aceleração por GPU AMD** — suporte a ROCm para rodar os modelos na GPU
- **Interface web** — frontend em HTML/JS integrado ao Flask

---

## Arquitetura

```
Frontend (HTML/JS)
       │
       ▼
Flask (app.py)
       │
       ├── /ai           → Chat direto com LLM + histórico Redis
       ├── /ask_pdf      → RAG com ChromaDB + histórico Redis
       ├── /pdf          → Upload e indexação de PDFs
       └── /search_web   → Busca no DuckDuckGo
       │
       ├── Redis         → Histórico de conversa por sessão
       ├── ChromaDB      → Banco vetorial para documentos
       └── Ollama        → Servidor local de LLMs
```

---

## Modelos utilizados

| Modelo | Uso |
|---|---|
| `qwen2.5-coder:7b` | Perguntas técnicas sobre Linux, bash, código, terminal |
| `mistral:7b` | Perguntas gerais e conversas |

A seleção é automática baseada em palavras-chave na pergunta do usuário.

---

## Requisitos de Hardware

| Componente | Mínimo recomendado |
|---|---|
| RAM | 16 GB |
| VRAM | 8 GB |
| GPU | AMD com suporte a ROCm (série RX 6000+) ou NVIDIA com CUDA |
| CPU | Qualquer x86-64 moderno |

> O projeto foi desenvolvido e testado com Ryzen 5 5600, RX 6600 XT 8GB e 32GB de RAM.

---

## Requisitos de Software

- Linux (testado no Linux Mint 22 baseado em Ubuntu 24.04)
- Python 3.12+
- Ollama instalado
- Redis instalado e rodando
- ROCm (para GPU AMD) ou CUDA (para GPU NVIDIA)

---

## Instalação

### 1. Clone o repositório

```bash
git clone https://github.com/seu-usuario/chromallama.git
cd chromallama
```

### 2. Crie e ative o ambiente virtual

```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 3. Instale as dependências

```bash
pip install flask langchain langchain-community chromadb fastembed pdfplumber ddgs redis
```

### 4. Instale o Ollama

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### 5. Baixe os modelos

```bash
ollama pull qwen2.5-coder:7b
ollama pull mistral:7b
```

### 6. Crie as pastas necessárias

```bash
mkdir -p pdf db
```

---

## Configuração da GPU AMD (ROCm)

Se você tem uma GPU AMD série RX 6000 ou superior, siga esses passos para ativar a aceleração por GPU.

### 1. Baixe o instalador AMD

```bash
wget https://repo.radeon.com/amdgpu-install/7.2.1/ubuntu/noble/amdgpu-install_7.2.1.70201-1_all.deb
sudo dpkg -i amdgpu-install_7.2.1.70201-1_all.deb
```

### 2. Instale o ROCm

```bash
sudo amdgpu-install --usecase=rocm --no-dkms
```

### 3. Adicione seu usuário aos grupos necessários

```bash
sudo usermod -a -G render,video $USER
```

### 4. Configure a variável de ambiente no serviço do Ollama

```bash
sudo mkdir -p /etc/systemd/system/ollama.service.d
sudo nano /etc/systemd/system/ollama.service.d/override.conf
```

Cole o conteúdo abaixo no arquivo:

```
[Service]
Environment="HSA_OVERRIDE_GFX_VERSION=10.3.0"
```

### 5. Reinicie o serviço

```bash
sudo systemctl daemon-reload
sudo systemctl restart ollama
```

### 6. Verifique se a GPU está sendo usada

```bash
rocm-smi
```

A coluna `GPU%` deve subir durante inferência.

---

## Configuração do Redis

### Instale o Redis

```bash
sudo apt install redis-server
```

### Verifique se está rodando

```bash
redis-cli ping
```

Deve retornar `PONG`.

---

## Como usar

### Inicie a aplicação

```bash
source .venv/bin/activate
python3 app.py
```

Acesse `http://localhost:8080` no navegador.

---

## Rotas da API

### `POST /ai`
Chat direto com o modelo. Mantém histórico por sessão.

```json
{
    "query": "como instalar o i3wm no arch linux?",
    "session_id": "uuid-da-sessao"
}
```

---

### `POST /pdf`
Upload de PDF para indexação no ChromaDB.

```
Content-Type: multipart/form-data
Campo: file → arquivo .pdf
```

---

### `POST /ask_pdf`
Pergunta baseada nos PDFs indexados.

```json
{
    "query": "como configurar o polybar?",
    "session_id": "uuid-da-sessao"
}
```

---

### `POST /search_web`
Busca no DuckDuckGo.

```json
{
    "query": "últimas atualizações do kernel linux"
}
```

---

## Como alimentar o RAG

O RAG funciona com qualquer PDF que você enviar pela rota `/pdf`. Exemplos de documentos úteis para o foco do projeto:

- Documentação oficial do Arch Linux (disponível em archlinux.org)
- Man pages exportadas em PDF
- Guias de configuração do i3wm, polybar, neovim
- Documentações de ferramentas que você usa no dia a dia

Quanto mais documentação relevante você indexar, mais preciso o assistente será nas respostas técnicas.

---

## Estrutura de pastas

```
chromallama/
├── app.py              # Backend Flask principal
├── pdf/                # PDFs enviados pelo usuário
├── db/                 # Banco vetorial ChromaDB
├── templates/
│   └── index.html      # Interface web
├── static/
│   └── js/
│       └── chat-app.js # Lógica do frontend
└── README.md
```

---

## Próximos passos

- [ ] Roteamento inteligente entre `/ai`, `/ask_pdf` e `/search_web`
- [ ] Isolamento do ChromaDB por assunto/tópico
- [ ] Integração com MongoDB para metadados e gestão de sessões
- [ ] Suporte a Docker para deploy isolado
- [ ] Suporte a múltiplos usuários com sessões independentes

---

## Tecnologias

- [Flask](https://flask.palletsprojects.com/) — framework web
- [LangChain](https://python.langchain.com/) — orquestração de LLMs
- [Ollama](https://ollama.com/) — servidor local de modelos
- [ChromaDB](https://www.trychroma.com/) — banco vetorial
- [Redis](https://redis.io/) — histórico de conversa
- [FastEmbed](https://github.com/qdrant/fastembed) — embeddings
- [DuckDuckGo Search](https://github.com/deedy5/ddgs) — busca na web
- [ROCm](https://rocm.docs.amd.com/) — aceleração GPU AMD