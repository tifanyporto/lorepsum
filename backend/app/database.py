from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv
import os
from sqlalchemy import create_engine

Base = declarative_base()

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)  # echo=True prints every query to the terminal
SessionLocal = sessionmaker(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

