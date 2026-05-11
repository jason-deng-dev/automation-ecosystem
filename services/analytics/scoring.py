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
    if _USE_CPP:
        return _core.cosine_similarity(a.astype(np.float64), b.astype(np.float64))
    norm = np.linalg.norm(a) * np.linalg.norm(b)
    return float(np.dot(a, b) / norm) if norm > 0 else 0.0


def monte_carlo_optimize(
    metric_matrix: np.ndarray,
    post_type_indices: np.ndarray,
    n_types: int,
    weights: list[float] = METRIC_WEIGHTS,
    n_simulations: int = 10000,
) -> dict:
    w = np.array(weights, dtype=np.float64)
    if _USE_CPP:
        means, ci_low, ci_high = _core.monte_carlo_optimize(
            metric_matrix.astype(np.float64),
            post_type_indices.astype(np.int32),
            n_types,
            w,
            n_simulations,
        )
        return {"means": list(means), "ci_low": list(ci_low), "ci_high": list(ci_high)}

    # numpy fallback — single-threaded
    type_posts = [np.where(post_type_indices == t)[0] for t in range(n_types)]
    sim_weights = np.zeros((n_simulations, n_types))
    rng = np.random.default_rng()

    for sim in range(n_simulations):
        type_scores = np.zeros(n_types)
        for t, posts in enumerate(type_posts):
            if len(posts) == 0:
                continue
            sample = rng.choice(posts, size=len(posts), replace=True)
            type_scores[t] = (metric_matrix[sample].astype(np.float64) @ w).mean()
        total = type_scores.sum()
        if total > 0:
            sim_weights[sim] = type_scores / total

    return {
        "means": sim_weights.mean(axis=0).tolist(),
        "ci_low": np.percentile(sim_weights, 5, axis=0).tolist(),
        "ci_high": np.percentile(sim_weights, 95, axis=0).tolist(),
    }


def ewma_scores(scores: np.ndarray, lambda_decay: float = 0.94) -> np.ndarray:
    if _USE_CPP:
        return np.array(_core.ewma_scores(scores.astype(np.float64), lambda_decay))
    result = np.zeros(len(scores), dtype=np.float64)
    result[0] = scores[0]
    for i in range(1, len(scores)):
        result[i] = lambda_decay * result[i - 1] + (1.0 - lambda_decay) * scores[i]
    return result


def markowitz_weights(means: list[float], variances: list[float]) -> list[float]:
    if _USE_CPP:
        return list(_core.markowitz_weights(means, variances))
    stds = [np.sqrt(max(v, 1e-10)) for v in variances]
    sharpe = [m / s for m, s in zip(means, stds)]
    total = sum(sharpe)
    return [s / total for s in sharpe] if total > 0 else [1 / len(means)] * len(means)


def fit_ols_prior(
    scores: np.ndarray,
    post_type_onehot: np.ndarray,
    months: np.ndarray,
    recency_days: np.ndarray,
) -> np.ndarray:
    """OLS regression: predict composite score from type, month, recency. Returns coefficients."""
    X = np.column_stack([post_type_onehot, months.reshape(-1, 1), recency_days.reshape(-1, 1)])
    X = np.hstack([np.ones((len(X), 1)), X])  # intercept column
    coeffs, _, _, _ = np.linalg.lstsq(X, scores.astype(np.float64), rcond=None)
    return coeffs
