package com.example.wallet.exception;

public class InactiveWalletException extends RuntimeException {
    public InactiveWalletException(String message) {
        super(message);
    }
}
