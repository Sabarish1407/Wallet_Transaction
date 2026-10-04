package com.example.wallet.exception;

public class UnauthorizedTransactionAccessException extends RuntimeException {
    public UnauthorizedTransactionAccessException(String message) {
        super(message);
    }
}
