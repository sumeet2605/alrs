# utils/password_hasher.py
import bcrypt #type: ignore

def get_password_hash(password: str) -> str:
    """
    Hashes a password using a secure algorithm (bcrypt).
    Args:
        password: The plain text password.
    Returns:
        The hashed password string.
    """
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies a plain password against a hashed one.
    Args:
        plain_password: The plain text password.
        hashed_password: The hashed password from the database.
    Returns:
        True if the password matches, False otherwise.
    """
    plain_password_bytes = plain_password.encode('utf-8')
    hashed_password_bytes = hashed_password.encode('utf-8')
    return bcrypt.checkpw(plain_password_bytes, hashed_password_bytes)