cmake_minimum_required(VERSION 3.15)
project(xhs_analytics_core)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

find_package(pybind11 REQUIRED)

pybind11_add_module(xhs_analytics_core scoring_core.cpp)

target_compile_options(xhs_analytics_core PRIVATE -O3 -march=native)
