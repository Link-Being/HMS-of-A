#!/usr/bin/env bash
# Jednorazowa instalacja środowiska treningowego na serwerze (Ubuntu 24.04, RTX 5080).
set -euo pipefail
cd "$(dirname "$0")"

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq python3-venv python3-dev ffmpeg libgl1 libglib2.0-0 unzip tmux >/dev/null

[ -d .venv ] || python3 -m venv .venv
.venv/bin/pip install -q --upgrade pip
# Blackwell (sm_120) wymaga PyTorch zbudowanego z CUDA >= 12.8
.venv/bin/pip install -q torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu128
.venv/bin/pip install -q -r requirements.txt
# mediapipe może dociągnąć opencv z GUI; na serwerze zostawiamy wersję headless
.venv/bin/pip uninstall -y -q opencv-python opencv-contrib-python 2>/dev/null || true
.venv/bin/pip install -q --force-reinstall --no-deps opencv-python-headless

.venv/bin/python - <<'EOF'
import torch, torchvision, mediapipe, onnxruntime, cv2, transformers
print("torch", torch.__version__, "| CUDA", torch.version.cuda, "| GPU:", torch.cuda.get_device_name(0))
x = torch.randn(2048, 2048, device="cuda"); print("test GPU matmul OK:", float((x @ x).sum()) != 0)
print("mediapipe", mediapipe.__version__, "| onnxruntime", onnxruntime.__version__, "| cv2", cv2.__version__, "| transformers", transformers.__version__)
EOF
echo "SRODOWISKO_OK"
