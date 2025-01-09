import os
from langchain.document_loaders import PyPDFLoader
import pypdf

def get_context():
    """
    Reads all files in ../data/source_files.
    If a file is PDF, we extract its text using PyPDFLoader.
    Otherwise, we read it as plain text.
    Returns a single string with the contents of all files, each prefixed with its filename.
    """
    directory = "../data/source_files"
    all_text = []

    if not os.path.exists(directory):
        print(f"Warning: Directory {directory} does not exist.")
        return ""

    for filename in os.listdir(directory):
        file_path = os.path.join(directory, filename)

        if not os.path.isfile(file_path):
            continue

        # If it's a PDF, extract the text
        if filename.lower().endswith(".pdf"):
            try:
                loader = PyPDFLoader(file_path)
                docs = loader.load()  # Each doc represents one page
                pdf_content = []
                for i, doc in enumerate(docs, 1):
                    pdf_content.append(f"[Page {i}]: {doc.page_content}")
                all_text.append(f"<{filename}>\n" + "\n".join(pdf_content) + "\n</{filename}>")
            except Exception as e:
                print(f"Error reading PDF {filename}: {e}")
        else:
            # Otherwise, treat it as a plain text file
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    content = f.read()
                    all_text.append(f"<{filename}>\n{content}\n</{filename}>")
            except Exception as e:
                print(f"Error reading file {filename}: {e}")

    return "\n\n".join(all_text)
