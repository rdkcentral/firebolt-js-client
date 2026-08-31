#
# If not stated otherwise in this file or this component's LICENSE file the
# following copyright and licenses apply:
#
# Copyright 2026 RDK Management.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# Add cmake directory to CMAKE_MODULE_PATH so custom Find*.cmake files can be found
list( APPEND CMAKE_MODULE_PATH "${CMAKE_CURRENT_SOURCE_DIR}/cmake" )

find_package( WPEWebKit REQUIRED )

add_subdirectory( resources )

add_library( FireboltExtension
        SHARED
        fireboltextension.cpp
        asyncbus.cpp
        websocketclient.cpp
        soupfunctions.cpp

        $<TARGET_OBJECTS:firebolt_resourcebundle>
        )

target_compile_definitions( FireboltExtension
        PRIVATE
        G_LOG_DOMAIN="FireboltExtension"
        G_LOG_USE_STRUCTURED=1
        )

target_include_directories( FireboltExtension
        PRIVATE
        $<TARGET_PROPERTY:WPEWebKit::WPEWebKit,INTERFACE_INCLUDE_DIRECTORIES>
        )

target_link_libraries( FireboltExtension
        PRIVATE
        )

install(
        TARGETS FireboltExtension
        DESTINATION ${CMAKE_INSTALL_LIBDIR}/wpewebkit/extensions
        COMPONENT ${PROJECT_NAME}
        )
