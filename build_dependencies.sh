#!/bin/bash
set -x
set -e

##############################
# Build dependencies for webkitExtension
# This script installs the necessary dependencies to build the Firebolt webkit extension
# including WPEWebKit, glib, and soup
##############################

GITHUB_WORKSPACE="${PWD}"
echo "Working directory: ${GITHUB_WORKSPACE}"
ls -la ${GITHUB_WORKSPACE}

# Install Dependencies and packages
apt update
apt install -y \
    build-essential \
    cmake \
    ninja-build \
    pkg-config \
    libwpewebkit-1.0-dev \
    libglib2.0-dev \
    libsoup-3.0-dev \
    libgirepository1.0-dev

echo "======================================================================================"
echo "Dependencies installed successfully"
echo "======================================================================================"

# Verify WPEWebKit installation
echo "Checking WPEWebKit installation..."
pkg-config --modversion wpewebkit-1.0 || echo "WPEWebKit not found via pkg-config"
pkg-config --cflags wpewebkit-1.0 || echo "WPEWebKit cflags not found"

echo "======================================================================================"
echo "build_dependencies.sh completed successfully"
echo "======================================================================================"
