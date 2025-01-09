from flask import Flask, request, jsonify, Response, send_from_directory
import google.generativeai as genai
import os
from dotenv import load_dotenv
from flask_cors import CORS
import json
import re

from document_processor import get_context

# Load environment variables
load_dotenv()

app = Flask(__name__, static_folder='static')
CORS(app)  # Enable CORS for all routes

# Initialize Gemini with API key
genai.configure(api_key=os.getenv('GOOGLE_API_KEY'))

# Initialize the model
model = genai.GenerativeModel('gemini-2.0-flash-exp')

# Serve static files
@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory(app.static_folder, path)

# ------------------------------------------------------------------------------------
# Optional: Remove or comment out the /process-docs endpoint if it's no longer needed
# ------------------------------------------------------------------------------------
# @app.route('/process-docs', methods=['POST'])
# def process_documents():
#     # No longer needed
#     return jsonify({'message': 'Not used anymore'})

def extract_references(text: str):
    """
    Look for a pattern like:
      [REFERENCES: { "files": ["some_file.pdf", "some_file.txt"] }]
    Return a list of citation objects with shape:
      [{ "id": 1, "source": "some_file.pdf", "page": null, "content": "" }, ... ]
    """
    pattern = r'\[REFERENCES:\s*(\{.*?\})\s*\]'
    match = re.search(pattern, text, re.DOTALL)
    if match:
        try:
            references_str = match.group(1)
            references_data = json.loads(references_str)
            file_names = references_data.get('files', [])
            # Convert file names into an array of citation dicts
            citations = []
            for idx, f in enumerate(file_names, start=1):
                citations.append({
                    'id': idx,
                    'source': f,
                    'page': None,
                    'content': ''
                })
            return citations
        except Exception as e:
            print(f"Error parsing references: {e}")
            return []
    return []

@app.route('/chat', methods=['POST'])
def chat():
    try:
        data = request.json
        user_message = data.get('message')
        print(f"\nUser message: {user_message}")

        if not user_message:
            return jsonify({'error': 'No message provided'}), 400

        # Read all files from the data folder
        context = get_context()

        print("\nFinal context being passed to model:")
        print("=" * 80)
        print(context)
        print("=" * 80)

        def generate():
            """
            Stream the response from the model as server-sent events (SSE).
            We accumulate the text so we can parse out the references JSON block at the end.
            """
            prompt = f"""You are a helpful assistant that provides information based on the given context. Say "I'm sorry I can't help with that" if the answer isn't found in the context. 

            The context is provided with XML-style tags indicating the source file. For example:
            <example.txt>
            This is the content of example.txt
            </example.txt>

            Cite your sources by [1], [2], [3], etc. At the end of your response, include a references section in this exact format:

            References:
            [REFERENCES: {{ "files": ["source1.txt", "source2.pdf"] }}]

            Do not include any other text or formatting in your response besides:
            1. Your answer with citations
            2. The word "References:" on a new line
            3. The [REFERENCES] JSON block
            4. IMPORTANT: Only include files in the references that were actually used in the answer. Cite a source as [1] even if it was the third source you looked at. 

            Context:
            {context}

            User Question:
            {user_message}"""

            response = model.generate_content(prompt, stream=True)

            accumulated_text = ""
            for chunk in response:
                if chunk.text:
                    # Clean up any extra newlines or spaces around the references block
                    text = chunk.text
                    accumulated_text += text
                    data_chunk = json.dumps({'chunk': text})
                    yield f"data: {data_chunk}\n\n"

            # Once the stream ends, parse out the references
            references = extract_references(accumulated_text)
            if references:
                data_citations = json.dumps({'citations': references})
                yield f"data: {data_citations}\n\n"

            # Signal end of SSE
            yield "data: [DONE]\n\n"

        return Response(generate(), mimetype='text/event-stream')

    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
