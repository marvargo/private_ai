import os
import time
import uuid
from typing import List, Optional

from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

MODEL_ID = os.getenv("MODEL_ID", "TinyLlama/TinyLlama-1.1B-Chat-v1.0")
SERVED_MODEL_NAME = os.getenv("SERVED_MODEL_NAME", "wyndme-small-test-real")

app = FastAPI(title="WyndMe Small Test Real Runtime")

_model = None
_tokenizer = None
_model_load_error: Optional[str] = None
_model_loaded_at: Optional[float] = None


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatCompletionRequest(BaseModel):
    model: Optional[str] = None
    messages: List[ChatMessage]
    temperature: Optional[float] = 0.2
    max_tokens: Optional[int] = 128
    stream: Optional[bool] = False


def load_model():
    global _model, _tokenizer, _model_load_error, _model_loaded_at

    if _model is not None and _tokenizer is not None:
        return

    try:
        from transformers import AutoModelForCausalLM, AutoTokenizer
        import torch

        _tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
        _model = AutoModelForCausalLM.from_pretrained(
            MODEL_ID,
            torch_dtype=torch.float32,
            device_map="cpu",
        )
        _model_loaded_at = time.time()
        _model_load_error = None
    except Exception as exc:
        _model_load_error = str(exc)
        raise


@app.on_event("startup")
def startup_event():
    try:
        load_model()
        print(f"Model loaded: {MODEL_ID}", flush=True)
    except Exception as exc:
        print(f"Model load failed: {exc}", flush=True)


@app.get("/")
def root():
    return {
        "ok": _model is not None,
        "service": "wyndme-small-test-real",
        "model": MODEL_ID,
        "served_model": SERVED_MODEL_NAME,
        "model_loaded": _model is not None,
        "model_load_error": _model_load_error,
    }


@app.get("/health")
def health():
    return {
        "ok": _model is not None and _tokenizer is not None,
        "service": "wyndme-small-test-real",
        "model": MODEL_ID,
        "served_model": SERVED_MODEL_NAME,
        "model_loaded_at": _model_loaded_at,
        "model_load_error": _model_load_error,
    }


@app.get("/v1/models")
def models():
    if _model is None or _tokenizer is None:
        return {
            "object": "list",
            "data": [],
            "error": _model_load_error or "model_not_loaded",
        }

    return {
        "object": "list",
        "data": [
            {
                "id": SERVED_MODEL_NAME,
                "object": "model",
                "created": int(_model_loaded_at or time.time()),
                "owned_by": "wyndme",
                "root": MODEL_ID,
            }
        ],
    }


def build_prompt(messages: List[ChatMessage]) -> str:
    text = ""
    for message in messages:
        role = message.role.strip()
        content = message.content.strip()
        if not content:
            continue
        text += f"{role}: {content}\n"
    text += "assistant:"
    return text


def generate_text(request: ChatCompletionRequest) -> str:
    if _model is None or _tokenizer is None:
        raise RuntimeError(_model_load_error or "model_not_loaded")

    prompt = build_prompt(request.messages)
    max_new_tokens = max(8, min(int(request.max_tokens or 128), 256))

    inputs = _tokenizer(prompt, return_tensors="pt")
    output_ids = _model.generate(
        **inputs,
        max_new_tokens=max_new_tokens,
        do_sample=(request.temperature or 0) > 0,
        temperature=max(float(request.temperature or 0.2), 0.01),
        pad_token_id=_tokenizer.eos_token_id,
    )

    decoded = _tokenizer.decode(output_ids[0], skip_special_tokens=True)
    if "assistant:" in decoded:
        answer = decoded.split("assistant:", 1)[-1].strip()
    else:
        answer = decoded[len(prompt):].strip()

    if not answer:
        answer = "private model runtime ok"

    return answer


@app.post("/v1/chat/completions")
def chat_completions(request: ChatCompletionRequest):
    answer = generate_text(request)
    completion_id = f"chatcmpl-{uuid.uuid4().hex}"

    if request.stream:
        safe_answer = answer.replace('"', "'").replace("\n", " ")
        def event_stream():
            yield f"data: {{\"id\":\"{completion_id}\",\"object\":\"chat.completion.chunk\",\"choices\":[{{\"delta\":{{\"content\":\"{safe_answer}\"}},\"index\":0,\"finish_reason\":null}}]}}\n\n"
            yield "data: [DONE]\n\n"

        return StreamingResponse(event_stream(), media_type="text/event-stream")

    return {
        "id": completion_id,
        "object": "chat.completion",
        "created": int(time.time()),
        "model": request.model or SERVED_MODEL_NAME,
        "choices": [
            {
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": answer,
                },
                "finish_reason": "stop",
            }
        ],
        "usage": {
            "prompt_tokens": 0,
            "completion_tokens": 0,
            "total_tokens": 0,
        },
    }
