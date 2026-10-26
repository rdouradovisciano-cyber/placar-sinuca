#!/usr/bin/env python3
"""
Configura as chaves de assinatura no android/app/build.gradle gerado pelo Capacitor.

- debug: usa android/app/debug.keystore (chave fixa do repositório). Sem isso o
  Gradle cria uma chave nova a cada build e a versão nova só instala depois de
  desinstalar a anterior (perdendo os dados salvos no aparelho).
- release: usa android/app/release.keystore, com as senhas lidas do ambiente
  (KEYSTORE_PASS, KEY_ALIAS, KEY_PASS).

É idempotente: rodar duas vezes não duplica nada. Sai com código != 0 se não
conseguir aplicar o patch, para o workflow cair na assinatura de debug.
"""
import os
import re
import sys

CAMINHO = "android/app/build.gradle"
DEBUG = "android/app/debug.keystore"
RELEASE = "android/app/release.keystore"

BLOCO_DEBUG = """        debug {
            storeFile file("debug.keystore")
            storePassword "android"
            keyAlias "androiddebugkey"
            keyPassword "android"
        }"""

BLOCO_RELEASE = """        release {
            storeFile file("release.keystore")
            storePassword System.getenv("KEYSTORE_PASS")
            keyAlias System.getenv("KEY_ALIAS")
            keyPassword System.getenv("KEY_PASS")
        }"""


def main():
    try:
        with open(CAMINHO, encoding="utf-8") as f:
            src = f.read()
    except OSError as e:
        print(f"não achei {CAMINHO}: {e}")
        return 1

    blocos = []
    if os.path.exists(DEBUG) and 'file("debug.keystore")' not in src:
        blocos.append(BLOCO_DEBUG)
    if os.path.exists(RELEASE) and 'file("release.keystore")' not in src:
        blocos.append(BLOCO_RELEASE)

    if blocos:
        m = re.search(r"^([ \t]*)buildTypes\s*\{", src, re.M)
        if not m:
            print("buildTypes não encontrado em build.gradle")
            return 1
        indent = m.group(1)
        bloco = indent + "signingConfigs {\n" + "\n".join(blocos) + "\n" + indent + "}\n\n"
        src = src[: m.start()] + bloco + src[m.start():]

    # release precisa apontar para a signingConfig; debug já usa a sua por padrão
    if 'file("release.keystore")' in src and "signingConfigs.release" not in src:
        m = re.search(r"buildTypes\s*\{", src)
        if not m:
            print("buildTypes sumiu depois do patch")
            return 1
        resto = src[m.end():]
        rel = re.search(r"release\s*\{", resto)
        if not rel:
            print("buildType release não encontrado")
            return 1
        pos = m.end() + rel.end()
        src = src[:pos] + "\n            signingConfig signingConfigs.release" + src[pos:]

    with open(CAMINHO, "w", encoding="utf-8") as f:
        f.write(src)

    if blocos:
        print("assinatura configurada:", ", ".join(b.split()[0] for b in blocos))
    else:
        print("assinatura já estava configurada")
    return 0


if __name__ == "__main__":
    sys.exit(main())
