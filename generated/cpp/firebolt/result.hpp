// Hand-authored — do not regenerate.
// FireboltResult<T> — lightweight result type for Firebolt C++ SDK.
//
// Provides:
//   FireboltError  — JSON-RPC aligned error carrier
//   FireboltResult<T> — success/error discriminated union
//   FireboltResult<void> — specialisation for methods with no return value
//
// Requires C++17 or newer (uses std::optional, if constexpr).

#pragma once
#ifndef FIREBOLT_RESULT_HPP
#define FIREBOLT_RESULT_HPP

#include <cstdint>
#include <optional>
#include <stdexcept>
#include <string>
#include <utility>

static_assert(__cplusplus >= 201703L, "Firebolt SDK requires C++17 or newer");

namespace firebolt {

// ---------------------------------------------------------------------------
// FireboltError
// ---------------------------------------------------------------------------

/**
 * Error codes aligned with Firebolt JSON-RPC error taxonomy:
 *   1 = Unknown method
 *   2 = Method not permitted
 *   3 = Generic failure
 *   4 = System failure
 *   5 = Not implemented
 */
struct FireboltError {
    int32_t     code;
    std::string message;

    FireboltError(int32_t code_, std::string message_)
        : code(code_), message(std::move(message_)) {}
};

// ---------------------------------------------------------------------------
// FireboltResult<T>
// ---------------------------------------------------------------------------

template <typename T>
class FireboltResult {
public:
    // Construct a success result
    static FireboltResult<T> ok(T value) {
        FireboltResult<T> r;
        r.value_ = std::move(value);
        return r;
    }

    // Construct an error result
    static FireboltResult<T> error(FireboltError err) {
        FireboltResult<T> r;
        r.error_ = std::move(err);
        return r;
    }

    bool has_value() const noexcept { return value_.has_value(); }
    bool has_error() const noexcept { return error_.has_value(); }

    const T& value() const {
        if (!value_) throw std::logic_error("FireboltResult: no value");
        return *value_;
    }

    T& value() {
        if (!value_) throw std::logic_error("FireboltResult: no value");
        return *value_;
    }

    const FireboltError& error() const {
        if (!error_) throw std::logic_error("FireboltResult: no error");
        return *error_;
    }

private:
    std::optional<T>            value_;
    std::optional<FireboltError> error_;
};

// ---------------------------------------------------------------------------
// FireboltResult<void> specialisation
// ---------------------------------------------------------------------------

template <>
class FireboltResult<void> {
public:
    static FireboltResult<void> ok() {
        FireboltResult<void> r;
        r.success_ = true;
        return r;
    }

    static FireboltResult<void> error(FireboltError err) {
        FireboltResult<void> r;
        r.success_ = false;
        r.error_ = std::move(err);
        return r;
    }

    bool has_value() const noexcept { return success_; }
    bool has_error() const noexcept { return !success_; }

    const FireboltError& error() const {
        if (success_) throw std::logic_error("FireboltResult<void>: no error");
        return *error_;
    }

private:
    bool                         success_{false};
    std::optional<FireboltError> error_;
};

} // namespace firebolt

#endif // FIREBOLT_RESULT_HPP
