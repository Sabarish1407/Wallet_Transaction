package com.example.wallet.exception;

public class PasswordResetRequiredException extends RuntimeException {
    public PasswordResetRequiredException(String message) {
        super(message);
    }
}
