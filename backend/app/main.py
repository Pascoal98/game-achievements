from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import games

app = FastAPI(title="Achievement Tracker")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(games.router)