python3 - <<'PY'
import crypt
print(crypt.crypt('Test123!', crypt.mksalt(crypt.METHOD_BLOWFISH, rounds=2**12)))
PY