FROM python:3.11-slim

# NEW: Install system dependency for python-magic
RUN apt-get update && apt-get install -y libmagic1

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8002"]