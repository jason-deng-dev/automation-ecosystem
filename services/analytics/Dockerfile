FROM python:3.12-slim

WORKDIR /app

# Build deps for C++ extension
RUN apt-get update && apt-get install -y --no-install-recommends \
    cmake \
    g++ \
    git \
    pybind11-dev \
    python3-pybind11 \
    && rm -rf /var/lib/apt/lists/*

# Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# C++ scoring core — compile at image build time
COPY scoring_core.cpp CMakeLists.txt ./
RUN mkdir build && cd build \
    && cmake .. -DPYTHON_EXECUTABLE=$(which python3) \
    && make -j$(nproc) \
    && cp xhs_analytics_core*.so .. \
    && cd .. && rm -rf build

# App source
COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
