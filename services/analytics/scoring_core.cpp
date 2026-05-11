#include <pybind11/pybind11.h>
#include <pybind11/numpy.h>
#include <pybind11/stl.h>
#include <cmath>
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

PYBIND11_MODULE(xhs_analytics_core, m) {
    m.def("compute_scores",    &compute_scores,    "Weighted composite score per post");
    m.def("normalize_weights", &normalize_weights, "Normalize type scores to weights summing to 1");
    m.def("cosine_similarity", &cosine_similarity, "Cosine similarity between two vectors");
    m.def("ewma_scores",       &ewma_scores,
          py::arg("scores"), py::arg("lambda_decay") = 0.94,
          "Exponentially weighted moving average over time-ordered scores");
}
