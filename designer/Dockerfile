FROM ubuntu:22.04 as builder

WORKDIR /app

# Copy package files and dependencies and workspace
COPY ./designer /app/designer
COPY ./scripts /app/scripts
COPY ./.moon /app/.moon

# Install dependencies
RUN apt update && \
    apt install -y wget curl git unzip gzip xz-utils build-essential && \
    apt clean && \
    rm -rf /var/lib/apt/lists/*

# Install proto and moon
RUN /app/scripts/install_proto.sh

# Save /root/.proto/bin/proto to PATH
ENV PATH="/root/.proto/bin:$PATH"
RUN /app/scripts/install_moon.sh

# Install bun using proto
RUN proto install bun

# Install dependencies and build the application
RUN cd /app && moon designer:build

# Production stage with nginx
FROM nginx:alpine

# Copy the built files from the build stage
COPY --from=builder /app/designer/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]