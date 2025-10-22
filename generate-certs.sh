#!/bin/bash

# Generate self-signed certificates for HTTPS localhost development

mkdir -p ./certs

# Generate private key
openssl genrsa -out ./certs/localhost-key.pem 2048

# Generate self-signed certificate (valid for 365 days)
openssl req -new -x509 -key ./certs/localhost-key.pem -out ./certs/localhost-cert.pem -days 365 -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"

echo "✅ SSL certificates generated successfully!"
echo "Files created:"
echo "  - ./certs/localhost-key.pem"
echo "  - ./certs/localhost-cert.pem"
