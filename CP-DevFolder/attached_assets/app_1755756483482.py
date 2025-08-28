# app.py
# Batch mode (CLI) + FastAPI server for STGCN inference & inverse optimization
# Runtime files required:
#   - best_model.pth
#   - dataset/scaler_params.json
#
# Batch examples:
#   python app.py --input_path target_kpi.csv
#   python app.py --input_path target_kpi.csv --out_path optimized_params.csv --steps 400 --alpha 1 --beta 2 --gamma 0.1
#   # 컬럼명이 KPI_X,Y,Z가 아니어도 됩니다. 자동으로 숫자형 3개 컬럼을 선택하거나 --kpi_cols로 지정 가능
#   python app.py --input_path kpi.csv --kpi_cols colA,colB,colC
#
# Server mode:
#   python app.py   # (인자가 없으면 FastAPI 서버 기동)

import os
import re
import json
import argparse
from typing import List, Optional, Dict, Any

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import torch.optim as optim
import torch.nn.functional as F
from fastapi import FastAPI
from pydantic import BaseModel

# ----------------------------
# Config (env override possible)
# ----------------------------
#MODEL_PATH  = os.getenv("MODEL_PATH", "best_model.pth")
#SCALER_PATH = os.getenv("SCALER_PATH", "dataset/scaler_params.json")

MODEL_PATH  = "best_model.pth"
SCALER_PATH = "scaler_params.json"

IN_CHANNELS  = int(os.getenv("IN_CHANNELS", "3"))
NUM_NODES    = int(os.getenv("NUM_NODES", "3"))
HID_CHANNELS = int(os.getenv("HID_CHANNELS", "64"))
KERNEL_SIZE  = int(os.getenv("KERNEL_SIZE", "5"))
DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# ----------------------------
# STGCN (keys aligned with our training checkpoint)
# ----------------------------
class TemporalConv(nn.Module):
    def __init__(self, in_channels, out_channels, kernel_size):
        super().__init__()
        self.conv = nn.Conv2d(in_channels, out_channels,
                              kernel_size=(kernel_size, 1),
                              padding=(kernel_size // 2, 0))
    def forward(self, x):  # [B,C,T,V]
        return F.relu(self.conv(x))

class GraphConv(nn.Module):
    def __init__(self):
        super().__init__()
    def forward(self, x, adj):  # x: [B,C,T,V], adj: [V,V]
        adj = adj + torch.eye(adj.size(0), device=adj.device)
        deg = torch.sum(adj, dim=1)
        deg_inv_sqrt = torch.pow(deg, -0.5)
        deg_inv_sqrt[deg_inv_sqrt == float("inf")] = 0.0
        D_inv_sqrt = torch.diag(deg_inv_sqrt)
        norm_adj = D_inv_sqrt @ adj @ D_inv_sqrt
        return torch.einsum("bctv,vw->bctw", x, norm_adj)

class STGCNBlock(nn.Module):
    def __init__(self, in_channels, out_channels, kernel_size):
        super().__init__()
        self.temp1 = TemporalConv(in_channels, out_channels, kernel_size)
        self.graph = GraphConv()
        self.temp2 = TemporalConv(out_channels, out_channels, kernel_size)
    def forward(self, x, adj):
        x = self.temp1(x)
        x = self.graph(x, adj)
        x = self.temp2(x)
        return x

class STGCN(nn.Module):
    def __init__(self, in_channels, out_channels, kernel_size, num_nodes):
        super().__init__()
        self.block = STGCNBlock(in_channels, 64, kernel_size)
        self.final = nn.Conv2d(64, out_channels, kernel_size=(1, 1))
    def forward(self, x, adj):  # [B,C,T,V]
        x = self.block(x, adj)
        return self.final(x)  # [B,out_channels,T,V]

# ----------------------------
# Utilities
# ----------------------------
def to_t(x, device=DEVICE, dtype=torch.float32):
    if isinstance(x, np.ndarray):
        x = torch.from_numpy(x)
    return x.to(device=device, dtype=dtype)

def make_adj(num_nodes=NUM_NODES):
    return torch.ones((num_nodes, num_nodes), dtype=torch.float32, device=DEVICE)

def z_apply(arr: np.ndarray, stat: Dict[str, Any]) -> np.ndarray:
    mean = np.asarray(stat["mean"], dtype=np.float32)
    std  = np.asarray(stat["std"],  dtype=np.float32)
    std[std == 0] = 1.0
    return (arr.astype(np.float32) - mean) / std

def z_inv(arr: np.ndarray, stat: Dict[str, Any]) -> np.ndarray:
    mean = np.asarray(stat["mean"], dtype=np.float32)
    std  = np.asarray(stat["std"],  dtype=np.float32)
    return arr.astype(np.float32) * std + mean

def flat8_to_stgcn_x(p8_t: torch.Tensor) -> torch.Tensor:
    # [B,8,T] -> [B,3,T,3]; A(0:3), B(3:6), C(6:8)+pad
    B, C8, T = p8_t.shape
    assert C8 == 8, f"Expect 8 channels, got {C8}"
    A  = p8_t[:, 0:3, :]
    Bn = p8_t[:, 3:6, :]
    Cn = p8_t[:, 6:8, :]
    pad = torch.zeros((B, 1, T), device=p8_t.device, dtype=p8_t.dtype)
    Cn = torch.cat([Cn, pad], dim=1)
    return torch.stack([A, Bn, Cn], dim=-1)  # [B,3,T,3]

def tv1(x: torch.Tensor) -> torch.Tensor:
    return (x[:, :, 1:] - x[:, :, :-1]).abs().mean()

# ----------------------------
# Load artifacts
# ----------------------------
def load_artifacts(model_path=MODEL_PATH, scaler_path=SCALER_PATH):
    stgcn = STGCN(IN_CHANNELS, HID_CHANNELS, KERNEL_SIZE, NUM_NODES).to(DEVICE)
    kpi_head = nn.Conv2d(HID_CHANNELS, 3, kernel_size=1).to(DEVICE)
    state = torch.load(model_path, map_location=DEVICE)
    if "stgcn" in state:
        stgcn.load_state_dict(state["stgcn"], strict=True)
        if "kpi_head" in state:
            kpi_head.load_state_dict(state["kpi_head"], strict=True)
        else:
            print("[WARN] 'kpi_head' missing; using random init.")
    elif "state_dict" in state:
        sd = state["state_dict"]
        stgcn.load_state_dict({k.replace("module.", ""): v
                               for k, v in sd.items()
                               if k.startswith("stgcn.")}, strict=False)
        if any(k.startswith("kpi_head.") for k in sd):
            kh = {k.replace("module.", "").replace("kpi_head.", ""): v
                  for k, v in sd.items() if k.startswith("kpi_head.")}
            kpi_head.load_state_dict(kh, strict=False)
        print("[INFO] Loaded from generic state_dict")
    else:
        raise RuntimeError("Unsupported checkpoint format")
    stgcn.eval(); kpi_head.eval()
    with open(scaler_path, "r") as f:
        scaler = json.load(f)  # {"x":{mean,std}, "y":{mean,std}}
    return stgcn, kpi_head, scaler

STGCN_MODEL, KPI_HEAD, SCALER = load_artifacts()
ADJ = make_adj()

# ----------------------------
# CSV helpers (auto column selection)
# ----------------------------
def _parse_cols_spec(spec: Optional[str], df: pd.DataFrame, expected: int) -> List[str]:
    """
    spec: "c1,c2,c3" or "0,1,2" (index 기반)
    없으면 숫자형 컬럼에서 우선순위로 자동 선택.
    """
    if spec:
        items = [s.strip() for s in spec.split(",") if s.strip() != ""]
        cols: List[str] = []
        for it in items:
            if re.fullmatch(r"-?\d+", it):  # index
                idx = int(it)
                cols.append(df.columns[idx])
            else:
                # exact or case-insensitive match
                cand = [c for c in df.columns if c == it] or \
                       [c for c in df.columns if c.lower() == it.lower()]
                if not cand:
                    raise ValueError(f"Column '{it}' not found in CSV.")
                cols.append(cand[0])
        if len(cols) != expected:
            raise ValueError(f"Expected {expected} columns, got {len(cols)} from spec.")
        return cols

    # Auto: numeric columns only
    num_cols = [c for c in df.columns if pd.api.types.is_numeric_dtype(df[c])]
    if len(num_cols) < expected:
        raise ValueError(f"Need at least {expected} numeric columns; found {len(num_cols)}.")
    # heuristic: try to prioritize columns that look like KPI names: kpi_x/y/z, x/y/z
    names_lower = [c.lower() for c in num_cols]
    pri_sets = [
        ["kpi_x", "kpi_y", "kpi_z"],
        ["x", "y", "z"]
    ]
    for pri in pri_sets:
        hit = []
        for p in pri:
            if p in names_lower:
                hit.append(num_cols[names_lower.index(p)])
        if len(hit) == expected:
            return hit
    # fallback: just take first N numeric columns
    return num_cols[:expected]

def _read_kpi_from_csv(path: str, kpi_cols: Optional[str]) -> np.ndarray:
    df = pd.read_csv(path)
    df = df.ffill().bfill()
    cols = _parse_cols_spec(kpi_cols, df, expected=3)
    arr = df[cols].values.astype(np.float32)  # [T,3]
    if arr.ndim != 2 or arr.shape[1] != 3:
        raise ValueError(f"KPI array must be [T,3]; got {arr.shape}")
    return arr, cols

def _read_params_from_csv(path: str, param_cols: Optional[str]) -> np.ndarray:
    df = pd.read_csv(path)
    df = df.ffill().bfill()
    cols = _parse_cols_spec(param_cols, df, expected=8)
    arr = df[cols].values.astype(np.float32)  # [T,8]
    if arr.ndim != 2 or arr.shape[1] != 8:
        raise ValueError(f"Params array must be [T,8]; got {arr.shape}")
    return arr, cols

# ----------------------------
# Batch optimizer
# ----------------------------
def run_optimize_from_csv(input_path: str,
                          out_path: str = "optimized_params.csv",
                          kpi_cols: Optional[str] = None,
                          orig_params_path: Optional[str] = None,
                          orig_param_cols: Optional[str] = None,
                          alpha: float = 1.0, beta: float = 2.0, gamma: float = 0.1,
                          steps: int = 800, lr: float = 5e-2,
                          zmin: float = -3.0, zmax: float = 3.0,
                          return_raw: bool = True) -> None:
    """
    Reads target KPI from CSV, optionally baseline params from CSV,
    runs inverse optimization, and writes optimized params CSV.
    """
    tgt, used_kpi_cols = _read_kpi_from_csv(input_path, kpi_cols)  # [T,3]
    B = 1
    T = tgt.shape[0]
    yz = z_apply(tgt.reshape(-1, 3), SCALER["y"]).reshape(B, T, 3)
    target = to_t(np.transpose(yz, (0, 2, 1)))[..., None]  # [1,3,T,1]

    if orig_params_path:
        op, used_p_cols = _read_params_from_csv(orig_params_path, orig_param_cols)  # [T,8]
        xz0 = z_apply(op.reshape(-1, 8), SCALER["x"]).reshape(B, T, 8)
        print(f"[INFO] Using baseline params columns: {used_p_cols}")
    else:
        xz0 = np.zeros((B, T, 8), dtype=np.float32)
        used_p_cols = [f"Param{i+1}" for i in range(8)]

    opt_params = to_t(np.transpose(xz0, (0, 2, 1))).clone()  # [1,8,T]
    opt_params.requires_grad_(True)

    optimizer = optim.Adam([opt_params], lr=lr)
    mse = nn.MSELoss()
    zmin = float(zmin); zmax = float(zmax)

    for step in range(int(steps)):
        optimizer.zero_grad()
        x4 = flat8_to_stgcn_x(opt_params)                 # [1,3,T,3]
        feat = STGCN_MODEL(x4, ADJ).mean(dim=-1, keepdim=True)
        pred = KPI_HEAD(feat)                             # [1,3,T,1]

        loss_fit = mse(pred, target)
        if orig_params_path:
            base = to_t(np.transpose(xz0, (0, 2, 1)))
            loss_dev = mse(opt_params, base)
        else:
            loss_dev = torch.tensor(0.0, device=DEVICE)
        loss_smooth = tv1(opt_params)

        loss = alpha*loss_fit + beta*loss_dev + gamma*loss_smooth
        loss.backward(); optimizer.step()
        with torch.no_grad():
            opt_params.clamp_(zmin, zmax)

        if step % 50 == 0:
            print(f"[{step}/{steps}] total={loss.item():.6f} fit={loss_fit.item():.6f} dev={loss_dev.item():.6f}")

    p_z = opt_params.detach().cpu().numpy()      # [1,8,T]
    p_bt8 = np.transpose(p_z, (0, 2, 1))[0]      # [T,8]
    if return_raw:
        p_raw = z_inv(p_bt8.reshape(-1, 8), SCALER["x"]).reshape(T, 8)  # [T,8]
        out = p_raw
    else:
        out = p_bt8

    # save CSV (use baseline param col names if provided or generic)
    out_cols = used_p_cols
    pd.DataFrame(out, columns=out_cols).to_csv(out_path, index=False)
    print(f"[DONE] Saved optimized params -> {out_path}")
    print(f"[INFO] KPI columns used: {used_kpi_cols}")

# ----------------------------
# FastAPI schemas (unchanged)
# ----------------------------
class PredictKPIRequest(BaseModel):
    params: List[List[float]] | List[List[List[float]]]   # [T,8] or [B,T,8]
    param_indices: Optional[List[int]] = None             # reorder 8 channels
    return_raw: bool = True

class PredictKPIResponse(BaseModel):
    kpi: List[List[List[float]]]                          # [B,T,3]

class OptimizeParamsRequest(BaseModel):
    target_kpi: List[List[float]] | List[List[List[float]]]  # [T,3] or [B,T,3]
    orig_params: Optional[List[List[float]] | List[List[List[float]]]] = None
    alpha: float = 1.0
    beta: float  = 2.0
    gamma: float = 0.1
    steps: int = 800
    lr: float = 5e-2
    kpi_indices: Optional[List[int]] = None
    zmin: float = -3.0
    zmax: float =  3.0
    return_raw: bool = True

class OptimizeParamsResponse(BaseModel):
    params: List[List[List[float]]]   # [B,T,8]

# ----------------------------
# Server helpers
# ----------------------------
def ensure_batched(arr: np.ndarray, last_dim: int) -> np.ndarray:
    if arr.ndim == 2 and arr.shape[1] == last_dim:
        return arr[None, ...]
    if arr.ndim == 3 and arr.shape[2] == last_dim:
        return arr
    raise ValueError(f"Expect [T,{last_dim}] or [B,T,{last_dim}], got {arr.shape}")

def apply_indices(arr: np.ndarray, indices: Optional[List[int]]) -> np.ndarray:
    if indices is None:
        return arr
    idx = np.asarray(indices, dtype=int)
    return arr[..., idx]

# ----------------------------
# FastAPI app
# ----------------------------
app = FastAPI(title="STGCN Inference & Inverse Optimization", version="1.2.0")

@app.post("/predict_kpi", response_model=PredictKPIResponse)
def predict_kpi(req: PredictKPIRequest):
    arr = np.asarray(req.params, dtype=np.float32)          # [T,8] or [B,T,8]
    arr = ensure_batched(arr, last_dim=8)                   # [B,T,8]
    if req.param_indices is not None:
        arr = apply_indices(arr, req.param_indices)
    xz = z_apply(arr.reshape(-1, 8), SCALER["x"]).reshape(arr.shape)  # [B,T,8]
    p8 = to_t(np.transpose(xz, (0, 2, 1)))                  # [B,8,T]
    x4 = flat8_to_stgcn_x(p8)                               # [B,3,T,3]
    with torch.no_grad():
        feat = STGCN_MODEL(x4, ADJ).mean(dim=-1, keepdim=True)
        pred = KPI_HEAD(feat).squeeze(-1)                   # [B,3,T]
    if req.return_raw:
        kpi_bt3 = np.transpose(pred.detach().cpu().numpy(), (0, 2, 1))
        kpi_raw = z_inv(kpi_bt3.reshape(-1, 3), SCALER["y"]).reshape(kpi_bt3.shape)
        return {"kpi": kpi_raw.tolist()}
    else:
        return {"kpi": np.transpose(pred.detach().cpu().numpy(), (0, 2, 1)).tolist()}

@app.post("/optimize_params", response_model=OptimizeParamsResponse)
def optimize_params_api(req: OptimizeParamsRequest):
    tgt = np.asarray(req.target_kpi, dtype=np.float32)
    tgt = ensure_batched(tgt, last_dim=3)
    if req.kpi_indices is not None:
        tgt = apply_indices(tgt, req.kpi_indices)
    yz = z_apply(tgt.reshape(-1, 3), SCALER["y"]).reshape(tgt.shape)
    target = to_t(np.transpose(yz, (0, 2, 1)))[..., None]
    B, T, _ = tgt.shape
    if req.orig_params is not None:
        op = np.asarray(req.orig_params, dtype=np.float32)
        op = ensure_batched(op, last_dim=8)
        xz0 = z_apply(op.reshape(-1, 8), SCALER["x"]).reshape(op.shape)
    else:
        xz0 = np.zeros((B, T, 8), dtype=np.float32)
    opt_params = to_t(np.transpose(xz0, (0, 2, 1))).clone()
    opt_params.requires_grad_(True)
    optimizer = optim.Adam([opt_params], lr=req.lr)
    mse = nn.MSELoss()
    for _ in range(int(req.steps)):
        optimizer.zero_grad()
        x4 = flat8_to_stgcn_x(opt_params)
        feat = STGCN_MODEL(x4, ADJ).mean(dim=-1, keepdim=True)
        pred = KPI_HEAD(feat)
        loss_fit = mse(pred, target)
        if req.orig_params is not None:
            base = to_t(np.transpose(xz0, (0, 2, 1)))
            loss_dev = mse(opt_params, base)
        else:
            loss_dev = torch.tensor(0.0, device=DEVICE)
        loss_smooth = tv1(opt_params)
        loss = req.alpha*loss_fit + req.beta*loss_dev + req.gamma*loss_smooth
        loss.backward(); optimizer.step()
        with torch.no_grad():
            opt_params.clamp_(req.zmin, req.zmax)
    p_z = opt_params.detach().cpu().numpy()
    p_bt8 = np.transpose(p_z, (0, 2, 1))
    if req.return_raw:
        p_raw = z_inv(p_bt8.reshape(-1, 8), SCALER["x"]).reshape(B, T, 8)
        return {"params": p_raw.tolist()}
    else:
        return {"params": p_bt8.tolist()}

# ----------------------------
# CLI
# ----------------------------
def main():
    parser = argparse.ArgumentParser(description="STGCN inverse optimization batch runner / server")
    parser.add_argument("--input_path", type=str, default=None, help="CSV path for target KPI [T,3] (auto-column if names differ)")
    parser.add_argument("--kpi_cols", type=str, default=None, help="Comma-separated KPI column names or indices, e.g. 'KPI_X,KPI_Y,KPI_Z' or '0,1,2'")
    parser.add_argument("--orig_params_path", type=str, default=None, help="Optional CSV path for baseline params [T,8]")
    parser.add_argument("--orig_param_cols", type=str, default=None, help="Comma-separated baseline param column names or indices (8 cols)")

    parser.add_argument("--out_path", type=str, default="optimized_params.csv", help="Output CSV path for optimized params")
    parser.add_argument("--alpha", type=float, default=1.0)
    parser.add_argument("--beta",  type=float, default=2.0)
    parser.add_argument("--gamma", type=float, default=0.1)
    parser.add_argument("--steps", type=int, default=800)
    parser.add_argument("--lr",    type=float, default=5e-2)
    parser.add_argument("--zmin",  type=float, default=-3.0)
    parser.add_argument("--zmax",  type=float, default=3.0)
    parser.add_argument("--raw",   action="store_true", help="Return raw scale (default True). If omitted, still True.")
    parser.add_argument("--serve", action="store_true", help="Force start server (ignore batch even if input_path given)")

    args = parser.parse_args()

    if args.input_path and not args.serve:
        # Batch mode: run optimize and exit
        run_optimize_from_csv(
            input_path=args.input_path,
            out_path=args.out_path,
            kpi_cols=args.kpi_cols,
            orig_params_path=args.orig_params_path,
            orig_param_cols=args.orig_param_cols,
            alpha=args.alpha, beta=args.beta, gamma=args.gamma,
            steps=args.steps, lr=args.lr,
            zmin=args.zmin, zmax=args.zmax,
            return_raw=True  # keep raw by default
        )
    else:
        # Server mode
        import uvicorn
        uvicorn.run("app:app", host="0.0.0.0", port=int(os.getenv("PORT", "8000")), reload=False)

if __name__ == "__main__":
    main()
