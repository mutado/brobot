

from sqlalchemy import create_engine

from models.user import Base


engine = create_engine('sqlite:///db.sqlite3')
Base.metadata.create_all(engine)