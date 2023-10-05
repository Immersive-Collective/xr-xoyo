#!/bin/bash

# Name of the temporary folder where the certificates will be saved
TMP_CERT_DIR="/tmp/browser-sync-certs"

# For systems with ifconfig (macOS, some Linux distributions)
INTERNAL_IP=$(ifconfig | grep "inet " | grep -v 0.0.0.0:3131 | awk '{print $2}' | head -n 1)

# For systems with ip a (some newer Linux distributions)
# INTERNAL_IP=$(ip a | grep "inet " | grep -v "127.0.0.1" | awk '{print $2}' | cut -d/ -f1 | head -n 1)


# Ensure mkcert is installed
if ! command -v mkcert &> /dev/null; then
    echo "mkcert is not installed. Please install it and then run this script."
    exit 1
fi

# Ensure browser-sync is installed
if ! command -v browser-sync &> /dev/null; then
    echo "browser-sync is not installed. Please install it and then run this script."
    exit 1
fi

# Check if we got the internal IP
if [ -z "$INTERNAL_IP" ]; then
    echo "Could not fetch internal IP address."
    exit 1
fi

# Create a temporary directory to store the certs
mkdir -p "$TMP_CERT_DIR"

# Generate certificates for the internal IP
mkcert -key-file="$TMP_CERT_DIR/$INTERNAL_IP-key.pem" -cert-file="$TMP_CERT_DIR/$INTERNAL_IP.pem" "$INTERNAL_IP"

# Start browser-sync with the generated certificates
# browser-sync start --https --key "$TMP_CERT_DIR/$INTERNAL_IP-key.pem" --cert "$TMP_CERT_DIR/$INTERNAL_IP.pem" --proxy "0.0.0.0:3131" --files "*.*"

# Start browser-sync with the generated certificates
browser-sync start --https --key "$TMP_CERT_DIR/$INTERNAL_IP-key.pem" --cert "$TMP_CERT_DIR/$INTERNAL_IP.pem" --proxy "http://0.0.0.0:3131" --files "*.*"


# Clean up (optional: remove the temporary directory after browser-sync terminates)
# rm -r "$TMP_CERT_DIR"
