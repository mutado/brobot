import sqlite3


def getDBConnection():
    return sqlite3.connect('db.sqlite3')
