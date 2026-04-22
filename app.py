from flask import Flask, request, render_template
from langchain_community.llms import Ollama
from langchain_community.vectorstores import Chroma
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.embeddings.fastembed import FastEmbedEmbeddings
from langchain_community.document_loaders import PDFPlumberLoader
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.chains import create_retrieval_chain
from langchain.prompts import PromptTemplate, ChatPromptTemplate, MessagesPlaceholder
from langchain_community.chat_message_histories import RedisChatMessageHistory
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain_core.messages import HumanMessage, AIMessage
from langchain.agents import create_react_agent, AgentExecutor
from langchain.tools import tool
from dotenv import load_dotenv
import os
from pymilvus import Collection, connections
from ddgs import DDGS
import logging
from langchain_community.document_loaders import WebBaseLoader
from langchain_community.vectorstores import Milvus
import json

with open("palavras.json", "r", encoding="utf-8") as f:
    palavras = json.load(f)
# remove o chroma_client inteiro

#carregar variáveis de ambiente do .env
load_dotenv()

ZILLIZ_URI = os.getenv("ZILLIZ_URI")
ZILLIZ_TOKEN = os.getenv("ZILLIZ_TOKEN")

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

agent_prompt = PromptTemplate.from_template("""Você é um assistente técnico especializado em Linux e código.
Responda sempre em português do Brasil.

Regras importantes:
- Para saudações e perguntas simples, responda diretamente sem usar ferramentas.
- Para geração de código HTML, CSS, JavaScript, Python, Bash ou qualquer linguagem, responda diretamente com seu próprio conhecimento sem usar ferramentas.
- Para perguntas sobre configurações, instalações ou informações específicas de software, busque no banco de dados primeiro.
- Se o banco de dados não tiver informação suficiente, complemente com a busca na web.
- Se o banco de dados retornar "Nenhum documento relevante encontrado", vá imediatamente para a busca na web sem tentar o banco de dados novamente.
- Se a busca na web também não tiver informação suficiente, responda com o seu próprio conhecimento.
- Nunca invente informações. Se não souber, diga que não sabe.

Você tem acesso às seguintes ferramentas:
{tools}

Use o seguinte formato:
Question: a pergunta que você deve responder
Thought: você deve sempre pensar sobre o que fazer
Action: a ação a tomar, deve ser uma de [{tool_names}]
Action Input: o input para a ação
Observation: o resultado da ação
... (este Thought/Action/Action Input/Observation pode se repetir N vezes)
Thought: Agora eu sei a resposta final
Final Answer: a resposta final para a pergunta original

Histórico da conversa:
{chat_history}

Question: {input}
Thought: {agent_scratchpad}""")

app = Flask(__name__)

usar_web = True
folder_path = "db"
REDIS_URL = "redis://localhost:6379"

embedding = FastEmbedEmbeddings()

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1024, chunk_overlap=200, length_function=len, is_separator_regex=False
)

conversa_prompt = ChatPromptTemplate.from_messages([
    ("system", """Você é um assistente amigável chamado ChromaLlama. 
Responda sempre em português do Brasil de forma natural e amigável.
Não gere código a não ser que seja explicitamente pedido.
Mantenha respostas curtas e naturais para saudações e conversas simples."""),
    MessagesPlaceholder(variable_name="chat_history"),
    ("human", "{input}"),
])

def classificar_pergunta(query: str) -> str:
    pergunta = query.lower()
    
    if any(word in pergunta for word in palavras["conversa"]):
        logger.info("[ROUTER] Pergunta classificada como: 'conversa'")
        return "conversa"
    
    if any(word in pergunta for word in palavras["codigo"]):
        logger.info("[ROUTER] Pergunta classificada como: 'codigo'")
        return "codigo"
    
    logger.info("[ROUTER] Pergunta classificada como: 'informacao'")
    return "informacao"

def get_model(pergunta):
    pergunta = pergunta.lower()
    palavras_tecnicas = ["bash", "linux", "script", "code", "terminal", "python", "git", "ssh", "kernel", "package", "install", "comando", "html", "css", "javascript", "js", "site", "web","codigo","java","c++","c#","ruby","go","rust","docker","kubernetes","ansible","terraform","cloud","aws","azure","gcp"] 
    if any(word in pergunta for word in palavras_tecnicas):
        logger.info("[MODEL SELECT] Query tecnica detectada -> usando qwen2.5-coder:7b")
        return Ollama(model="qwen2.5-coder:7b")  
    logger.info("[MODEL SELECT] Query geral detectada -> usando mistral:7b")
    return Ollama(model="mistral:7b")

def get_session_history(session_id: str) -> RedisChatMessageHistory:
    return RedisChatMessageHistory(session_id=session_id, url=REDIS_URL)

def search_web(query):
    logger.info(f"[WEB SEARCH] Modelo recorreu a internet! Query: '{query}'")
    results = []
    try:
        with DDGS() as ddgs:
            for r in ddgs.text(query, max_results=5):
                results.append({"title": r["title"], "href": r["href"]})
                logger.info(f"[WEB SEARCH] -> {r['title']} | {r['href']}")
        logger.info(f"[WEB SEARCH] Total encontrado: {len(results)} resultados")
    except Exception as e:
        logger.error(f"[WEB SEARCH] ERRO na busca: {str(e)}")
    return results

@tool
def buscar_no_db(query: str) -> str:
    """Use esta ferramenta primeiro para buscar informações nos documentos indexados pelo usuário."""
    try:
        resultados = []

        # Busca na coleção de documentos PDF
        vector_store_docs = Milvus(
            embedding_function=embedding,
            connection_args={"uri": ZILLIZ_URI, "token": ZILLIZ_TOKEN},
            collection_name="chromallama",
        )
        retriever_docs = vector_store_docs.as_retriever(
            search_type="similarity",
            search_kwargs={"k": 5}
        )
        docs = retriever_docs.invoke(query)
        resultados.extend(docs)

        # Busca na coleção de datasets
        vector_store_datasets = Milvus(
            embedding_function=embedding,
            connection_args={"uri": ZILLIZ_URI, "token": ZILLIZ_TOKEN},
            collection_name="chromallama_datasets",
        )
        retriever_datasets = vector_store_datasets.as_retriever(
            search_type="similarity",
            search_kwargs={"k": 5}
        )
        docs_datasets = retriever_datasets.invoke(query)
        resultados.extend(docs_datasets)

        if not resultados:
            return "Nenhum documento relevante encontrado no banco de dados."
        
        return "\n\n".join([doc.page_content for doc in resultados])
    except Exception as e:
        logger.error(f"[TOOL buscar_no_db] ERRO: {str(e)}")
        return f"Erro ao buscar no banco de dados: {str(e)}"
@tool
def buscar_na_web(query: str) -> str:
    """Use esta ferramenta quando a busca no banco de dados for insuficiente ou precisar de informações atuais."""
    try:
        resultados = search_web(query)
        if not resultados:
            return "Nenhum resultado encontrado na web."
        
        urls = [r["href"] for r in resultados[:2]]
        logger.info(f"[WEB SEARCH] Acessando conteúdo das páginas: {urls}")
        
        try:
            loader = WebBaseLoader(urls)
            docs = loader.load()
            conteudo = "\n\n".join([doc.page_content[:2000] for doc in docs])
            logger.info(f"[WEB SEARCH] Conteúdo carregado de {len(docs)} páginas")
            return conteudo if conteudo.strip() else "Conteúdo das páginas não pôde ser extraído."
        except Exception as e:
            logger.warning(f"[WEB SEARCH] Falha ao carregar páginas, usando só URLs: {str(e)}")
            return "\n".join([f"- {r['title']}: {r['href']}" for r in resultados])

    except Exception as e:
        logger.error(f"[TOOL buscar_na_web] ERRO: {str(e)}")
        return f"Erro ao buscar na web: {str(e)}"

@app.route("/")
def home():
    return render_template("chat_modern.html")

@app.route("/old")
def old_home():
    return render_template("index.html")

@app.route("/ai", methods=["POST"])
def aiPost():
    try:
        logger.info("[/ai] Rota chamada")
        json_content = request.json
        query = json_content.get("query")
        session_id = json_content.get("session_id", "default")
        logger.info(f"[/ai] Query: '{query}' | Session: '{session_id}'")
        llm = get_model(query)
        chain = conversa_prompt | llm
        chain_with_history = RunnableWithMessageHistory(
            chain,
            get_session_history,
            input_messages_key="input",
            history_messages_key="chat_history",
        )
        response = chain_with_history.invoke(
            {"input": query},
            config={"configurable": {"session_id": session_id}}
        )
        logger.info("[/ai] Resposta gerada com sucesso")
        answer = response.content if hasattr(response, 'content') else response
        return {"answer": answer}
    except Exception as e:
        logger.error(f"[/ai] ERRO: {str(e)}")
        return {"error": str(e)}, 500

@app.route("/ask_pdf", methods=["POST"])
def askPDFPost():
    try:
        vector_store = Milvus(
            embedding_function=embedding,
            connection_args={"uri": ZILLIZ_URI, "token": ZILLIZ_TOKEN},
            collection_name="chromallama",
        )
        logger.info("[/ask_pdf] Rota chamada")
        json_content = request.json
        query = json_content.get("query")
        session_id = json_content.get("session_id", "default")
        logger.info(f"[/ask_pdf] Query: '{query}' | Session: '{session_id}'")
        logger.info("[/ask_pdf] Carregando vector store")
        vector_store = Milvus(
            embedding_function=embedding,
            connection_args={"uri": ZILLIZ_URI, "token": ZILLIZ_TOKEN},
            collection_name="chromallama",
        )
        retriever = vector_store.as_retriever(
            search_type="similarity_score_threshold",
            search_kwargs={"k": 5, "score_threshold": 0.5},
        )
        llm = get_model(query)
        document_chain = create_stuff_documents_chain(llm, conversa_prompt)
        chain = create_retrieval_chain(retriever, document_chain)
        chain_with_history = RunnableWithMessageHistory(
            chain,
            get_session_history,
            input_messages_key="input",
            history_messages_key="chat_history",
        )
        result = chain_with_history.invoke(
            {"input": query},
            config={"configurable": {"session_id": session_id}}
        )
        sources = []
        for doc in result["context"]:
            sources.append(
                {"source": doc.metadata["source"], "page_content": doc.page_content}
            )
        logger.info(f"[/ask_pdf] Resposta gerada. Fontes: {len(sources)}")
        return {"answer": result["answer"], "sources": sources}
    except Exception as e:
        logger.error(f"[/ask_pdf] ERRO: {str(e)}")
        return {"error": str(e)}, 500

@app.route("/pdf", methods=["POST"])
def pdfPost():
    try:
        logger.info("[/pdf] Rota chamada")
        file = request.files["file"]
        file_name = file.filename
        save_file = "pdf/" + file_name
        file.save(save_file)
        logger.info(f"[/pdf] Arquivo salvo: {file_name}")
        loader = PDFPlumberLoader(save_file)
        docs = loader.load_and_split()
        logger.info(f"[/pdf] Paginas carregadas: {len(docs)}")
        chunks = text_splitter.split_documents(docs)
        logger.info(f"[/pdf] Chunks gerados: {len(chunks)}")
        batch_size = 500
        for i in range(0, len(chunks), batch_size):
            batch = chunks[i:i + batch_size]
            if i == 0:
                vector_store = Milvus.from_documents(
                    documents=batch,
                    embedding=embedding,
                    connection_args={"uri": ZILLIZ_URI, "token": ZILLIZ_TOKEN},
                    collection_name="chromallama",
                )
            else:
                vector_store.add_documents(batch)
            logger.info(f"[/pdf] Lote {i//batch_size + 1} indexado — {len(batch)} chunks")
        logger.info("[/pdf] PDF indexado com sucesso")
        return {
            "status": "Successfully Uploaded",
            "filename": file_name,
            "doc_len": len(docs),
            "chunks": len(chunks),
        }
    except Exception as e:
        logger.error(f"[/pdf] ERRO: {str(e)}")
        return {"error": str(e)}, 300

@app.route("/chat", methods=["POST"])
def askAgentPost():
    try:
        json_content = request.json
        query = json_content.get("query")
        session_id = json_content.get("session_id", "default")
        logger.info(f"[/chat] Query: '{query}' | Session: '{session_id}'")
        categoria = classificar_pergunta(query)

        if categoria == "codigo":
            logger.info("[ROUTER] Modo: geração de código direto")
            llm = Ollama(model="qwen2.5-coder:7b")
            chain = conversa_prompt | llm
            chain_with_history = RunnableWithMessageHistory(
                chain,
                get_session_history,
                input_messages_key="input",
                history_messages_key="chat_history",
            )
            response = chain_with_history.invoke(
                {"input": query},
                config={"configurable": {"session_id": session_id}}
            )
            answer = response.content if hasattr(response, 'content') else response
            return {"answer": answer}
        
        elif categoria == "conversa":
            logger.info("[ROUTER] Modo: conversa simples")
            llm = Ollama(model="mistral:7b")
            chain = conversa_prompt | llm
            chain_with_history = RunnableWithMessageHistory(
                chain,
                get_session_history,
                input_messages_key="input",
                history_messages_key="chat_history",
            )
            response = chain_with_history.invoke(
                {"input": query},
                config={"configurable": {"session_id": session_id}}
            )
            answer = response.content if hasattr(response, 'content') else response
            return {"answer": answer}
        else:
            logger.info("[ROUTER] Modo: agente com ferramentas")
            llm = get_model(query)
            agent = create_react_agent(
                llm=llm,
                tools=[buscar_no_db, buscar_na_web],
                prompt=agent_prompt
            )
            agent_executor = AgentExecutor(
                agent=agent,
                tools=[buscar_no_db, buscar_na_web],
                max_iterations=8,
                early_stopping_method="force",
                handle_parsing_errors="Formato inválido. Vá direto para: Final Answer: sua resposta aqui",
                verbose=True
            )
            agent_executor_com_historico = RunnableWithMessageHistory(
                agent_executor,
                get_session_history,
                input_messages_key="input",
                history_messages_key="chat_history",
            )
            resultado = agent_executor_com_historico.invoke(
                {"input": query},
                config={"configurable": {"session_id": session_id}}
            )
            return {"answer": resultado["output"]}

    except Exception as e:
        logger.error(f"[/chat] ERRO: {str(e)}")
        return {"error": str(e)}, 500

def start_app():
    app.run(host="0.0.0.0", port=8080, debug=True)

if __name__ == "__main__":
    start_app()