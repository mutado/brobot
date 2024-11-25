
from typing import List
from sqlalchemy import ForeignKey, Integer, String, DECIMAL
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(30), primary_key=True)
    name: Mapped[str] = mapped_column(String(30))
    p_length: Mapped[int] = mapped_column(Integer)
    last_played: Mapped[int] = mapped_column(Integer)
    balance: Mapped[float] = mapped_column(DECIMAL(10, 2))
    social_credit: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[int] = mapped_column(Integer)

    assets: Mapped[List["Asset"]] = relationship(
        back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User(id={self.id}, name={self.name}, p_length={self.p_length}, last_played={self.last_played}, balance={self.balance}, created_at={self.created_at})>"


class Asset(Base):
    __tablename__ = "assets"

    id: Mapped[str] = mapped_column(primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    stock_name: Mapped[str] = mapped_column(String(30))
    amount: Mapped[int] = mapped_column(Integer)
    price_bought_at: Mapped[float] = mapped_column(DECIMAL(10, 2))
    price_sold_at: Mapped[float] = mapped_column(DECIMAL(10, 2))
    sold_at: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[int] = mapped_column(Integer)

    user: Mapped["User"] = relationship("User", back_populates="assets")

    def __repr__(self):
        return f"<Asset(id={self.id}, stock_name={self.stock_name}, amount={self.amount}, price_bought_at={self.price_bought_at}, price_sold_at={self.price_sold_at}, sold_at={self.sold_at}, created_at={self.created_at})>"
