# Backend API

## Setup

```bash
cd backend_api
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## Run

```bash
export FLASK_APP=app
flask run --port 5001
```

The API will be available at http://localhost:5001

## Endpoints
- `POST /upload` — Upload a PDF, returns debtor data as JSON
- `POST /download` — Download filtered data as CSV 