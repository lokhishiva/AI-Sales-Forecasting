import json
import mimetypes
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse
from urllib import request

ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = 3000


def load_env_file():
    env_path = os.path.join(ROOT, ".env")
    if not os.path.isfile(env_path):
        return

    with open(env_path, "r", encoding="utf-8") as file:
        for line in file:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue

            key, value = line.split("=", 1)
            key = key.strip()
            value = value.strip().strip('"').strip("'")

            os.environ.setdefault(key, value)


load_env_file()

SALES_DATA = {
    "all": [142, 158, 171, 163, 185, 210, 198, 224, 238, 215, 252, 271, 260, 285, 305, 298, 320, 341],
    "software": [62, 70, 77, 73, 85, 98, 91, 104, 110, 98, 118, 127, 120, 134, 145, 141, 152, 163],
    "hardware": [48, 52, 57, 54, 60, 68, 64, 72, 78, 70, 82, 88, 84, 92, 100, 97, 104, 110],
    "services": [32, 36, 37, 36, 40, 44, 43, 48, 50, 47, 52, 56, 56, 59, 60, 60, 64, 68],
}


def get_category_summary(category: str):
    data = SALES_DATA.get(category, SALES_DATA["all"])
    latest = data[-1]
    previous = data[-2] if len(data) > 1 else latest
    total = sum(data)
    average = total / len(data)
    growth = ((latest - previous) / previous) * 100 if previous else 0

    return {
        "latest": latest,
        "previous": previous,
        "average": round(average, 1),
        "total": round(total, 0),
        "growth": round(growth, 1),
    }


def build_assistant_prompt(prompt: str, category: str):
    summary = get_category_summary(category)
    label = "all product categories" if category == "all" else category
    return (
        f"You are SalesCast AI, an expert sales forecasting assistant. "
        f"The selected category is {label}. "
        f"Current sales snapshot: latest value {summary['latest']}K, previous value {summary['previous']}K, "
        f"growth {summary['growth']}%, average {summary['average']}K. "
        f"The user asks: {prompt or 'Give me an action plan for growth.'} "
        "Respond in concise business language. Include 3 short recommendations and a final action plan."
    )


def build_assistant_reply(prompt: str, category: str):
    normalized_prompt = (prompt or "").lower()
    label = "all product categories" if category == "all" else category
    summary = get_category_summary(category)

    if "hardware" in normalized_prompt:
        focus = "hardware conversion and inventory pacing"
    elif "software" in normalized_prompt:
        focus = "software adoption and renewals"
    elif "service" in normalized_prompt:
        focus = "service capacity and support demand"
    elif "season" in normalized_prompt:
        focus = "seasonality optimization"
    elif "forecast" in normalized_prompt:
        focus = "forecast accuracy and planning"
    else:
        focus = "overall sales momentum"

    if category == "hardware":
        recommendation = "Increase field sales outreach and bundle maintenance plans to lift slower hardware growth."
    elif category == "software":
        recommendation = "Push upsell and expansion campaigns to capitalize on the strongest recurring demand."
    elif category == "services":
        recommendation = "Align support staffing and service bundles with the steadily rising demand trend."
    else:
        recommendation = "Balance investment across all categories while favoring the strongest growth channels."

    text = (
        f"Based on the {label} outlook, the latest period is tracking at ${summary['latest']}K, "
        f"with a {summary['growth']}% change versus the prior month. The moving average is ${summary['average']}K "
        f"and your current model suggests the strongest opportunity is in {focus}. {recommendation}"
    )

    return {
        "category": category,
        "summary": summary,
        "reply": f"AI Assistant: {text}",
        "recommendation": recommendation,
        "focus": focus,
        "mode": "fallback"
    }


def call_openai_llm(prompt: str, category: str):
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return None

    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1/chat/completions")

    payload = {
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": "You are SalesCast AI, a sales forecasting strategist. Return concise, practical recommendations for business stakeholders."
            },
            {
                "role": "user",
                "content": build_assistant_prompt(prompt, category)
            }
        ],
        "temperature": 0.7
    }

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }

    req = request.Request(base_url, data=json.dumps(payload).encode("utf-8"), headers=headers, method="POST")

    try:
        with request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data["choices"][0]["message"]["content"].strip()
    except Exception:
        return None


def call_gemini_llm(prompt: str, category: str):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return None

    model = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    payload = {
        "contents": [{
            "parts": [{"text": build_assistant_prompt(prompt, category)}]
        }]
    }

    req = request.Request(url, data=json.dumps(payload).encode("utf-8"), headers={"Content-Type": "application/json"}, method="POST")

    try:
        with request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data["candidates"][0]["content"]["parts"][0]["text"].strip()
    except Exception:
        return None


def get_ai_assistant_reply(prompt: str, category: str):
    for provider in (call_gemini_llm, call_openai_llm):
        try:
            response = provider(prompt, category)
            if response:
                return {
                    "category": category,
                    "summary": get_category_summary(category),
                    "reply": response,
                    "recommendation": response.split(". ")[0] if response else "AI recommendation generated.",
                    "focus": "live LLM strategy",
                    "mode": "llm"
                }
        except Exception:
            continue

    return build_assistant_reply(prompt, category)


class SalesCastHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/health":
            self._send_json(200, {"status": "ok", "message": "SalesCast AI backend is running."})
            return

        if parsed.path in ("/", ""):
            self._serve_file(os.path.join(ROOT, "index.html"))
            return

        file_path = os.path.join(ROOT, parsed.path.lstrip("/"))
        if os.path.isfile(file_path):
            self._serve_file(file_path)
            return

        self.send_error(404, "Not Found")

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path != "/api/assistant":
            self.send_error(404, "Not Found")
            return

        try:
            content_length = int(self.headers.get("Content-Length", "0"))
            raw = self.rfile.read(content_length) if content_length > 0 else b"{}"
            body = json.loads(raw.decode("utf-8")) if raw else {}
        except Exception:
            self._send_json(400, {"error": "Invalid JSON request body"})
            return

        prompt = str(body.get("prompt", ""))
        category = str(body.get("category", "all"))
        result = get_ai_assistant_reply(prompt, category)
        self._send_json(200, result)

    def _send_json(self, status_code: int, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _serve_file(self, file_path: str):
        if not os.path.isfile(file_path):
            self.send_error(404, "Not Found")
            return

        mime_type, _ = mimetypes.guess_type(file_path)
        if mime_type is None:
            mime_type = "application/octet-stream"

        with open(file_path, "rb") as file:
            body = file.read()

        self.send_response(200)
        self.send_header("Content-Type", mime_type + "; charset=utf-8" if mime_type.startswith("text/") else mime_type)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):
        return


if __name__ == "__main__":
    server = ThreadingHTTPServer(("0.0.0.0", PORT), SalesCastHandler)
    print(f"SalesCast AI backend running at http://localhost:{PORT}")
    print("OpenAI/Gemini keys from environment or .env will be used automatically.")
    server.serve_forever()
