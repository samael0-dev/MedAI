"""Chest X-ray DenseNet-121 Training Pipeline.

Provides PyTorch Dataset, training and validation loop, early stopping,
checkpoint saving, and CLI arguments for pulmonary screening models.
"""

import argparse
import copy
import logging
import os
import sys
from pathlib import Path
from typing import List, Optional, Tuple
import numpy as np
from PIL import Image
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, Dataset
from torchvision import transforms

# Add backend directory to sys.path if run directly
current_dir = Path(__file__).resolve().parent
backend_dir = current_dir.parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from ml.chest_xray import DenseNet121Classifier, XRAY_CLASSES

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("train_xray")


class ChestXRayDataset(Dataset):
    """Custom Dataset for Chest X-ray images organized in class subfolders or generated on-the-fly."""

    def __init__(
        self,
        root_dir: str,
        classes: List[str] = XRAY_CLASSES,
        transform: Optional[transforms.Compose] = None,
        is_synthetic: bool = False,
        synthetic_size: int = 100,
    ):
        self.root_dir = Path(root_dir)
        self.classes = classes
        self.class_to_idx = {cls: idx for idx, cls in enumerate(classes)}
        self.transform = transform
        self.samples: List[Tuple[Union[Path, str], int]] = []

        if is_synthetic or not self.root_dir.exists():
            logger.info("Using synthetic dataset with %d samples for training pipeline verification.", synthetic_size)
            self.is_synthetic = True
            self.synthetic_size = synthetic_size
        else:
            self.is_synthetic = False
            for cls_name in self.classes:
                cls_folder = self.root_dir / cls_name
                if cls_folder.is_dir():
                    for ext in ("*.png", "*.jpg", "*.jpeg", "*.dcm"):
                        for f in cls_folder.glob(ext):
                            self.samples.append((f, self.class_to_idx[cls_name]))

            if not self.samples:
                logger.warning("No image files found in %s. Falling back to synthetic samples.", root_dir)
                self.is_synthetic = True
                self.synthetic_size = synthetic_size

    def __len__(self) -> int:
        return self.synthetic_size if self.is_synthetic else len(self.samples)

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, int]:
        if self.is_synthetic:
            # Generate reproducible synthetic 224x224 tensor
            rng = np.random.RandomState(idx)
            img_arr = rng.randint(0, 256, (224, 224, 3), dtype=np.uint8)
            img = Image.fromarray(img_arr)
            label = idx % len(self.classes)
        else:
            path, label = self.samples[idx]
            img = Image.open(path).convert("RGB")

        if self.transform:
            img_t = self.transform(img)
        else:
            img_t = transforms.ToTensor()(img)

        return img_t, label


class EarlyStopping:
    """Early stopping to prevent overfitting when validation loss stops improving."""

    def __init__(self, patience: int = 5, min_delta: float = 1e-4):
        self.patience = patience
        self.min_delta = min_delta
        self.counter = 0
        self.best_loss = float("inf")
        self.early_stop = False

    def __call__(self, val_loss: float) -> bool:
        if val_loss < self.best_loss - self.min_delta:
            self.best_loss = val_loss
            self.counter = 0
        else:
            self.counter += 1
            if self.counter >= self.patience:
                self.early_stop = True
        return self.early_stop


def train_epoch(
    model: nn.Module,
    dataloader: DataLoader,
    criterion: nn.Module,
    optimizer: torch.optim.Optimizer,
    device: torch.device,
) -> Tuple[float, float]:
    """Train model for a single epoch."""
    model.train()
    running_loss = 0.0
    correct = 0
    total = 0

    for inputs, labels in dataloader:
        inputs, labels = inputs.to(device), labels.to(device)
        optimizer.zero_grad()

        outputs = model(inputs)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()

        running_loss += loss.item() * inputs.size(0)
        _, preds = torch.max(outputs, 1)
        correct += torch.sum(preds == labels.data).item()
        total += labels.size(0)

    epoch_loss = running_loss / max(total, 1)
    epoch_acc = correct / max(total, 1)
    return epoch_loss, epoch_acc


def validate(
    model: nn.Module,
    dataloader: DataLoader,
    criterion: nn.Module,
    device: torch.device,
) -> Tuple[float, float]:
    """Evaluate model on validation data."""
    model.eval()
    running_loss = 0.0
    correct = 0
    total = 0

    with torch.no_grad():
        for inputs, labels in dataloader:
            inputs, labels = inputs.to(device), labels.to(device)
            outputs = model(inputs)
            loss = criterion(outputs, labels)

            running_loss += loss.item() * inputs.size(0)
            _, preds = torch.max(outputs, 1)
            correct += torch.sum(preds == labels.data).item()
            total += labels.size(0)

    val_loss = running_loss / max(total, 1)
    val_acc = correct / max(total, 1)
    return val_loss, val_acc


def main():
    parser = argparse.ArgumentParser(description="Train DenseNet-121 on Chest X-ray data")
    parser.add_argument("--data_dir", type=str, default="./data/xray", help="Dataset root directory")
    parser.add_argument("--epochs", type=int, default=10, help="Number of training epochs")
    parser.add_argument("--batch_size", type=int, default=16, help="Batch size")
    parser.add_argument("--lr", type=float, default=1e-4, help="Learning rate")
    parser.add_argument("--patience", type=int, default=3, help="Early stopping patience")
    parser.add_argument("--save_path", type=str, default="./ml/weights/densenet121_xray.pth", help="Checkpoint save path")
    args = parser.parse_args()

    device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
    logger.info("Starting X-ray training on device: %s", device)

    # Transforms
    train_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(10),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])
    val_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])

    train_dataset = ChestXRayDataset(args.data_dir, transform=train_transform, synthetic_size=120)
    val_dataset = ChestXRayDataset(args.data_dir, transform=val_transform, synthetic_size=40)

    train_loader = DataLoader(train_dataset, batch_size=args.batch_size, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=args.batch_size, shuffle=False)

    model = DenseNet121Classifier(num_classes=len(XRAY_CLASSES), pretrained=False).to(device)
    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode="min", factor=0.5, patience=2)

    early_stopping = EarlyStopping(patience=args.patience)
    best_model_wts = copy.deepcopy(model.state_dict())
    best_acc = 0.0

    for epoch in range(args.epochs):
        train_loss, train_acc = train_epoch(model, train_loader, criterion, optimizer, device)
        val_loss, val_acc = validate(model, val_loader, criterion, device)
        scheduler.step(val_loss)

        logger.info(
            "Epoch [%d/%d] - Train Loss: %.4f | Train Acc: %.2f%% | Val Loss: %.4f | Val Acc: %.2f%%",
            epoch + 1, args.epochs, train_loss, train_acc * 100, val_loss, val_acc * 100
        )

        if val_acc > best_acc:
            best_acc = val_acc
            best_model_wts = copy.deepcopy(model.state_dict())
            Path(args.save_path).parent.mkdir(parents=True, exist_ok=True)
            torch.save(best_model_wts, args.save_path)
            logger.info("Saved new best model checkpoint to %s (Val Acc: %.2f%%)", args.save_path, best_acc * 100)

        if early_stopping(val_loss):
            logger.info("Early stopping triggered at epoch %d.", epoch + 1)
            break

    logger.info("Training complete. Peak Validation Accuracy: %.2f%%", best_acc * 100)


if __name__ == "__main__":
    main()
