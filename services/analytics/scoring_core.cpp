#include <pybind11/pybind11.h>
#include <pybind11/numpy.h>
#include <pybind11/stl.h>
#include <algorithm>
#include <cmath>
#include <future>
#include <numeric>
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

std::tuple<std::vector<double>, std::vector<double>, std::vector<double>>
monte_carlo_optimize(
    const py::array_t<double>& metric_matrix,
    const py::array_t<int>&    post_type_indices,
    int                        n_types,
    const py::array_t<double>& weights,
    int                        n_simulations = 10000,
    int                        n_threads     = 4
) {
    auto buf     = metric_matrix.request();
    auto idx_buf = post_type_indices.request();
    auto w_buf   = weights.request();
    double* data    = static_cast<double*>(buf.ptr);
    int*    indices = static_cast<int*>(idx_buf.ptr);
    double* w       = static_cast<double*>(w_buf.ptr);
    ssize_t n = buf.shape[0];

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
            std::vector<double> type_scores(n_types, 0.0);
            for (int t = 0; t < n_types; t++) {
                const auto& posts = type_posts[t];
                if (posts.empty()) continue;
                std::uniform_int_distribution<size_t> dist(0, posts.size() - 1);
                double sum = 0.0;
                for (size_t k = 0; k < posts.size(); k++) {
                    ssize_t idx = posts[dist(rng)];
                    sum += w[0] * data[idx * 3 + 0]
                         + w[1] * data[idx * 3 + 1]
                         + w[2] * data[idx * 3 + 2];
                }
                type_scores[t] = sum / static_cast<double>(posts.size());
            }
            double total = 0.0;
            for (double sc : type_scores) total += sc;
            if (total > 0.0)
                for (double& sc : type_scores) sc /= total;
            results.push_back(type_scores);
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

std::vector<double> markowitz_weights(
    const std::vector<double>& means,
    const std::vector<double>& variances
) {
    size_t n = means.size();
    std::vector<double> sharpe(n);
    for (size_t i = 0; i < n; i++) {
        double std_dev = std::sqrt(std::max(variances[i], 1e-10));
        sharpe[i] = means[i] / std_dev;
    }
    double total = 0.0;
    for (double s : sharpe) total += s;
    std::vector<double> out(n);
    for (size_t i = 0; i < n; i++)
        out[i] = (total > 0.0) ? sharpe[i] / total : 1.0 / n;
    return out;
}

PYBIND11_MODULE(xhs_analytics_core, m) {
    m.def("compute_scores",        &compute_scores,        "Weighted composite score per post");
    m.def("normalize_weights",     &normalize_weights,     "Softmax-normalize type scores");
    m.def("cosine_similarity",     &cosine_similarity,     "Cosine similarity between two vectors");
    m.def("monte_carlo_optimize",  &monte_carlo_optimize,
          py::arg("metric_matrix"), py::arg("post_type_indices"), py::arg("n_types"),
          py::arg("weights"), py::arg("n_simulations") = 10000, py::arg("n_threads") = 4,
          "Multithreaded Monte Carlo bootstrap weight optimization");
    m.def("ewma_scores",           &ewma_scores,
          py::arg("scores"), py::arg("lambda_decay") = 0.94,
          "Exponentially weighted moving average over time-ordered scores");
    m.def("markowitz_weights",     &markowitz_weights,
          "Mean-variance optimized weights (Sharpe-style)");
}
