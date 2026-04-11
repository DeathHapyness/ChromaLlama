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
from ddgs import DDGS
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

app = Flask(__name__)

usar_web = True
folder_path = "db"
REDIS_URL = "redis://localhost:6379"

embedding = FastEmbedEmbeddings()

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1024, chunk_overlap=80, length_function=len, is_separator_regex=False
)

raw_prompt = ChatPromptTemplate.from_messages([
    ("system", "Você é um assistente técnico especializado em Linux e código. Responda sempre em português do Brasil. Use o histórico da conversa e o contexto fornecido para responder. Se não souber a resposta, diga que não sabe."),
    MessagesPlaceholder(variable_name="chat_history"),
    ("human", "{input}"),
])

def get_model(pergunta):
    pergunta = pergunta.lower()
    palavras_tecnicas = ["bash", "linux", "script", "code", "terminal", "python", "git", "ssh", "kernel", "package", "install", "comando"]
    if any(word in pergunta for word in palavras_tecnicas):
        logger.info("[MODEL SELECT] Query tecnica detectada -> usando qwen2.5-coder:7b")
        return Ollama(model="qwen2.5-coder:7b")
    logger.info("[MODEL SELECT] Query geral detectada -> usando mistral:7b")
    return Ollama(model="mistral:7b")

def get_session_history(session_id: str) -> RedisChatMessageHistory:
    return RedisChatMessageHistory(session_id=session_id, url=REDIS_URL)

@app.route("/")
def home():
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
        chain = raw_prompt | llm

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
        return {"answer": response}
    except Exception as e:
        logger.error(f"[/ai] ERRO: {str(e)}")
        return {"error": str(e)}, 500

@app.route("/ask_pdf", methods=["POST"])
def askPDFPost():
    try:
        logger.info("[/ask_pdf] Rota chamada")
        json_content = request.json
        query = json_content.get("query")
        session_id = json_content.get("session_id", "default")
        logger.info(f"[/ask_pdf] Query: '{query}' | Session: '{session_id}'")

        logger.info("[/ask_pdf] Carregando vector store")
        vector_store = Chroma(persist_directory=folder_path, embedding_function=embedding)

        retriever = vector_store.as_retriever(
            search_type="similarity_score_threshold",
            search_kwargs={
                "k": 5,
                "score_threshold": 0.5,
            },
        )

        llm = get_model(query)
        document_chain = create_stuff_documents_chain(llm, raw_prompt)
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

        vector_store = Chroma.from_documents(
            documents=chunks, embedding=embedding, persist_directory=folder_path
        )
        vector_store.persist()

        logger.info("[/pdf] PDF indexado com sucesso")
        return {
            "status": "Successfully Uploaded",
            "filename": file_name,
            "doc_len": len(docs),
            "chunks": len(chunks),
        }
    except Exception as e:
        logger.error(f"[/pdf] ERRO: {str(e)}")
        return {"error": str(e)}, 500

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

if usar_web:
    @app.route("/search_web", methods=["POST"])
    def searchWebPost():
        try:
            logger.info("[/search_web] Rota chamada")
            json_content = request.json
            query = json_content.get("query")
            session_id = json_content.get("session_id", "default")
            logger.info(f"[/search_web] Query: '{query}' | Session: '{session_id}'")
            results = search_web(query)
            return {"results": results}
        except Exception as e:
            logger.error(f"[/search_web] ERRO: {str(e)}")
            return {"error": str(e)}, 500

def start_app():
    app.run(host="0.0.0.0", port=8080, debug=True)

if __name__ == "__main__":
    start_app()