import base64
import json

from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

PASSWORD = "your-password-here"
INPUT_PATH = "profile.enc.json"
OUTPUT_PATH = "profile.json"


def _b64decode(value: str) -> bytes:
    return base64.b64decode(value)


def _derive_key(password: str, salt: bytes, iterations: int, length: int = 32) -> bytes:
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=length,
        salt=salt,
        iterations=iterations,
        backend=default_backend(),
    )
    return kdf.derive(password.encode("utf-8"))


def main() -> None:
    with open(INPUT_PATH, "r", encoding="utf-8") as handle:
        payload = json.load(handle)

    salt = _b64decode(payload["salt"])
    iv = _b64decode(payload["iv"])
    ciphertext = _b64decode(payload["ciphertext"])
    iterations = int(payload.get("iterations", 100000))

    key = _derive_key(PASSWORD, salt, iterations)
    plaintext = AESGCM(key).decrypt(iv, ciphertext, None)

    with open(OUTPUT_PATH, "wb") as handle:
        handle.write(plaintext)


if __name__ == "__main__":
    main()
