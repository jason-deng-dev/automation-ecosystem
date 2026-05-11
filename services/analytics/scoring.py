import logging
import numpy as np

logger = logging.getLogger(__name__)

try:
    import xhs_analytics_core as _core
    _USE_CPP = True
    logger.info("C++ scoring core loaded")
except ImportError:
    _USE_CPP = False
    logger.warning("xhs_analytics_core not found — using numpy fallback")

METRIC_WEIGHTS = [0.4, 0.35, 0.25]  # views, saves, CTR


def compute_scores(metric_matrix: np.ndarray, weights: list[float] = METRIC_WEIGHTS) -> np.ndarray:
    w = np.array(weights, dtype=np.float64)
    if _USE_CPP:
        return np.array(_core.compute_scores(metric_matrix.astype(np.float64), w))
    return metric_matrix.astype(np.float64) @ w


def normalize_weights(type_scores: dict[str, float]) -> dict[str, float]:
    types = list(type_scores.keys())
    scores = [type_scores[t] for t in types]
    if _USE_CPP:
        normalized = _core.normalize_weights(scores)
    else:
        total = sum(scores)
        normalized = [s / total for s in scores] if total > 0 else [1 / len(scores)] * len(scores)
    return {t: round(normalized[i], 3) for i, t in enumerate(types)}


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Phase 2 semantic dedup — kept for RAG pipeline."""
    if _USE_CPP:
        return _core.cosine_similarity(a.astype(np.float64), b.astype(np.float64))
    norm = np.linalg.norm(a) * np.linalg.norm(b)
    return float(np.dot(a, b) / norm) if norm > 0 else 0.0


def ewma_scores(scores: np.ndarray, lambda_decay: float = 0.94) -> np.ndarray:
    """Weight recent posts more heavily than older ones."""
    if _USE_CPP:
        return np.array(_core.ewma_scores(scores.astype(np.float64), lambda_decay))
    result = np.zeros(len(scores), dtype=np.float64)
    result[0] = scores[0]
    for i in range(1, len(scores)):
        result[i] = lambda_decay * result[i - 1] + (1.0 - lambda_decay) * scores[i]
    return result
