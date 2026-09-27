#!/bin/bash
set -x
set -e

##############################
# Coverity build script for webkitExtension
# This script builds the Firebolt webkit extension with Coverity analysis
##############################

GITHUB_WORKSPACE="${PWD}"
echo "Working directory: ${GITHUB_WORKSPACE}"
ls -la ${GITHUB_WORKSPACE}

# Navigate to webkitExtension directory
cd ${GITHUB_WORKSPACE}/webkitExtension

echo "======================================================================================"
echo "Building webkitExtension with Coverity"
echo "======================================================================================"

# Create build directory
mkdir -p build
cd build

# Configure with CMake
echo "Configuring with CMake..."
cmake -G Ninja \
    -S .. \
    -B . \
    -DCMAKE_BUILD_TYPE=Debug \
    -DCMAKE_INSTALL_PREFIX="${GITHUB_WORKSPACE}/install/usr" \
    -DCMAKE_VERBOSE_MAKEFILE=ON

# Build with Coverity (if cov-build is available)
if command -v cov-build >/dev/null 2>&1 && cov-build --help >/dev/null 2>&1; then
    echo "Building with cov-build..."
    cov-build --dir cov-int cmake --build .
else
    echo "cov-build not found or not functional, building without Coverity..."
    cmake --build .
fi

echo "======================================================================================"
echo "Build completed successfully"
echo "======================================================================================"

# If Coverity was used, create the archive
if [ -d "cov-int" ]; then
    echo "Creating Coverity archive..."
    tar czf firebolt-extension-coverity.tgz cov-int
    echo "Coverity archive created: firebolt-extension-coverity.tgz"
fi

echo "======================================================================================"
echo "cov_build.sh completed successfully"
echo "======================================================================================"
