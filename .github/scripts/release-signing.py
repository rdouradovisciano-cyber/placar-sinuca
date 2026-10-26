#!/usr/bin/env python3
"""
Liga a assinatura de release no android/app/build.gradle gerado pelo Capacitor.

Usa as variáveis de ambiente KEYSTORE_PASS, KEY_ALIAS e KEY_PASS (lidas pelo
Gradle em tempo de build). O arquivo da chave é android/app/release.keystore.

Sai com código != 0 se não conseguir aplicar o patch, para o workflow cair na
assinatura debug em vez de quebrar.
"""
import re
import sys

CAMINHO = "android/app/build.gradle"

try:
    with open(CAMINHO, encoding="utf-8") as f:
        src = f.read()
except OSError as e:
    print(f"não achei {CAMINHO}: {e}")
    sys.exit(1)

if "release.keystore" in src:
    print("assinatura release já configurada")
    sys.exit(0)

bloco_assinatura = """    signingConfigs {
        release {
            storeFile file("release.keystore")
            storePassword System.getenv("KEYSTORE_PASS")
            keyAlias System.getenv("KEY_ALIAS")
            keyPassword System.getenv("KEY_PASS")
        }
    }

"""

m = re.search(r"buildTypes\s*\{", src)
if not m:
    print("buildTypes não encontrado em build.gradle")
    sys.exit(1)
src = src[:m.start()] + bloco_assinatura + src[m.start():]

# depois de inserir o bloco, o buildTypes mudou de posição: procurar de novo
m = re.search(r"buildTypes\s*\{", src)
if not m:
    print("buildTypes sumiu depois do patch")
    sys.exit(1)
resto = src[m.end():]
rel = re.search(r"release\s*\{", resto)
if not rel:
    print("buildType release não encontrado")
    sys.exit(1)
pos = m.end() + rel.end()
src = src[:pos] + "\n            signingConfig signingConfigs.release" + src[pos:]

with open(CAMINHO, "w", encoding="utf-8") as f:
    f.write(src)

print("assinatura release configurada")
