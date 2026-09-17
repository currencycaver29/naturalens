#!/usr/bin/env python3
"""Fine-tune a mobile one-class polar-bear detector on the COCO pack.

Uses torchvision SSDLite320 MobileNetV3-Large (Apache/BSD via torchvision).
MediaPipe EfficientDet-Lite Model Maker needs TensorFlow <2.16, which has no
Python 3.12 wheels — this is the planned mobile fallback on Apple MPS.

    models/.venv/bin/python models/training/prepare_coco.py
    models/.venv/bin/python models/training/train_polar_bear.py
    models/.venv/bin/python models/training/train_polar_bear.py --epochs 40

Writes:

  models/weights/polar_bear_ssdlite.pt
  models/weights/polar_bear_ssdlite.onnx
  models/weights/polar_bear_edlite0.tflite   (float16 when conversion works)
"""

from __future__ import annotations

import argparse
import json
import random
import sys
import time
from pathlib import Path

import numpy as np
import torch
import torchvision
from PIL import Image, ImageOps
from torch.utils.data import DataLoader, Dataset
from torchvision.models.detection import (
    SSDLite320_MobileNet_V3_Large_Weights,
    ssdlite320_mobilenet_v3_large,
)
from torchvision.transforms import functional as F

REPO = Path(__file__).resolve().parents[2]
COCO_ROOT = REPO / "models" / "data" / "coco"
WEIGHTS = REPO / "models" / "weights"
NUM_CLASSES = 2  # background + polar_bear


def pick_device() -> torch.device:
    if torch.backends.mps.is_available():
        return torch.device("mps")
    if torch.cuda.is_available():
        return torch.device("cuda")
    return torch.device("cpu")


class PolarCoco(Dataset):
    def __init__(self, split: str, augment: bool = False):
        self.root = COCO_ROOT / split
        self.img_dir = self.root / "images"
        ann_path = self.root / "_annotations.coco.json"
        if not ann_path.is_file():
            raise SystemExit(f"Missing {ann_path}. Run prepare_coco.py first.")
        data = json.loads(ann_path.read_text())
        self.images = {im["id"]: im for im in data["images"]}
        self.ids = sorted(self.images)
        self.anns: dict[int, list] = {i: [] for i in self.ids}
        for ann in data["annotations"]:
            self.anns[ann["image_id"]].append(ann)
        self.augment = augment

    def __len__(self) -> int:
        return len(self.ids)

    def __getitem__(self, index: int):
        image_id = self.ids[index]
        info = self.images[image_id]
        path = self.img_dir / info["file_name"]
        with ImageOps.exif_transpose(Image.open(path)) as im:
            image = im.convert("RGB")

        boxes = []
        labels = []
        for ann in self.anns[image_id]:
            x, y, w, h = ann["bbox"]
            boxes.append([x, y, x + w, y + h])
            labels.append(1)

        if self.augment:
            image, boxes = _augment(image, boxes)

        width, height = image.size
        if boxes:
            boxes_t = torch.tensor(boxes, dtype=torch.float32)
            boxes_t[:, 0::2] = boxes_t[:, 0::2].clamp(0, width)
            boxes_t[:, 1::2] = boxes_t[:, 1::2].clamp(0, height)
            keep = (boxes_t[:, 2] > boxes_t[:, 0] + 1) & (boxes_t[:, 3] > boxes_t[:, 1] + 1)
            boxes_t = boxes_t[keep]
            labels_t = torch.tensor(labels, dtype=torch.int64)[keep]
        else:
            boxes_t = torch.zeros((0, 4), dtype=torch.float32)
            labels_t = torch.zeros((0,), dtype=torch.int64)

        tensor = F.to_tensor(image)
        target = {
            "boxes": boxes_t,
            "labels": labels_t,
            "image_id": torch.tensor([image_id]),
            "area": (boxes_t[:, 2] - boxes_t[:, 0]) * (boxes_t[:, 3] - boxes_t[:, 1])
            if len(boxes_t)
            else torch.zeros((0,)),
            "iscrowd": torch.zeros((len(boxes_t),), dtype=torch.int64),
        }
        return tensor, target


def _augment(image: Image.Image, boxes: list[list[float]]):
    width, height = image.size
    if random.random() < 0.5:
        image = F.hflip(image)
        flipped = []
        for x1, y1, x2, y2 in boxes:
            flipped.append([width - x2, y1, width - x1, y2])
        boxes = flipped

    if random.random() < 0.5 and boxes:
        scale = random.uniform(0.7, 1.0)
        new_w, new_h = int(width * scale), int(height * scale)
        image = image.resize((new_w, new_h), Image.BILINEAR)
        left = random.randint(0, width - new_w) if new_w < width else 0
        top = random.randint(0, height - new_h) if new_h < height else 0
        canvas = Image.new("RGB", (width, height), (0, 0, 0))
        canvas.paste(image, (left, top))
        image = canvas
        scaled = []
        for x1, y1, x2, y2 in boxes:
            scaled.append(
                [
                    x1 * scale + left,
                    y1 * scale + top,
                    x2 * scale + left,
                    y2 * scale + top,
                ]
            )
        boxes = scaled

    if random.random() < 0.4:
        image = F.adjust_brightness(image, random.uniform(0.7, 1.3))
        image = F.adjust_contrast(image, random.uniform(0.7, 1.3))
    return image, boxes


def collate(batch):
    return tuple(zip(*batch))


def build_model(pretrained: bool = True):
    # Always use the SSDLite reduced MobileNet (weights_backbone=None). ImageNet
    # MobileNet weights change channel widths and break export/reload.
    model = ssdlite320_mobilenet_v3_large(weights_backbone=None, num_classes=NUM_CLASSES)
    if pretrained:
        coco = ssdlite320_mobilenet_v3_large(
            weights=SSDLite320_MobileNet_V3_Large_Weights.DEFAULT
        )
        src, dst = coco.state_dict(), model.state_dict()
        copied = 0
        for key, value in src.items():
            if key in dst and dst[key].shape == value.shape:
                dst[key] = value
                copied += 1
        model.load_state_dict(dst)
        print(f"  transferred {copied} tensors from COCO SSDLite", flush=True)
    return model


def train_one_epoch(model, loader, optimizer, device, epoch: int):
    model.train()
    total = 0.0
    n = 0
    for images, targets in loader:
        images = [img.to(device) for img in images]
        targets = [{k: v.to(device) for k, v in t.items()} for t in targets]
        # Skip empty-target batches — SSD loss is unstable with zero boxes.
        if any(t["boxes"].numel() == 0 for t in targets):
            continue
        loss_dict = model(images, targets)
        loss = sum(loss_dict.values())
        if not torch.isfinite(loss):
            continue
        optimizer.zero_grad(set_to_none=True)
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 10.0)
        optimizer.step()
        total += float(loss.detach().cpu())
        n += 1
    avg = total / max(1, n)
    print(f"  epoch {epoch}: train loss {avg:.4f}  ({n} steps)", flush=True)
    return avg


@torch.inference_mode()
def predict_dataset(model, dataset: PolarCoco, device, score_thresh: float = 0.2):
    model.eval()
    results = []
    for i in range(len(dataset)):
        image, target = dataset[i]
        out = model([image.to(device)])[0]
        keep = out["scores"] >= score_thresh
        results.append(
            {
                "image_id": int(target["image_id"].item()),
                "file_name": dataset.images[int(target["image_id"].item())]["file_name"],
                "gt_boxes": target["boxes"].tolist(),
                "boxes": out["boxes"][keep].cpu().tolist(),
                "scores": out["scores"][keep].cpu().tolist(),
            }
        )
    return results


def box_iou(a: list[float], b: list[float]) -> float:
    ax1, ay1, ax2, ay2 = a
    bx1, by1, bx2, by2 = b
    ix1, iy1 = max(ax1, bx1), max(ay1, by1)
    ix2, iy2 = min(ax2, bx2), min(ay2, by2)
    inter = max(0.0, ix2 - ix1) * max(0.0, iy2 - iy1)
    area_a = max(0.0, ax2 - ax1) * max(0.0, ay2 - ay1)
    area_b = max(0.0, bx2 - bx1) * max(0.0, by2 - by1)
    union = area_a + area_b - inter
    return inter / union if union > 0 else 0.0


def evaluate_map(preds, iou_thresh: float = 0.5, score_thresh: float = 0.3):
    """Greedy one-class mAP@iou and precision/recall at a fixed score."""
    scores = []
    matches = []
    n_gt = 0
    per_image = []

    for item in preds:
        gt = item["gt_boxes"]
        n_gt += len(gt)
        pairs = [
            (float(s), box)
            for s, box in zip(item["scores"], item["boxes"])
            if s >= score_thresh
        ]
        pairs.sort(reverse=True)
        used = set()
        tp = fp = 0
        for score, box in pairs:
            best_i, best_iou = -1, 0.0
            for i, g in enumerate(gt):
                if i in used:
                    continue
                iou = box_iou(box, g)
                if iou > best_iou:
                    best_iou, best_i = iou, i
            hit = best_i >= 0 and best_iou >= iou_thresh
            scores.append(score)
            matches.append(1 if hit else 0)
            if hit:
                used.add(best_i)
                tp += 1
            else:
                fp += 1
        fn = len(gt) - len(used)
        per_image.append(
            {
                "file": item["file_name"],
                "n_gt": len(gt),
                "n_pred": len(pairs),
                "tp": tp,
                "fp": fp,
                "fn": fn,
                "false_positives": fp,
                "false_negatives": fn,
                # Box geometry for the labeler Runs overlay (pixel xyxy).
                # `gt` / `preds` are arrays of boxes — not counts.
                "gt": [{"xyxy": [float(v) for v in box]} for box in gt],
                "preds": [
                    {"xyxy": [float(v) for v in box], "score": float(score)}
                    for score, box in pairs
                ],
            }
        )

    if not scores:
        return {
            "map50": 0.0,
            "precision": 0.0,
            "recall": 0.0,
            "n_gt": n_gt,
            "n_pred": 0,
            "per_image": per_image,
        }

    order = np.argsort(-np.asarray(scores))
    matches_a = np.asarray(matches)[order]
    tp_c = np.cumsum(matches_a)
    fp_c = np.cumsum(1 - matches_a)
    recalls = tp_c / max(1, n_gt)
    precisions = tp_c / np.maximum(tp_c + fp_c, 1e-9)

    # 11-point VOC-style AP.
    ap = 0.0
    for t in np.linspace(0, 1, 11):
        p = precisions[recalls >= t]
        ap += float(p.max()) / 11 if len(p) else 0.0

    precision = float(tp_c[-1] / max(1, tp_c[-1] + fp_c[-1]))
    recall = float(tp_c[-1] / max(1, n_gt))
    return {
        "map50": ap,
        "precision": precision,
        "recall": recall,
        "n_gt": n_gt,
        "n_pred": int(len(scores)),
        "per_image": per_image,
    }


def export_onnx(model, path: Path, device: torch.device):
    model.eval()
    cpu_model = build_model(pretrained=False)
    cpu_model.load_state_dict(model.state_dict())
    cpu_model.eval()
    cpu_model.to("cpu")

    class Wrapper(torch.nn.Module):
        def __init__(self, m):
            super().__init__()
            self.m = m

        def forward(self, x):
            # SSD expects a list; wrap a single CHW float tensor in [0,1].
            out = self.m([x])[0]
            return out["boxes"], out["scores"], out["labels"]

    wrapped = Wrapper(cpu_model)
    dummy = torch.rand(3, 320, 320)
    path.parent.mkdir(parents=True, exist_ok=True)
    torch.onnx.export(
        wrapped,
        dummy,
        str(path),
        input_names=["image"],
        output_names=["boxes", "scores", "labels"],
        dynamic_axes={
            "boxes": {0: "n"},
            "scores": {0: "n"},
            "labels": {0: "n"},
        },
        opset_version=17,
        dynamo=False,
    )
    print(f"  wrote {path}", flush=True)


def export_tflite(onnx_path: Path, tflite_path: Path) -> bool:
    """Best-effort ONNX → TFLite float16 via onnx2tf (often in models/.venv-train)."""
    import shutil
    import subprocess

    out_dir = tflite_path.parent / "tflite_saved_model"
    out_dir.mkdir(parents=True, exist_ok=True)

    candidates = []
    which = shutil.which("onnx2tf")
    if which:
        candidates.append([which])
    train_onnx2tf = REPO / "models" / ".venv-train" / "bin" / "onnx2tf"
    if train_onnx2tf.is_file():
        candidates.append([str(train_onnx2tf)])
    candidates.append([sys.executable, "-m", "onnx2tf"])

    last_err = ""
    for cmd_base in candidates:
        cmd = cmd_base + ["-i", str(onnx_path), "-o", str(out_dir), "-b", "1"]
        proc = subprocess.run(cmd, capture_output=True, text=True)
        if proc.returncode != 0:
            last_err = (proc.stderr or proc.stdout or "")[-800:]
            continue
        produced = list(out_dir.rglob("*float16*.tflite")) or list(out_dir.rglob("*.tflite"))
        if not produced:
            last_err = "onnx2tf produced no .tflite"
            continue
        pick = sorted(produced, key=lambda p: ("float16" not in p.name, p.stat().st_size))[0]
        tflite_path.write_bytes(pick.read_bytes())
        print(f"  wrote {tflite_path} (from {pick.name})", flush=True)
        return True

    sidecar = tflite_path.with_suffix(".export.json")
    sidecar.write_text(
        json.dumps(
            {
                "status": "tflite_pending",
                "onnx": str(onnx_path.name),
                "note": "Install onnx2tf (models/.venv-train) to finish TFLite conversion.",
                "error": last_err[-400:],
            },
            indent=2,
        )
        + "\n"
    )
    print(f"  TFLite conversion failed; wrote {sidecar}", flush=True)
    return False


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--epochs", type=int, default=30)
    parser.add_argument("--batch-size", type=int, default=4)
    parser.add_argument("--lr", type=float, default=1e-3)
    parser.add_argument("--workers", type=int, default=0)
    parser.add_argument("--seed", type=int, default=13)
    parser.add_argument("--skip-export", action="store_true")
    args = parser.parse_args()

    random.seed(args.seed)
    np.random.seed(args.seed)
    torch.manual_seed(args.seed)

    device = pick_device()
    print(f"Device: {device}", flush=True)

    train_ds = PolarCoco("train", augment=True)
    val_ds = PolarCoco("val", augment=False)
    train_loader = DataLoader(
        train_ds,
        batch_size=args.batch_size,
        shuffle=True,
        num_workers=args.workers,
        collate_fn=collate,
    )
    print(f"Train {len(train_ds)}  Val {len(val_ds)}", flush=True)

    model = build_model(pretrained=True).to(device)
    params = [p for p in model.parameters() if p.requires_grad]
    optimizer = torch.optim.AdamW(params, lr=args.lr, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=args.epochs)

    WEIGHTS.mkdir(parents=True, exist_ok=True)
    best_map = -1.0
    best_path = WEIGHTS / "polar_bear_ssdlite.pt"
    history = []

    t0 = time.time()
    for epoch in range(1, args.epochs + 1):
        loss = train_one_epoch(model, train_loader, optimizer, device, epoch)
        scheduler.step()
        preds = predict_dataset(model, val_ds, device, score_thresh=0.15)
        metrics = evaluate_map(preds, iou_thresh=0.5, score_thresh=0.3)
        history.append({"epoch": epoch, "loss": loss, "map50": metrics["map50"]})
        print(
            f"  epoch {epoch}: val mAP@0.5={metrics['map50']:.3f}  "
            f"P={metrics['precision']:.3f}  R={metrics['recall']:.3f}",
            flush=True,
        )
        if metrics["map50"] >= best_map:
            best_map = metrics["map50"]
            torch.save(
                {
                    "model": model.state_dict(),
                    "epoch": epoch,
                    "map50": best_map,
                    "num_classes": NUM_CLASSES,
                    "arch": "ssdlite320_mobilenet_v3_large",
                },
                best_path,
            )
            print(f"  saved best → {best_path}", flush=True)

    # Reload best for final eval + export
    ckpt = torch.load(best_path, map_location="cpu", weights_only=False)
    model.load_state_dict(ckpt["model"])
    model.to(device)
    preds = predict_dataset(model, val_ds, device, score_thresh=0.15)
    metrics = evaluate_map(preds, iou_thresh=0.5, score_thresh=0.3)
    metrics["arch"] = "ssdlite320_mobilenet_v3_large"
    metrics["epochs"] = args.epochs
    metrics["best_epoch"] = ckpt.get("epoch")
    metrics["device"] = str(device)
    metrics["train_seconds"] = round(time.time() - t0, 1)
    metrics["history"] = history
    # Highlight huddle-ish val shots from the plan
    focus = {"IMG_0223.JPG", "IMG_0226.JPG", "IMG_0263.JPG"}
    metrics["huddle_focus"] = [r for r in metrics["per_image"] if r["file"] in focus]

    results_dir = REPO / "models" / "evaluation" / "results"
    results_dir.mkdir(parents=True, exist_ok=True)
    results_path = results_dir / "polar_bear.json"
    results_path.write_text(json.dumps(metrics, indent=2) + "\n")
    print(f"\nVal mAP@0.5={metrics['map50']:.3f}  → {results_path}", flush=True)

    if not args.skip_export:
        onnx_path = WEIGHTS / "polar_bear_ssdlite.onnx"
        try:
            export_onnx(model, onnx_path, device)
        except Exception as exc:
            print(f"  ONNX export failed: {exc}", flush=True)
        tflite_path = WEIGHTS / "polar_bear_edlite0.tflite"
        if onnx_path.is_file():
            export_tflite(onnx_path, tflite_path)

    print("Done.", flush=True)


if __name__ == "__main__":
    main()
