#include <pybind11/pybind11.h>
#include <pybind11/numpy.h>
#include <pybind11/stl.h>
#include <algorithm>
#include <cmath>
#include <future>
#include <random>
#include <tuple>
#include <vector>

namespace py = pybind11;

std::vector<double> compute_scores(
    const py::array_t<double>& metric_matrix,
    const py::array_t<double>& weights
) {
    auto buf = metric_matrix.request();
    auto w   = weights.request();
    double* data   = static_cast<double*>(buf.ptr);
    double* w_data = static_cast<double*>(w.ptr);
    ssize_t n = buf.shape[0];

    std::vector<double> scores(n);
    for (ssize_t i = 0; i < n; i++) {
        scores[i] = w_data[0] * data[i * 3 + 0]
                  + w_data[1] * data[i * 3 + 1]
                  + w_data[2] * data[i * 3 + 2];
    }
    return scores;
}

std::vector<double> normalize_weights(const std::vector<double>& type_scores) {
    double total = 0.0;
    for (double s : type_scores) total += s;
    std::vector<double> out(type_scores.size());
    for (size_t i = 0; i < type_scores.size(); i++) {
        out[i] = (total > 0.0) ? type_scores[i] / total : 1.0 / type_scores.size();
    }
    return out;
}

double cosine_similarity(
    const py::array_t<double>& a,
    const py::array_t<double>& b
) {
    auto ba = a.request();
    auto bb = b.request();
    double* da = static_cast<double*>(ba.ptr);
    double* db = static_cast<double*>(bb.ptr);
    ssize_t n = ba.shape[0];

    double dot = 0.0, norm_a = 0.0, norm_b = 0.0;
    for (ssize_t i = 0; i < n; i++) {
        dot    += da[i] * db[i];
        norm_a += da[i] * da[i];
        norm_b += db[i] * db[i];
    }
    return (norm_a > 0.0 && norm_b > 0.0) ? dot / (std::sqrt(norm_a) * std::sqrt(norm_b)) : 0.0;
}

std::vector<double> ewma_scores(
    const py::array_t<double>& scores,
    double lambda_decay = 0.94
) {
    auto buf = scores.request();
    double* data = static_cast<double*>(buf.ptr);
    ssize_t n = buf.shape[0];

    std::vector<double> out(n);
    out[0] = data[0];
    for (ssize_t i = 1; i < n; i++)
        out[i] = lambda_decay * out[i - 1] + (1.0 - lambda_decay) * data[i];
    return out;
}

// Bootstrap Monte Carlo: resample posts per type N times, average the normalized
// weight vectors → stable optimal weights that account for sample variance.
// Returns {means, ci_low, ci_high} — all length n_types.
std::tuple<std::vector<double>, std::vector<double>, std::vector<double>>
monte_carlo_optimize(
    const py::array_t<double>& post_scores,   // [n_posts] EWMA-smoothed composite scores
    const py::array_t<int>&    type_indices,  // [n_posts] integer type index per post
    int                        n_types,
    int                        n_simulations = 10000,
    int                        n_threads     = 4
) {
    auto sc_buf  = post_scores.request();
    auto idx_buf = type_indices.request();
    double* scores  = static_cast<double*>(sc_buf.ptr);
    int*    indices = static_cast<int*>(idx_buf.ptr);
    ssize_t n = sc_buf.shape[0];

    std::vector<std::vector<ssize_t>> type_posts(n_types);
    for (ssize_t i = 0; i < n; i++) {
        if (indices[i] >= 0 && indices[i] < n_types)
            type_posts[indices[i]].push_back(i);
    }

    int sims_per_thread = n_simulations / n_threads;

    auto run_batch = [&](int seed, int count) -> std::vector<std::vector<double>> {
        std::mt19937 rng(seed);
        std::vector<std::vector<double>> results;
        results.reserve(count);

        for (int s = 0; s < count; s++) {
            std::vector<double> type_means(n_types, 0.0);
            for (int t = 0; t < n_types; t++) {
                const auto& posts = type_posts[t];
                if (posts.empty()) continue;
                std::uniform_int_distribution<size_t> dist(0, posts.size() - 1);
                double sum = 0.0;
                for (size_t k = 0; k < posts.size(); k++)
                    sum += scores[posts[dist(rng)]];
                type_means[t] = sum / static_cast<double>(posts.size());
            }
            double total = 0.0;
            for (double m : type_means) total += m;
            if (total > 0.0)
                for (double& m : type_means) m /= total;
            results.push_back(type_means);
        }
        return results;
    };

    std::vector<std::future<std::vector<std::vector<double>>>> futures;
    for (int t = 0; t < n_threads; t++)
        futures.push_back(std::async(std::launch::async, run_batch, t * 7919, sims_per_thread));

    std::vector<std::vector<double>> all;
    for (auto& f : futures) {
        auto batch = f.get();
        all.insert(all.end(), batch.begin(), batch.end());
    }

    std::vector<double> means(n_types, 0.0), ci_low(n_types), ci_high(n_types);
    for (int t = 0; t < n_types; t++) {
        std::vector<double> vals;
        vals.reserve(all.size());
        for (const auto& row : all) vals.push_back(row[t]);
        std::sort(vals.begin(), vals.end());
        for (double v : vals) means[t] += v;
        means[t] /= static_cast<double>(vals.size());
        ci_low[t]  = vals[static_cast<size_t>(0.05 * vals.size())];
        ci_high[t] = vals[static_cast<size_t>(0.95 * vals.size())];
    }
    return {means, ci_low, ci_high};
}

PYBIND11_MODULE(xhs_analytics_core, m) {
    m.def("compute_scores",       &compute_scores,       "Weighted composite score per post");
    m.def("normalize_weights",    &normalize_weights,    "Normalize type scores to weights summing to 1");
    m.def("cosine_similarity",    &cosine_similarity,    "Cosine similarity between two vectors");
    m.def("ewma_scores",          &ewma_scores,
          py::arg("scores"), py::arg("lambda_decay") = 0.94,
          "Exponentially weighted moving average over time-ordered scores");
    m.def("monte_carlo_optimize", &monte_carlo_optimize,
          py::arg("post_scores"), py::arg("type_indices"), py::arg("n_types"),
          py::arg("n_simulations") = 10000, py::arg("n_threads") = 4,
          "Bootstrap Monte Carlo weight optimization over EWMA-smoothed post scores");
}
