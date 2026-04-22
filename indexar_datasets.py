#--------------------------------------------------------------------------------
#Script para indexar os datasets no Zilliz usando FastEmbedEmbeddings
#Executar este script apenas uma vez para cada dataset, ou quando quiser atualizar os dados indexados
#--------------------------------------------------------------------------------
from dotenv import load_dotenv
import os
from datasets import load_dataset
from langchain_community.vectorstores import Milvus
from langchain_community.embeddings.fastembed import FastEmbedEmbeddings
from langchain.schema import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

load_dotenv()

ZILLIZ_URI = os.getenv("ZILLIZ_URI")
ZILLIZ_TOKEN = os.getenv("ZILLIZ_TOKEN")

embedding = FastEmbedEmbeddings()

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1024, chunk_overlap=200, length_function=len
)

def formatar_dataset(dataset, nome):
    print(f"Formatando {nome}...")
    documentos = []
    for exemplo in dataset:
        instrucao = exemplo.get("instruction", "")
        entrada = exemplo.get("input", "")
        saida = exemplo.get("output", "")

        if entrada:
            texto = f"Instrução: {instrucao}\nContexto: {entrada}\nResposta: {saida}"
        else:
            texto = f"Instrução: {instrucao}\nResposta: {saida}"

        documentos.append(Document(page_content=texto, metadata={"source": nome}))
    
    print(f"{nome}: {len(documentos)} exemplos carregados")
    return documentos

def indexar_no_zilliz(documentos, nome_dataset):
    chunks = text_splitter.split_documents(documentos)
    print(f"Total de chunks: {len(chunks)}")
    
    vector_store = Milvus(
        embedding_function=embedding,
        connection_args={"uri": ZILLIZ_URI, "token": ZILLIZ_TOKEN},
        collection_name="chromallama_datasets",
        auto_id=True,
    )
    
    batch_size = 500
    for i in range(0, len(chunks), batch_size):
        batch = chunks[i:i + batch_size]
        vector_store.add_documents(batch)
        print(f"Lote {i//batch_size + 1} indexado — {len(batch)} chunks")
    
    print(f"{nome_dataset} indexado com sucesso!")
    print(f"{nome_dataset} indexado com sucesso!")

def main():
    print("Carregando datasets do HuggingFace...")

    print("\n1/3 - CodeAlpaca-20k")
    ds_code = load_dataset("sahil2801/CodeAlpaca-20k", split="train")
    docs_code = formatar_dataset(ds_code, "CodeAlpaca-20k")
    indexar_no_zilliz(docs_code, "CodeAlpaca-20k")

    print("\n2/3 - Python Instructions")
    ds_python = load_dataset("iamtarun/python_code_instructions_18k_alpaca", split="train")
    docs_python = formatar_dataset(ds_python, "python_code_instructions")
    indexar_no_zilliz(docs_python, "python_code_instructions")

    print("\n3/3 - Open-Platypus")
    ds_platypus = load_dataset("garage-bAInd/Open-Platypus", split="train")
    docs_platypus = formatar_dataset(ds_platypus, "Open-Platypus")
    indexar_no_zilliz(docs_platypus, "Open-Platypus")

    print("\nTodos os datasets indexados com sucesso!")

if __name__ == "__main__":
    main()