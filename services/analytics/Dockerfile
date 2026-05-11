FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    cmake \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir pybind11

COPY scoring_core.cpp CMakeLists.txt ./
RUN mkdir build && cd build \
    && cmake .. \
        -DPYTHON_EXECUTABLE=$(which python3) \
        -Dpybind11_DIR=$(python3 -m pybind11 --cmakedir) \
    && make -j$(nproc) \
    && cp xhs_analytics_core*.so .. \
    && cd .. && rm -rf build

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
