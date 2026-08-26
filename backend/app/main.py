from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers.entity_types import router as entity_types_router
from app.routers.entities import router as entities_router
from app.routers.entity_images import router as entity_images_router
from app.routers.relationships import router as relationships_router
from fastapi.staticfiles import StaticFiles

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/media", StaticFiles(directory="media"), name="media")
app.include_router(entity_types_router)
app.include_router(entities_router)
app.include_router(entity_images_router)
app.include_router(relationships_router)


