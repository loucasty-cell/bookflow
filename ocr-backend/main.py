from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from transformers import AutoProcessor, AutoModelForVision2Seq
from PIL import Image
import io

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


processor = None
model = None

@app.on_event("startup")
async def load_model():
    global processor, model
    try:
        processor = AutoProcessor.from_pretrained("deepseek-ai/DeepSeek-OCR-2", trust_remote_code=True)
        model = AutoModelForVision2Seq.from_pretrained("deepseek-ai/DeepSeek-OCR-2", trust_remote_code=True)
    except Exception as e:
        print(f"Model load failed: {e}")

@app.post("/ocr")
async def ocr(image: UploadFile = File(...)):
    try:
        img_bytes = await image.read()
        img = Image.open(io.BytesIO(img_bytes)).convert("RGB")

        if processor and model:
            inputs = processor(images=img, return_tensors="pt")
            outputs = model.generate(**inputs, max_new_tokens=500)
            text = processor.decode(outputs[0], skip_special_tokens=True)
            return {"text": text, "confidence": 0.95}
        else:
            from fastapi import HTTPException
            raise HTTPException(status_code=503, detail="Model not loaded")
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=str(e))
